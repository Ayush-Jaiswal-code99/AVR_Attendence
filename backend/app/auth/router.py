from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, Student, Admin
from backend.app.schemas import (
    LoginRequest, TokenResponse, RefreshTokenRequest, ChangePasswordRequest,
    StudentResponse
)
from backend.app.auth.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, decode_token
)
from backend.app.dependencies import get_current_user, get_client_ip
from backend.app.services.face_service import face_service
from backend.app.services.audit_service import log_audit_action

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user (Student or Admin).
    Students can login with College Email, Enrollment Number, or Roll Number.
    Admins login with Admin Email.
    """
    identifier = payload.username_or_email.strip().lower()

    # Find user by email directly
    user = db.query(User).filter(User.email.ilike(identifier)).first()

    # If not found, check if identifier is Student enrollment_no or roll_no
    if not user:
        student = (
            db.query(Student)
            .filter(
                (Student.enrollment_no.ilike(identifier)) |
                (Student.roll_no.ilike(identifier)) |
                (Student.college_email.ilike(identifier))
            )
            .first()
        )
        if student:
            user = student.user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: username/email not found"
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: password incorrect"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact the administrator."
        )

    student_id = None
    full_name = "User"
    enrollment_status = "APPROVED"
    photo_url = None

    if user.role == "STUDENT":
        st = user.student_profile
        if st:
            student_id = st.id
            full_name = st.full_name
            enrollment_status = st.enrollment_status
            photo_url = st.photo_url
            if st.enrollment_status == "PENDING":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your enrollment is pending approval by the college administration."
                )
            elif st.enrollment_status == "REJECTED":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your enrollment was rejected. Please contact college administration."
                )
    elif user.role == "ADMIN":
        adm = user.admin_profile
        if adm:
            full_name = adm.full_name

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "student_id": student_id
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": full_name,
            "student_id": student_id,
            "photo_url": photo_url,
            "enrollment_status": enrollment_status
        }
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid refresh token type")
        user_id = data.get("sub")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    student_id = user.student_profile.id if user.student_profile else None
    full_name = user.student_profile.full_name if user.student_profile else (
        user.admin_profile.full_name if user.admin_profile else "User"
    )

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "student_id": student_id
    }

    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": full_name,
            "student_id": student_id
        }
    )

@router.post("/register-student")
async def register_student(
    full_name: str = Form(...),
    gender: str = Form("Other"),
    date_of_birth: str = Form(None),
    college_email: str = Form(...),
    personal_email: str = Form(None),
    phone_number: str = Form(...),
    enrollment_no: str = Form(...),
    roll_no: str = Form(...),
    department: str = Form(...),
    branch: str = Form(...),
    year: int = Form(1),
    semester: int = Form(1),
    section: str = Form("A"),
    password: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Self-service enrollment wizard API.
    Creates user and student record, processes photo upload,
    extracts facial embedding, and submits enrollment for Admin approval.
    """
    # Normalize inputs
    college_email = college_email.strip().lower()
    enrollment_no = enrollment_no.strip().upper()
    roll_no = roll_no.strip().upper()

    # Check for existing email/enrollment
    if db.query(User).filter(User.email == college_email).first():
        raise HTTPException(status_code=409, detail="A user with this college email already exists.")
    if db.query(Student).filter(Student.enrollment_no == enrollment_no).first():
        raise HTTPException(status_code=409, detail="A student with this enrollment number already exists.")
    if db.query(Student).filter(Student.roll_no == roll_no).first():
        raise HTTPException(status_code=409, detail="A student with this roll number already exists.")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    # Read photo file
    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Photo file cannot be empty.")

    # Create User
    new_user = User(
        email=college_email,
        hashed_password=hash_password(password),
        role="STUDENT",
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create Student
    new_student = Student(
        user_id=new_user.id,
        enrollment_no=enrollment_no,
        roll_no=roll_no,
        full_name=full_name.strip(),
        gender=gender,
        date_of_birth=date_of_birth,
        college_email=college_email,
        personal_email=personal_email.strip().lower() if personal_email else None,
        phone_number=phone_number.strip(),
        department=department.strip().upper(),
        branch=branch.strip().upper(),
        year=year,
        semester=semester,
        section=section.strip().upper(),
        enrollment_status="PENDING",
        enrolled_at=datetime.utcnow()
    )
    db.add(new_student)
    db.flush()

    # Face Enrollment Pipeline
    try:
        photo_url, embedding = face_service.register_student_face(
            db=db,
            student_id=new_student.id,
            image_bytes=photo_bytes,
            filename=photo.filename or "photo.jpg"
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Face registration failed: {str(e)}")

    db.commit()
    db.refresh(new_student)

    # Log enrollment
    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=None,
        action="STUDENT_SELF_ENROLLMENT",
        entity_type="Student",
        entity_id=str(new_student.id),
        new_values={"email": college_email, "enrollment_no": enrollment_no, "name": full_name},
        ip_address=ip
    )

    return {
        "success": True,
        "message": "Enrollment request submitted successfully! Your account is currently pending admin approval.",
        "student": StudentResponse.from_orm(new_student)
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    profile_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }
    if current_user.role == "STUDENT" and current_user.student_profile:
        profile_data["student"] = StudentResponse.from_orm(current_user.student_profile)
    elif current_user.role == "ADMIN" and current_user.admin_profile:
        profile_data["admin"] = {
            "full_name": current_user.admin_profile.full_name,
            "department": current_user.admin_profile.department,
            "phone": current_user.admin_profile.phone
        }
    return profile_data

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows authenticated user to change their account password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"success": True, "message": "Password updated successfully."}
