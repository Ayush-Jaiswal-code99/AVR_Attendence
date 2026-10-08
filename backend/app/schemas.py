from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ----------------- Auth Schemas -----------------
class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ----------------- Student Schemas -----------------
class StudentEnrollmentCreate(BaseModel):
    full_name: str
    gender: Optional[str] = "Other"
    date_of_birth: Optional[str] = None
    college_email: EmailStr
    personal_email: Optional[EmailStr] = None
    phone_number: str
    enrollment_no: str
    roll_no: str
    department: str
    branch: str
    year: int = Field(ge=1, le=5)
    semester: int = Field(ge=1, le=10)
    section: str = Field(min_length=1, max_length=5)
    password: str = Field(min_length=6)

class StudentResponse(BaseModel):
    id: int
    user_id: int
    enrollment_no: str
    roll_no: str
    full_name: str
    gender: Optional[str]
    date_of_birth: Optional[str]
    college_email: str
    personal_email: Optional[str]
    phone_number: str
    department: str
    branch: str
    year: int
    semester: int
    section: str
    photo_url: Optional[str]
    enrollment_status: str
    enrolled_at: Optional[datetime]
    approved_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class StudentUpdateMeRequest(BaseModel):
    personal_email: Optional[EmailStr] = None
    phone_number: Optional[str] = None

class AdminStudentUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    personal_email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    enrollment_status: Optional[str] = None

class AdminStudentCreate(BaseModel):
    full_name: str
    gender: Optional[str] = "Other"
    date_of_birth: Optional[str] = None
    college_email: EmailStr
    personal_email: Optional[EmailStr] = None
    phone_number: str
    enrollment_no: str
    roll_no: str
    department: str
    branch: str
    year: int = 1
    semester: int = 1
    section: str = "A"
    password: str = "Student@123"
    enrollment_status: str = "APPROVED"

# ----------------- Academic Schemas -----------------
class DepartmentBase(BaseModel):
    code: str
    name: str

class DepartmentResponse(DepartmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SubjectBase(BaseModel):
    code: str
    name: str
    department: str
    semester: int
    credits: int = 4

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class FacultyBase(BaseModel):
    name: str
    email: EmailStr
    department: str
    designation: str = "Assistant Professor"

class FacultyCreate(FacultyBase):
    pass

class FacultyResponse(FacultyBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# ----------------- Attendance Session Schemas -----------------
class AttendanceSessionCreate(BaseModel):
    subject_id: int
    faculty_id: int
    department: str
    semester: int
    section: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    room: Optional[str] = "Room 101"
    camera_id: Optional[str] = "CAM_01"
    status: Optional[str] = "ACTIVE"

class AttendanceSessionResponse(BaseModel):
    id: int
    subject_id: int
    faculty_id: int
    department: str
    semester: int
    section: str
    date: str
    start_time: str
    end_time: str
    room: str
    camera_id: str
    status: str
    created_at: Optional[datetime]
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    faculty_name: Optional[str] = None
    total_present: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class AttendanceSessionUpdate(BaseModel):
    status: Optional[str] = None
    room: Optional[str] = None
    camera_id: Optional[str] = None
    end_time: Optional[str] = None

# ----------------- Attendance Record Schemas -----------------
class MarkAttendancePayload(BaseModel):
    student_id: int
    confidence: Optional[float] = 0.95
    camera_id: Optional[str] = "CAM_01"
    timestamp: Optional[str] = None
    session_id: Optional[int] = None
    status: Optional[str] = "PRESENT"

class AdminManualAttendanceCreate(BaseModel):
    session_id: int
    student_id: int
    status: str = "PRESENT"  # PRESENT, ABSENT, LATE, EXCUSED
    remarks: Optional[str] = "Manually marked by administrator"
    in_time: Optional[str] = None
    out_time: Optional[str] = None

class AdminAttendanceUpdate(BaseModel):
    status: str
    remarks: Optional[str] = None
    in_time: Optional[str] = None
    out_time: Optional[str] = None

class AttendanceRecordResponse(BaseModel):
    id: int
    session_id: int
    student_id: int
    status: str
    marked_at: Optional[datetime]
    marked_by: str
    confidence: Optional[float]
    camera_id: Optional[str]
    in_time: Optional[str]
    out_time: Optional[str]
    remarks: Optional[str]
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None
    student_enrollment_no: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    session_date: Optional[str] = None
    session_time: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Student Attendance Stats Schemas -----------------
class SubjectAttendanceStat(BaseModel):
    subject_id: int
    subject_code: str
    subject_name: str
    total_classes: int
    present: int
    absent: int
    late: int
    percentage: float
    is_low: bool

class StudentDashboardStats(BaseModel):
    student: StudentResponse
    overall_percentage: float
    total_classes: int
    total_present: int
    total_absent: int
    total_late: int
    classes_this_month: int
    is_low_attendance: bool
    threshold: float
    subject_stats: List[SubjectAttendanceStat]
    recent_attendance: List[AttendanceRecordResponse]
    monthly_trend: List[Dict[str, Any]]

# ----------------- Admin Dashboard Stats Schemas -----------------
class AdminDashboardStats(BaseModel):
    total_students: int
    active_students: int
    pending_enrollments: int
    today_sessions_count: int
    today_attendance_marked: int
    today_present: int
    today_absent: int
    average_attendance_percentage: float
    low_attendance_students_count: int
    daily_trend: List[Dict[str, Any]]
    department_stats: List[Dict[str, Any]]
    subject_stats: List[Dict[str, Any]]

# ----------------- Audit Log Schemas -----------------
class AuditLogResponse(BaseModel):
    id: int
    admin_id: Optional[int]
    admin_email: Optional[str]
    action: str
    entity_type: str
    entity_id: Optional[str]
    old_values: Optional[str]
    new_values: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- AI Recognition Schemas -----------------
class RecognizedFaceItem(BaseModel):
    student_id: Optional[int]
    student_name: str
    enrollment_no: Optional[str]
    roll_no: Optional[str]
    photo_url: Optional[str]
    confidence: float
    distance: float
    box: List[int]
    attendance_marked: bool
    attendance_message: str

class AIRecognizeResponse(BaseModel):
    faces_detected: int
    recognized_faces: List[RecognizedFaceItem]
    inference_ms: float
