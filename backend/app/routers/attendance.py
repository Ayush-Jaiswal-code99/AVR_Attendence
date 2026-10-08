import asyncio
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.database import get_db
from backend.app.models import (
    User, Student, AttendanceRecord, AttendanceSession, Subject, Faculty
)
from backend.app.schemas import (
    AttendanceRecordResponse, AdminManualAttendanceCreate, AdminAttendanceUpdate,
    AttendanceSessionCreate, AttendanceSessionResponse, AttendanceSessionUpdate
)
from backend.app.dependencies import require_admin, get_client_ip
from backend.app.services.attendance_service import (
    AttendanceService, attendance_event_subscribers
)
from backend.app.services.audit_service import log_audit_action

router = APIRouter(prefix="/attendance", tags=["Attendance Management"])

@router.get("", response_model=List[AttendanceRecordResponse])
def list_attendance(
    student_id: Optional[int] = None,
    session_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    date: Optional[str] = None,
    section: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin views attendance records with rich filtering."""
    query = db.query(AttendanceRecord).join(AttendanceSession).join(Student)

    if student_id:
        query = query.filter(AttendanceRecord.student_id == student_id)
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)
    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)
    if date:
        query = query.filter(AttendanceSession.date == date)
    if section:
        query = query.filter(AttendanceSession.section == section.upper())
    if status_filter:
        query = query.filter(AttendanceRecord.status == status_filter.upper())

    records = query.order_by(desc(AttendanceRecord.marked_at)).limit(limit).all()

    dtos = []
    for r in records:
        dto = AttendanceRecordResponse.from_orm(r)
        if r.student:
            dto.student_name = r.student.full_name
            dto.student_roll_no = r.student.roll_no
            dto.student_enrollment_no = r.student.enrollment_no
        if r.session:
            dto.subject_code = r.session.subject.code if r.session.subject else "N/A"
            dto.subject_name = r.session.subject.name if r.session.subject else "N/A"
            dto.session_date = r.session.date
            dto.session_time = f"{r.session.start_time} - {r.session.end_time}"
        dtos.append(dto)

    return dtos

@router.post("/manual", response_model=AttendanceRecordResponse)
def manual_mark_attendance(
    payload: AdminManualAttendanceCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin manually marks attendance for a student."""
    record, is_new, msg = AttendanceService.mark_attendance(
        db=db,
        student_id=payload.student_id,
        session_id=payload.session_id,
        confidence=1.0,
        camera_id="ADMIN_CONSOLE",
        marked_by="ADMIN_MANUAL",
        status_val=payload.status,
        remarks=payload.remarks
    )

    if payload.in_time:
        record.in_time = payload.in_time
    if payload.out_time:
        record.out_time = payload.out_time
    record.status = payload.status
    db.commit()
    db.refresh(record)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_MANUAL_ATTENDANCE",
        entity_type="AttendanceRecord",
        entity_id=str(record.id),
        new_values={"student_id": payload.student_id, "session_id": payload.session_id, "status": payload.status},
        ip_address=ip
    )

    dto = AttendanceRecordResponse.from_orm(record)
    if record.student:
        dto.student_name = record.student.full_name
        dto.student_roll_no = record.student.roll_no
        dto.student_enrollment_no = record.student.enrollment_no
    if record.session:
        dto.subject_code = record.session.subject.code if record.session.subject else ""
        dto.subject_name = record.session.subject.name if record.session.subject else ""
        dto.session_date = record.session.date
        dto.session_time = f"{record.session.start_time} - {record.session.end_time}"
    return dto

@router.put("/{record_id}", response_model=AttendanceRecordResponse)
def update_attendance_record(
    record_id: int,
    payload: AdminAttendanceUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin corrects or modifies an existing attendance record."""
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_vals = {
        "status": record.status,
        "in_time": record.in_time,
        "out_time": record.out_time,
        "remarks": record.remarks
    }

    record.status = payload.status.upper()
    if payload.remarks is not None:
        record.remarks = payload.remarks
    if payload.in_time is not None:
        record.in_time = payload.in_time
    if payload.out_time is not None:
        record.out_time = payload.out_time
    record.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(record)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_EDIT_ATTENDANCE",
        entity_type="AttendanceRecord",
        entity_id=str(record.id),
        old_values=old_vals,
        new_values=payload.dict(exclude_unset=True),
        ip_address=ip
    )

    dto = AttendanceRecordResponse.from_orm(record)
    if record.student:
        dto.student_name = record.student.full_name
        dto.student_roll_no = record.student.roll_no
        dto.student_enrollment_no = record.student.enrollment_no
    if record.session:
        dto.subject_code = record.session.subject.code if record.session.subject else ""
        dto.subject_name = record.session.subject.name if record.session.subject else ""
        dto.session_date = record.session.date
        dto.session_time = f"{record.session.start_time} - {record.session.end_time}"
    return dto

@router.delete("/{record_id}")
def delete_attendance_record(
    record_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin deletes an attendance record."""
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_vals = {"id": record.id, "student_id": record.student_id, "session_id": record.session_id, "status": record.status}
    db.delete(record)
    db.commit()

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_DELETE_ATTENDANCE",
        entity_type="AttendanceRecord",
        entity_id=str(record_id),
        old_values=old_vals,
        ip_address=ip
    )

    return {"success": True, "message": f"Attendance record #{record_id} deleted."}

