import time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Student, AttendanceSession, User
from backend.app.schemas import (
    MarkAttendancePayload, AIRecognizeResponse, RecognizedFaceItem
)
from backend.app.services.face_service import face_service
from backend.app.services.attendance_service import AttendanceService
from backend.app.dependencies import require_admin
from backend.app.config import settings

router = APIRouter(prefix="/ai", tags=["AI & Face Recognition Pipeline"])

@router.get("/status")
def get_ai_status(db: Session = Depends(get_db)):
    """Returns AI model and face recognition pipeline health."""
    if not face_service.is_initialized:
        face_service.initialize_from_db(db)

    return {
        "status": "operational",
        "engine": "dlib face_recognition",
        "tolerance": settings.FACE_MATCH_TOLERANCE,
        "cooldown_seconds": settings.ATTENDANCE_COOLDOWN_SECONDS,
        "enrolled_faces_in_memory": len(face_service.known_names),
        "enrolled_students": face_service.known_names
    }

@router.post("/reload-cache")
def reload_ai_cache(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin manually refreshes and reloads facial recognition cache from database."""
    face_service.initialize_from_db(db)
    return {
        "success": True,
        "message": f"Cache reloaded with {len(face_service.known_names)} approved faces."
    }

@router.post("/attendance/mark")
def mark_attendance_from_ai(
    payload: MarkAttendancePayload,
    db: Session = Depends(get_db)
):
    """
    Standard AI Attendance Ingestion Endpoint.
    Used by edge camera devices, Raspberry Pi, DGX GPU server, or AI microservice.
    Payload:
    {
      "student_id": 1,
      "confidence": 0.94,
      "camera_id": "CAM_ROOM_101",
      "timestamp": "...",
      "session_id": 1
    }
    """
    record, is_new, message = AttendanceService.mark_attendance(
        db=db,
        student_id=payload.student_id,
        session_id=payload.session_id,
        confidence=payload.confidence or 0.95,
        camera_id=payload.camera_id or "AI_EDGE_CAM",
        marked_by="AI_CAMERA",
        status_val=payload.status or "PRESENT"
    )

    return {
        "success": True,
        "is_new_punch": is_new,
        "message": message,
        "attendance": {
            "record_id": record.id,
            "student_id": record.student_id,
            "session_id": record.session_id,
            "status": record.status,
            "in_time": record.in_time,
            "out_time": record.out_time,
            "confidence": record.confidence,
            "camera_id": record.camera_id,
            "marked_at": record.marked_at
        }
    }

@router.post("/recognize", response_model=AIRecognizeResponse)
async def recognize_camera_frame(
    file: UploadFile = File(...),
    tolerance: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Runs real-time face detection & matching on an uploaded camera frame.
    Returns detected faces, bounding boxes, distances, and student identities.
    """
    if not face_service.is_initialized:
        face_service.initialize_from_db(db)

    start_t = time.time()
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty frame received")

    matches = face_service.recognize_frame(contents, tolerance=tolerance)
    elapsed_ms = round((time.time() - start_t) * 1000, 2)

    items: List[RecognizedFaceItem] = []
    for m in matches:
        st_id = m["student_id"]
        photo_url = None
        enrollment_no = None

        if st_id:
            st = db.query(Student).filter(Student.id == st_id).first()
            if st:
                photo_url = st.photo_url
                enrollment_no = st.enrollment_no

        items.append(
            RecognizedFaceItem(
                student_id=st_id,
                student_name=m["student_name"],
                enrollment_no=enrollment_no,
                roll_no=m["roll_no"],
                photo_url=photo_url,
                confidence=m["confidence"],
                distance=m["distance"],
                box=m["box"],
                attendance_marked=False,
                attendance_message="Recognition only (no punch)"
            )
        )

    return AIRecognizeResponse(
        faces_detected=len(items),
        recognized_faces=items,
        inference_ms=elapsed_ms
    )

@router.post("/recognize-and-punch", response_model=AIRecognizeResponse)
async def recognize_and_punch(
    file: UploadFile = File(...),
    session_id: Optional[int] = Form(None),
    camera_id: Optional[str] = Form("WEB_CAM_PREVIEW"),
    tolerance: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Integrated AI punch pipeline:
    1. Detects & matches faces in frame.
    2. If an approved student is recognized, automatically marks attendance in the session.
    3. Returns full recognition results with punch statuses.
    """
    if not face_service.is_initialized:
        face_service.initialize_from_db(db)

    start_t = time.time()
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty frame received")

    matches = face_service.recognize_frame(contents, tolerance=tolerance)
    elapsed_ms = round((time.time() - start_t) * 1000, 2)

    items: List[RecognizedFaceItem] = []
    for m in matches:
        st_id = m["student_id"]
        photo_url = None
        enrollment_no = None
        marked = False
        punch_msg = "Unknown face"

        if st_id and m["is_match"]:
            st = db.query(Student).filter(Student.id == st_id).first()
            if st:
                photo_url = st.photo_url
                enrollment_no = st.enrollment_no

                try:
                    record, is_new, punch_msg = AttendanceService.mark_attendance(
                        db=db,
                        student_id=st_id,
                        session_id=session_id,
                        confidence=m["confidence"],
                        camera_id=camera_id,
                        marked_by="AI_CAMERA",
                        status_val="PRESENT"
                    )
                    marked = True
                except HTTPException as e:
                    punch_msg = e.detail
                except Exception as e:
                    punch_msg = f"Punch error: {str(e)}"

        items.append(
            RecognizedFaceItem(
                student_id=st_id,
                student_name=m["student_name"],
                enrollment_no=enrollment_no,
                roll_no=m["roll_no"],
                photo_url=photo_url,
                confidence=m["confidence"],
                distance=m["distance"],
                box=m["box"],
                attendance_marked=marked,
                attendance_message=punch_msg
            )
        )

    return AIRecognizeResponse(
        faces_detected=len(items),
        recognized_faces=items,
        inference_ms=elapsed_ms
    )
