from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from backend.app.database import get_db
from backend.app.models import (
    User, Student, FaceProfile, AttendanceRecord, AttendanceSession, AuditLog
)
from backend.app.schemas import (
    AdminDashboardStats, StudentResponse, AdminStudentUpdateRequest,
    AdminStudentCreate, AuditLogResponse
)
from backend.app.dependencies import require_admin, get_client_ip
from backend.app.auth.security import hash_password
from backend.app.services.attendance_service import AttendanceService
from backend.app.services.face_service import face_service
from backend.app.services.audit_service import log_audit_action

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/dashboard", response_model=AdminDashboardStats)
def get_admin_dashboard(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns comprehensive analytics for the Admin Dashboard."""
    return AttendanceService.calculate_admin_dashboard_stats(db)

@router.get("/students")
def list_students(
    search: Optional[str] = None,
    department: Optional[str] = None,
    branch: Optional[str] = None,
    semester: Optional[int] = None,
    section: Optional[str] = None,
    enrollment_status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = "id",
    sort_order: str = "desc",
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Search, filter, sort and paginate all students.
    Also calculates individual attendance percentage.
    """
    query = db.query(Student)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(search_fmt),
                Student.enrollment_no.ilike(search_fmt),
                Student.roll_no.ilike(search_fmt),
                Student.college_email.ilike(search_fmt)
            )
        )

    if department:
        query = query.filter(Student.department == department.upper())
    if branch:
        query = query.filter(Student.branch == branch.upper())
    if semester:
        query = query.filter(Student.semester == semester)
    if section:
        query = query.filter(Student.section == section.upper())
    if enrollment_status:
        query = query.filter(Student.enrollment_status == enrollment_status.upper())

    total_count = query.count()

    # Sorting
    sort_column = getattr(Student, sort_by, Student.id)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    offset = (page - 1) * limit
    students = query.offset(offset).limit(limit).all()

    items = []
    for s in students:
        # Calculate attendance %
        conducted = (
            db.query(func.count(AttendanceSession.id))
            .filter(
                AttendanceSession.department == s.department,
                AttendanceSession.semester == s.semester,
                AttendanceSession.section == s.section,
                AttendanceSession.status.in_(["ACTIVE", "COMPLETED"])
            )
            .scalar() or 0
        )
        present = (
            db.query(func.count(AttendanceRecord.id))
            .filter(
                AttendanceRecord.student_id == s.id,
                AttendanceRecord.status.in_(["PRESENT", "LATE", "EXCUSED"])
            )
            .scalar() or 0
        )
        pct = round((present / conducted * 100), 1) if conducted > 0 else 100.0

        item = StudentResponse.from_orm(s).dict()
        item["attendance_percentage"] = pct
        item["total_conducted"] = conducted
        item["total_present"] = present
        item["has_face_profile"] = bool(s.face_profile)
        items.append(item)

    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        "students": items
    }