@router.get("/export")
def export_attendance(
    date: Optional[str] = None,
    subject_id: Optional[int] = None,
    section: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Exports attendance records as a downloadable CSV spreadsheet."""
    csv_content = AttendanceService.export_attendance_csv(
        db=db,
        date_filter=date,
        subject_id=subject_id,
        section=section
    )
    filename = f"Attendance_Export_{date or 'all'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ----------------- Sessions Endpoints -----------------
@router.get("/sessions", response_model=List[AttendanceSessionResponse])
def list_sessions(
    date: Optional[str] = None,
    subject_id: Optional[int] = None,
    section: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists attendance sessions with subject and present counts."""
    query = db.query(AttendanceSession)
    if date:
        query = query.filter(AttendanceSession.date == date)
    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)
    if section:
        query = query.filter(AttendanceSession.section == section.upper())
    if status_filter:
        query = query.filter(AttendanceSession.status == status_filter.upper())

    sessions = query.order_by(desc(AttendanceSession.date), desc(AttendanceSession.start_time)).all()

    dtos = []
    for s in sessions:
        present_count = (
            db.query(func.count(AttendanceRecord.id))
            .filter(
                AttendanceRecord.session_id == s.id,
                AttendanceRecord.status.in_(["PRESENT", "LATE", "EXCUSED"])
            )
            .scalar() or 0
        )
        dto = AttendanceSessionResponse.from_orm(s)
        dto.subject_name = s.subject.name if s.subject else "N/A"
        dto.subject_code = s.subject.code if s.subject else "N/A"
        dto.faculty_name = s.faculty.name if s.faculty else "N/A"
        dto.total_present = present_count
        dtos.append(dto)

    return dtos

@router.post("/sessions", response_model=AttendanceSessionResponse)
def create_session(
    payload: AttendanceSessionCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin creates a new attendance session."""
    subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")

    session = AttendanceSession(
        subject_id=payload.subject_id,
        faculty_id=payload.faculty_id,
        department=payload.department.upper(),
        semester=payload.semester,
        section=payload.section.upper(),
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room or "Room 101",
        camera_id=payload.camera_id or "CAM_01",
        status=payload.status or "ACTIVE",
        created_by_id=admin.id
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_CREATE_SESSION",
        entity_type="AttendanceSession",
        entity_id=str(session.id),
        new_values=payload.dict(),
        ip_address=ip
    )

    dto = AttendanceSessionResponse.from_orm(session)
    dto.subject_name = subj.name
    dto.subject_code = subj.code
    dto.faculty_name = session.faculty.name if session.faculty else ""
    dto.total_present = 0
    return dto

@router.put("/sessions/{session_id}", response_model=AttendanceSessionResponse)
def update_session(
    session_id: int,
    payload: AttendanceSessionUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin updates session status or details."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    old_vals = {"status": session.status, "room": session.room}

    if payload.status:
        session.status = payload.status.upper()
    if payload.room:
        session.room = payload.room
    if payload.camera_id:
        session.camera_id = payload.camera_id
    if payload.end_time:
        session.end_time = payload.end_time

    db.commit()
    db.refresh(session)

    ip = get_client_ip(request) if request else "127.0.0.1"
    log_audit_action(
        db=db,
        admin=admin,
        action="ADMIN_UPDATE_SESSION",
        entity_type="AttendanceSession",
        entity_id=str(session.id),
        old_values=old_vals,
        new_values=payload.dict(exclude_unset=True),
        ip_address=ip
    )

    dto = AttendanceSessionResponse.from_orm(session)
    dto.subject_name = session.subject.name if session.subject else ""
    dto.subject_code = session.subject.code if session.subject else ""
    dto.faculty_name = session.faculty.name if session.faculty else ""
    return dto

# ----------------- Real-Time Live Attendance Stream (SSE) -----------------
@router.get("/stream")
async def live_attendance_stream():
    """
    Server-Sent Events (SSE) streaming endpoint.
    Allows Admin dashboards and live camera monitors to receive instant
    attendance push notifications when faces are recognized.
    """
    queue: asyncio.Queue = asyncio.Queue()
    attendance_event_subscribers.append(queue)

    async def event_generator():
        try:
            # Send initial connected ping
            yield f"data: {json.dumps({'type': 'CONNECTED', 'message': 'Live attendance stream connected'})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep HTTP connection alive
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in attendance_event_subscribers:
                attendance_event_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
