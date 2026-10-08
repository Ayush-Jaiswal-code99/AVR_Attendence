import os
import io
import json
import time
import pickle
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from PIL import Image
import cv2
import face_recognition
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.config import settings
from backend.app.models import Student, FaceProfile

logger = logging.getLogger("face_service")

class FaceEnrollmentService:
    """
    Modular Face Enrollment and Recognition Service.
    Integrates directly with dlib face_recognition and maintains runtime cache.
    """
    def __init__(self):
        self.known_encodings: List[np.ndarray] = []
        self.known_student_ids: List[int] = []
        self.known_names: List[str] = []
        self.known_roll_nos: List[str] = []
        self.is_initialized = False

    def initialize_from_db(self, db: Session):
        """Pre-loads face encodings from Database and Cache file into memory."""
        self.known_encodings.clear()
        self.known_student_ids.clear()
        self.known_names.clear()
        self.known_roll_nos.clear()

        profiles = db.query(FaceProfile).join(Student).filter(Student.enrollment_status == "APPROVED").all()
        for p in profiles:
            try:
                emb = np.array(json.loads(p.embedding_json), dtype=np.float64)
                self.known_encodings.append(emb)
                self.known_student_ids.append(p.student.id)
                self.known_names.append(p.student.full_name)
                self.known_roll_nos.append(p.student.roll_no)
            except Exception as e:
                logger.error(f"Error parsing embedding for student {p.student_id}: {e}")

        # Also write to pickle cache for fast standalone interop
        try:
            with open(settings.CACHE_FILE, "wb") as f:
                pickle.dump({
                    "encodings": self.known_encodings,
                    "student_ids": self.known_student_ids,
                    "names": self.known_names,
                    "roll_nos": self.known_roll_nos
                }, f)
        except Exception as e:
            logger.warning(f"Could not persist encodings cache: {e}")

        self.is_initialized = True
        logger.info(f"Initialized FaceEnrollmentService with {len(self.known_names)} approved faces.")

    def validate_image_file(self, image_bytes: bytes, filename: str) -> np.ndarray:
        """
        Validates image size, format and integrity. Returns RGB numpy array.
        """
        max_size = 5 * 1024 * 1024  # 5MB
        if len(image_bytes) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image file size exceeds maximum limit of 5MB."
            )
        
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
            )

        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            pil_img.verify()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is corrupted or not a valid image."
            )

        # Convert to RGB numpy array for face_recognition
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        rgb_array = np.array(pil_img)
        return rgb_array

    def register_student_face(
        self,
        db: Session,
        student_id: int,
        image_bytes: bytes,
        filename: str
    ) -> Tuple[str, List[float]]:
        """
        Extracts face embedding, saves image file securely, records FaceProfile in DB,
        and refreshes runtime cache.
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )

        rgb_image = self.validate_image_file(image_bytes, filename)

        # Detect face locations
        locations = face_recognition.face_locations(rgb_image)
        if len(locations) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No human face was detected in the photo. Please upload a clear, front-facing photo with good lighting."
            )

        # Compute 128-d face encodings
        encodings = face_recognition.face_encodings(rgb_image, locations)
        if len(encodings) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not generate high-confidence facial embedding. Please try a clearer photograph."
            )

        primary_encoding = encodings[0]
        embedding_list = primary_encoding.tolist()

        # Save photo securely to UPLOAD_DIR
        safe_filename = f"student_{student_id}_{int(time.time())}.jpg"
        file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        
        # Save as JPEG with good quality
        pil_to_save = Image.fromarray(rgb_image)
        pil_to_save.save(file_path, "JPEG", quality=92)
        relative_url = f"/api/uploads/faces/{safe_filename}"

        # Update or create FaceProfile in database
        face_profile = db.query(FaceProfile).filter(FaceProfile.student_id == student_id).first()
        if face_profile:
            # Delete old file if exists and different
            if os.path.exists(face_profile.photo_path) and face_profile.photo_path != file_path:
                try:
                    os.remove(face_profile.photo_path)
                except Exception:
                    pass
            face_profile.photo_path = file_path
            face_profile.embedding_json = json.dumps(embedding_list)
            face_profile.is_trained = True
        else:
            face_profile = FaceProfile(
                student_id=student_id,
                photo_path=file_path,
                embedding_json=json.dumps(embedding_list),
                is_trained=True
            )
            db.add(face_profile)

        # Update Student photo_url
        student.photo_url = relative_url
        db.commit()
        db.refresh(face_profile)
        db.refresh(student)

        # Refresh memory encodings
        self.initialize_from_db(db)

        return relative_url, embedding_list

    def recognize_frame(
        self,
        image_bytes: bytes,
        tolerance: float = None
    ) -> List[Dict[str, Any]]:
        """
        Runs face detection and matching against enrolled students for a single frame.
        """
        if tolerance is None:
            tolerance = settings.FACE_MATCH_TOLERANCE

        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Failed to decode image frame")

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        results = []
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            matched_id = None
            matched_name = "Unknown"
            matched_roll = None
            min_dist = 1.0
            is_match = False

            if len(self.known_encodings) > 0:
                face_distances = face_recognition.face_distance(self.known_encodings, face_encoding)
                best_idx = int(np.argmin(face_distances))
                min_dist = float(face_distances[best_idx])

                if min_dist <= tolerance:
                    is_match = True
                    matched_id = self.known_student_ids[best_idx]
                    matched_name = self.known_names[best_idx]
                    matched_roll = self.known_roll_nos[best_idx]

            confidence = round(max(0.0, min(1.0, 1.0 - (min_dist * 0.8))), 4) if is_match else round(max(0.0, 1.0 - min_dist), 4)

            results.append({
                "student_id": matched_id,
                "student_name": matched_name,
                "roll_no": matched_roll,
                "is_match": is_match,
                "confidence": confidence,
                "distance": round(min_dist, 4),
                "box": [int(top), int(right), int(bottom), int(left)]
            })

        return results

face_service = FaceEnrollmentService()