@router.post("/students")
def create_student_manually(
    payload: AdminStudentCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin manually adds a new student."""
    email = payload.college_email.strip().lower()
    enrollment_no = payload.enrollment_no.strip().upper()
    roll_no = payload.roll_no.strip().upper()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    if db.query(Student).filter(Student.enrollment_no == enrollment_no).first():
        raise HTTPException(status_code=409, detail="A student with this enrollment number already exists")
    if db.query(Student).filter(Student.roll_no == roll_no).first():
        raise HTTPException(status_code=409, detail="A student with this roll number already exists")

    new_user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        role="STUDENT",
        is_active=True
    )
    db.add(new_user)
    db.flush()

    new_student = Student(
        user_id=new_user.id,
        enrollment_no=enrollment_no,
        roll_no=roll_no,
        full_name=payload.full_name.strip(),
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        college_email=email,
        personal_email=str(payload.personal_email).lower() if payload.personal_email else None,
        phone_number=payload.phone_number.strip(),
        department=payload.department.strip().upper(),
        branch=payload.branch.strip().upper(),
        year=payload.year,
        semester=payload.semester,
        section=payload.section.strip().upper(),
        enrollment_status=payload.enrollment_status,
        enrolled_at=datetime.utcnow(),
        approved_at=datetime.utcnow() if payload.enrollment_status == "APPROVED" else None,
        approved_by_id=admin.id if payload.enrollment_status == "APPROVED" else None
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_CREATE_STUDENT",
        entity_type="Student",
        entity_id=str(new_student.id),
        new_values={"name": new_student.full_name, "email": email, "enrollment_no": enrollment_no},
        ip_address=ip
    )

    return {"success": True, "student": StudentResponse.from_orm(new_student)}

@router.get("/students/{student_id}")
def get_student_details(
    student_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Fetch complete details of a specific student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    stats = AttendanceService.calculate_student_summary(db=db, student_id=student.id)
    return {
        "student": StudentResponse.from_orm(student),
        "summary": stats
    }

@router.put("/students/{student_id}")
def update_student(
    student_id: int,
    payload: AdminStudentUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin edits student academic and profile information."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    old_vals = {
        "full_name": student.full_name,
        "department": student.department,
        "branch": student.branch,
        "semester": student.semester,
        "section": student.section,
        "enrollment_status": student.enrollment_status
    }

    if payload.full_name is not None:
        student.full_name = payload.full_name.strip()
    if payload.gender is not None:
        student.gender = payload.gender
    if payload.date_of_birth is not None:
        student.date_of_birth = payload.date_of_birth
    if payload.personal_email is not None:
        student.personal_email = str(payload.personal_email).lower()
    if payload.phone_number is not None:
        student.phone_number = payload.phone_number.strip()
    if payload.department is not None:
        student.department = payload.department.strip().upper()
    if payload.branch is not None:
        student.branch = payload.branch.strip().upper()
    if payload.year is not None:
        student.year = payload.year
    if payload.semester is not None:
        student.semester = payload.semester
    if payload.section is not None:
        student.section = payload.section.strip().upper()
    if payload.enrollment_status is not None:
        student.enrollment_status = payload.enrollment_status.strip().upper()

    db.commit()
    db.refresh(student)

    # Re-sync face encodings cache if status changed
    face_service.initialize_from_db(db)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_UPDATE_STUDENT",
        entity_type="Student",
        entity_id=str(student.id),
        old_values=old_vals,
        new_values=payload.dict(exclude_unset=True),
        ip_address=ip
    )

    return {"success": True, "student": StudentResponse.from_orm(student)}

@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin deletes a student and their associated user account."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user
    old_info = {"id": student.id, "name": student.full_name, "email": student.college_email}

    db.delete(user)  # Cascades to student, face profile, and attendance records
    db.commit()

    face_service.initialize_from_db(db)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_DELETE_STUDENT",
        entity_type="Student",
        entity_id=str(student_id),
        old_values=old_info,
        ip_address=ip
    )

    return {"success": True, "message": f"Student #{student_id} permanently deleted."}

@router.post("/students/{student_id}/approve")
def approve_enrollment(
    student_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin approves pending enrollment."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.enrollment_status = "APPROVED"
    student.approved_at = datetime.utcnow()
    student.approved_by_id = admin.id
    db.commit()
    db.refresh(student)

    # Re-sync face recognition cache so model recognizes approved student immediately
    face_service.initialize_from_db(db)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_APPROVE_ENROLLMENT",
        entity_type="Student",
        entity_id=str(student.id),
        new_values={"status": "APPROVED", "approved_by": admin.email},
        ip_address=ip
    )

    return {"success": True, "message": f"Student '{student.full_name}' enrollment approved.", "student": StudentResponse.from_orm(student)}

@router.post("/students/{student_id}/reject")
def reject_enrollment(
    student_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin rejects pending enrollment."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.enrollment_status = "REJECTED"
    db.commit()

    face_service.initialize_from_db(db)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_REJECT_ENROLLMENT",
        entity_type="Student",
        entity_id=str(student.id),
        new_values={"status": "REJECTED"},
        ip_address=ip
    )

    return {"success": True, "message": f"Enrollment for '{student.full_name}' rejected."}

@router.post("/students/{student_id}/replace-photo")
async def replace_student_photo(
    student_id: int,
    photo: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin uploads/replaces the face photograph for a student."""
    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Photo file cannot be empty")

    relative_url, _ = face_service.register_student_face(
        db=db,
        student_id=student_id,
        image_bytes=photo_bytes,
        filename=photo.filename or "admin_updated_face.jpg"
    )

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_REPLACE_PHOTO",
        entity_type="Student",
        entity_id=str(student_id),
        new_values={"photo_url": relative_url},
        ip_address=ip
    )

    return {"success": True, "photo_url": relative_url, "message": "Face photo updated and re-trained."}

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """View administrative audit history."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
