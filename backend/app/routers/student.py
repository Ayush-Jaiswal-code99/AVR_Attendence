from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, Student, AttendanceRecord, AttendanceSession
from backend.app.schemas import (
    StudentResponse, StudentUpdateMeRequest, StudentDashboardStats,
    AttendanceRecordResponse
)
from backend.app.dependencies import require_student
from backend.app.services.attendance_service import AttendanceService
from backend.app.services.face_service import face_service

router = APIRouter(prefix="/students", tags=["Student Portal"])

@router.get("/me", response_model=StudentResponse)
def get_my_profile(auth_data: tuple[User, Student] = Depends(require_student)):
    """Returns the authenticated student's profile."""
    _, student = auth_data
    return student

@router.put("/me", response_model=StudentResponse)
def update_my_profile(
    payload: StudentUpdateMeRequest,
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Allows a student to update their personal contact information.
    Academic fields (Enrollment No, Roll No, Branch, Semester) cannot be modified by students.
    """
    _, student = auth_data
    if payload.personal_email is not None:
        student.personal_email = str(payload.personal_email).lower()
    if payload.phone_number is not None:
        student.phone_number = payload.phone_number.strip()

    db.commit()
    db.refresh(student)
    return student

@router.post("/me/photo")
async def update_my_photo(
    photo: UploadFile = File(...),
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """Allows student to update their enrolled photo and AI face embedding."""
    _, student = auth_data
    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Photo file cannot be empty")

    relative_url, _ = face_service.register_student_face(
        db=db,
        student_id=student.id,
        image_bytes=photo_bytes,
        filename=photo.filename or "updated_face.jpg"
    )

    return {
        "success": True,
        "message": "Profile photograph and facial recognition embedding updated successfully.",
        "photo_url": relative_url
    }

@router.get("/me/dashboard", response_model=StudentDashboardStats)
def get_my_dashboard(
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Calculates live dashboard statistics, overall attendance percentage,
    subject-wise breakdown, low attendance warnings, and recent attendance records.
    """
    _, student = auth_data
    return AttendanceService.calculate_student_summary(db=db, student_id=student.id)

@router.get("/me/attendance", response_model=List[AttendanceRecordResponse])
def get_my_attendance_history(
    subject_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status_filter: Optional[str] = None,
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Protected attendance history endpoint for the authenticated student.
    Strictly isolated to own records to prevent IDOR attacks.
    """
    _, student = auth_data

    query = (
        db.query(AttendanceRecord)
        .join(AttendanceSession)
        .filter(AttendanceRecord.student_id == student.id)
    )

    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)
    if date_from:
        query = query.filter(AttendanceSession.date >= date_from)
    if date_to:
        query = query.filter(AttendanceSession.date <= date_to)
    if status_filter:
        query = query.filter(AttendanceRecord.status == status_filter.upper())

    records = query.order_by(AttendanceRecord.marked_at.desc()).all()

    dtos = []
    for r in records:
        dto = AttendanceRecordResponse.from_orm(r)
        dto.student_name = student.full_name
        dto.student_roll_no = student.roll_no
        dto.student_enrollment_no = student.enrollment_no
        if r.session:
            dto.subject_code = r.session.subject.code if r.session.subject else ""
            dto.subject_name = r.session.subject.name if r.session.subject else ""
            dto.session_date = r.session.date
            dto.session_time = f"{r.session.start_time} - {r.session.end_time}"
        dtos.append(dto)

    return dtos
