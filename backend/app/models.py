from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # "ADMIN" or "STUDENT"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student_profile = relationship(
        "Student",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="Student.user_id"
    )
    admin_profile = relationship("Admin", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    enrollment_no = Column(String(100), unique=True, index=True, nullable=False)
    roll_no = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    gender = Column(String(20), nullable=True)
    date_of_birth = Column(String(30), nullable=True)
    college_email = Column(String(255), unique=True, index=True, nullable=False)
    personal_email = Column(String(255), nullable=True)
    phone_number = Column(String(30), nullable=False)
    department = Column(String(100), nullable=False)
    branch = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False, default=1)
    semester = Column(Integer, nullable=False, default=1)
    section = Column(String(10), nullable=False, default="A")
    photo_url = Column(String(255), nullable=True)
    enrollment_status = Column(String(30), default="PENDING")  # PENDING, APPROVED, REJECTED, INACTIVE
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    face_profile = relationship("FaceProfile", back_populates="student", uselist=False, cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    department = Column(String(100), default="Administration")
    phone = Column(String(30), nullable=True)

    user = relationship("User", back_populates="admin_profile")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    department = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)
    credits = Column(Integer, default=4)

    sessions = relationship("AttendanceSession", back_populates="subject")


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    designation = Column(String(100), default="Assistant Professor")

    sessions = relationship("AttendanceSession", back_populates="faculty")


class FaceProfile(Base):
    __tablename__ = "face_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False)
    photo_path = Column(String(255), nullable=False)
    embedding_json = Column(Text, nullable=False)  # JSON representation of 128-float face vector
    is_trained = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="face_profile")


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    department = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    start_time = Column(String(20), nullable=False)  # HH:MM
    end_time = Column(String(20), nullable=False)  # HH:MM
    room = Column(String(50), default="Room 101")
    camera_id = Column(String(50), default="CAM_01")
    status = Column(String(30), default="ACTIVE")  # SCHEDULED, ACTIVE, COMPLETED, CANCELLED
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subject = relationship("Subject", back_populates="sessions")
    faculty = relationship("Faculty", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="PRESENT")  # PRESENT, ABSENT, LATE, EXCUSED
    marked_at = Column(DateTime, default=datetime.utcnow)
    marked_by = Column(String(50), default="AI_CAMERA")  # AI_CAMERA, ADMIN_MANUAL, FACULTY
    confidence = Column(Float, nullable=True)  # Recognition confidence (0.0 to 1.0)
    camera_id = Column(String(50), nullable=True)
    in_time = Column(String(20), nullable=True)
    out_time = Column(String(20), nullable=True)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),
    )

    # Relationships
    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    admin_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., ADMIN_APPROVE_ENROLLMENT
    entity_type = Column(String(100), nullable=False)  # e.g., Student, AttendanceRecord
    entity_id = Column(String(50), nullable=True)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
