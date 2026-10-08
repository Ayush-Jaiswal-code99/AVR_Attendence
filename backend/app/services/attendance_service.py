import os
import csv
import io
import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status

from backend.app.config import settings
from backend.app.models import (
    Student, AttendanceRecord, AttendanceSession, Subject, Faculty, User
)
from backend.app.schemas import (
    StudentDashboardStats, SubjectAttendanceStat, AttendanceRecordResponse,
    AdminDashboardStats
)

# In-memory queue for Server-Sent Events / Live Attendance Updates
attendance_event_subscribers: List[asyncio.Queue] = []

async def broadcast_attendance_event(data: Dict[str, Any]):
    """Broadcasts real-time attendance punch to all connected admin listeners."""
    dead_queues = []
    for q in attendance_event_subscribers:
        try:
            await q.put(data)
        except Exception:
            dead_queues.append(q)
    for dq in dead_queues:
        if dq in attendance_event_subscribers:
            attendance_event_subscribers.remove(dq)

class AttendanceService:

    @staticmethod
    def get_or_find_session(
        db: Session,
        student: Student,
        session_id: Optional[int] = None
    ) -> AttendanceSession:
        """
        Retrieves specified session or looks up the current active session
        matching the student's department, semester, and section.
        """
        if session_id:
            session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
            if not session:
                raise HTTPException(status_code=404, detail=f"Attendance session #{session_id} not found")
            return session

        today_str = datetime.now().strftime("%Y-%m-%d")
        now_time_str = datetime.now().strftime("%H:%M")

        # Find active session matching section, semester, dept and today's date
        session = (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.date == today_str,
                AttendanceSession.department == student.department,
                AttendanceSession.semester == student.semester,
                AttendanceSession.section == student.section,
                AttendanceSession.status.in_(["ACTIVE", "SCHEDULED"])
            )
            .order_by(AttendanceSession.start_time.asc())
            .first()
        )

        if not session:
            # Fallback to any active session today for this student's department & semester
            session = (
                db.query(AttendanceSession)
                .filter(
                    AttendanceSession.date == today_str,
                    AttendanceSession.department == student.department,
                    AttendanceSession.semester == student.semester,
                    AttendanceSession.status.in_(["ACTIVE", "SCHEDULED"])
                )
                .first()
            )

        if not session:
            # Create an automatic active session for the student's primary subject today so punches are never lost
            first_subject = (
                db.query(Subject)
                .filter(
                    Subject.department == student.department,
                    Subject.semester == student.semester
                )
                .first()
            )
            if not first_subject:
                first_subject = db.query(Subject).first()
                if not first_subject:
                    raise HTTPException(
                        status_code=400,
                        detail="No active session found and no subjects configured in database."
                    )

            first_faculty = db.query(Faculty).first()
            faculty_id = first_faculty.id if first_faculty else 1

            session = AttendanceSession(
                subject_id=first_subject.id,
                faculty_id=faculty_id,
                department=student.department,
                semester=student.semester,
                section=student.section,
                date=today_str,
                start_time="09:00",
                end_time="17:00",
                room="Smart Lab",
                camera_id="CAM_MAIN",
                status="ACTIVE"
            )
            db.add(session)
            db.commit()
            db.refresh(session)

        return session

    @staticmethod
    def mark_attendance(
        db: Session,
        student_id: int,
        session_id: Optional[int] = None,
        confidence: Optional[float] = 0.95,
        camera_id: Optional[str] = "CAM_01",
        marked_by: str = "AI_CAMERA",
        status_val: str = "PRESENT",
        remarks: Optional[str] = None
    ) -> Tuple[AttendanceRecord, bool, str]:
        """
        Marks attendance for a student with duplicate prevention,
        cooldown filter, and dual-punch tracking (In-Time & Out-Time).
        Returns (record, is_new, message).
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        if student.enrollment_status != "APPROVED":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot mark attendance: Student enrollment status is '{student.enrollment_status}'."
            )

        session = AttendanceService.get_or_find_session(db, student, session_id)
        now = datetime.now()
        current_time_str = now.strftime("%H:%M:%S")

        # Check existing record for this student in this session
        record = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.session_id == session.id,
                AttendanceRecord.student_id == student.id
            )
            .first()
        )

        if record:
            # Check cooldown against last update/mark
            time_since_mark = (now - (record.updated_at or record.marked_at)).total_seconds()
            if time_since_mark < settings.ATTENDANCE_COOLDOWN_SECONDS:
                return (
                    record,
                    False,
                    f"Cooldown active: attendance was punched {int(time_since_mark)}s ago."
                )

            # Record Out-Time (Dual-punch support)
            record.out_time = current_time_str
            record.updated_at = now
            if remarks:
                record.remarks = remarks
            db.commit()
            db.refresh(record)

            event_data = {
                "type": "OUT_TIME_RECORDED",
                "record_id": record.id,
                "student_id": student.id,
                "student_name": student.full_name,
                "roll_no": student.roll_no,
                "session_id": session.id,
                "subject": session.subject.name if session.subject else "Class",
                "out_time": current_time_str,
                "timestamp": now.isoformat()
            }
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(broadcast_attendance_event(event_data))
            except RuntimeError:
                pass

            return (
                record,
                False,
                f"Out-time recorded for {student.full_name} at {current_time_str}."
            )

        # Create new In-Time attendance record
        record = AttendanceRecord(
            session_id=session.id,
            student_id=student.id,
            status=status_val,
            marked_at=now,
            marked_by=marked_by,
            confidence=confidence,
            camera_id=camera_id,
            in_time=current_time_str,
            out_time=None,
            remarks=remarks
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        event_data = {
            "type": "ATTENDANCE_MARKED",
            "record_id": record.id,
            "student_id": student.id,
            "student_name": student.full_name,
            "roll_no": student.roll_no,
            "session_id": session.id,
            "subject": session.subject.name if session.subject else "Class",
            "in_time": current_time_str,
            "confidence": confidence,
            "camera_id": camera_id,
            "timestamp": now.isoformat()
        }
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(broadcast_attendance_event(event_data))
        except RuntimeError:
            pass

        return (
            record,
            True,
            f"Attendance marked: {student.full_name} [PRESENT] at {current_time_str}."
        )

    @staticmethod
    def calculate_student_summary(db: Session, student_id: int) -> StudentDashboardStats:
        """
        Computes accurate student attendance statistics:
        Attendance % = (Present Classes / Total Conducted Classes) * 100
        Excludes cancelled sessions.
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Conducted sessions applicable to this student's section/semester
        conducted_sessions = (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.department == student.department,
                AttendanceSession.semester == student.semester,
                AttendanceSession.section == student.section,
                AttendanceSession.status.in_(["ACTIVE", "COMPLETED"])
            )
            .all()
        )
        conducted_session_ids = [s.id for s in conducted_sessions]

        # Student's attendance records in conducted sessions
        records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.session_id.in_(conducted_session_ids) if conducted_session_ids else False
            )
            .all()
        )

        record_map = {r.session_id: r for r in records}

        # Calculate subject-wise breakdown
        # Find all subjects for this semester & department
        subjects = (
            db.query(Subject)
            .filter(
                Subject.department == student.department,
                Subject.semester == student.semester
            )
            .all()
        )

        subject_stats: List[SubjectAttendanceStat] = []
        overall_total_conducted = 0
        overall_present_count = 0
        overall_absent_count = 0
        overall_late_count = 0

        for subj in subjects:
            subj_sessions = [s for s in conducted_sessions if s.subject_id == subj.id]
            total_subj_classes = len(subj_sessions)
            subj_present = 0
            subj_absent = 0
            subj_late = 0

            for sess in subj_sessions:
                rec = record_map.get(sess.id)
                if rec and rec.status in ["PRESENT", "EXCUSED"]:
                    subj_present += 1
                elif rec and rec.status == "LATE":
                    subj_late += 1
                    subj_present += 1  # count towards present
                else:
                    subj_absent += 1

            overall_total_conducted += total_subj_classes
            overall_present_count += subj_present
            overall_absent_count += subj_absent
            overall_late_count += subj_late

            percentage = round((subj_present / total_subj_classes * 100), 1) if total_subj_classes > 0 else 100.0
            is_low = percentage < settings.LOW_ATTENDANCE_THRESHOLD

            subject_stats.append(
                SubjectAttendanceStat(
                    subject_id=subj.id,
                    subject_code=subj.code,
                    subject_name=subj.name,
                    total_classes=total_subj_classes,
                    present=subj_present,
                    absent=subj_absent,
                    late=subj_late,
                    percentage=percentage,
                    is_low=is_low
                )
            )

        overall_percentage = (
            round((overall_present_count / overall_total_conducted * 100), 1)
            if overall_total_conducted > 0 else 100.0
        )
        is_overall_low = overall_percentage < settings.LOW_ATTENDANCE_THRESHOLD

        # Classes this month
        now = datetime.now()
        current_year_month = now.strftime("%Y-%m")
        classes_this_month = sum(
            1 for s in conducted_sessions if s.date.startswith(current_year_month)
        )

        # Monthly trend (last 5 months or weeks)
        monthly_trend = []
        for i in range(4, -1, -1):
            target_date = now - timedelta(days=i * 7)
            week_label = f"W{5 - i}"
            # sample distribution
            monthly_trend.append({
                "label": week_label,
                "percentage": min(100.0, max(50.0, overall_percentage + (i % 2 * 3 - 2)))
            })

        # Recent attendance records
        recent_records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.student_id == student.id)
            .order_by(AttendanceRecord.marked_at.desc())
            .limit(10)
            .all()
        )

        recent_dtos = []
        for r in recent_records:
            dto = AttendanceRecordResponse.from_orm(r)
            dto.student_name = student.full_name
            dto.student_roll_no = student.roll_no
            dto.student_enrollment_no = student.enrollment_no
            if r.session:
                dto.subject_code = r.session.subject.code if r.session.subject else "N/A"
                dto.subject_name = r.session.subject.name if r.session.subject else "N/A"
                dto.session_date = r.session.date
                dto.session_time = f"{r.session.start_time} - {r.session.end_time}"
            recent_dtos.append(dto)

        return StudentDashboardStats(
            student=student,
            overall_percentage=overall_percentage,
            total_classes=overall_total_conducted,
            total_present=overall_present_count,
            total_absent=overall_absent_count,
            total_late=overall_late_count,
            classes_this_month=classes_this_month,
            is_low_attendance=is_overall_low,
            threshold=settings.LOW_ATTENDANCE_THRESHOLD,
            subject_stats=subject_stats,
            recent_attendance=recent_dtos,
            monthly_trend=monthly_trend
        )

    @staticmethod
    def calculate_admin_dashboard_stats(db: Session) -> AdminDashboardStats:
        """
        Computes aggregate statistics for the Admin Dashboard.
        """
        total_students = db.query(func.count(Student.id)).scalar() or 0
        active_students = (
            db.query(func.count(Student.id))
            .filter(Student.enrollment_status == "APPROVED")
            .scalar() or 0
        )
        pending_enrollments = (
            db.query(func.count(Student.id))
            .filter(Student.enrollment_status == "PENDING")
            .scalar() or 0
        )

        today_str = datetime.now().strftime("%Y-%m-%d")
        today_sessions = (
            db.query(AttendanceSession)
            .filter(AttendanceSession.date == today_str)
            .all()
        )
        today_session_ids = [s.id for s in today_sessions]

        today_records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.session_id.in_(today_session_ids))
            .all() if today_session_ids else []
        )

        today_present = sum(1 for r in today_records if r.status in ["PRESENT", "LATE", "EXCUSED"])
        today_absent = sum(1 for r in today_records if r.status == "ABSENT")
        today_marked = len(today_records)

        # Average attendance across all approved students
        students = db.query(Student).filter(Student.enrollment_status == "APPROVED").all()
        percentages = []
        low_count = 0
        for s in students:
            # Quick percentage calc
            st_conducted = (
                db.query(func.count(AttendanceSession.id))
                .filter(
                    AttendanceSession.department == s.department,
                    AttendanceSession.semester == s.semester,
                    AttendanceSession.section == s.section,
                    AttendanceSession.status.in_(["ACTIVE", "COMPLETED"])
                )
                .scalar() or 0
            )
            st_present = (
                db.query(func.count(AttendanceRecord.id))
                .filter(
                    AttendanceRecord.student_id == s.id,
                    AttendanceRecord.status.in_(["PRESENT", "LATE", "EXCUSED"])
                )
                .scalar() or 0
            )
            pct = round((st_present / st_conducted * 100), 1) if st_conducted > 0 else 100.0
            percentages.append(pct)
            if pct < settings.LOW_ATTENDANCE_THRESHOLD:
                low_count += 1

        avg_pct = round(sum(percentages) / len(percentages), 1) if percentages else 0.0

        # Daily trend last 7 days
        daily_trend = []
        for i in range(6, -1, -1):
            d = (date.today() - timedelta(days=i)).strftime("%Y-%m-%d")
            day_name = (date.today() - timedelta(days=i)).strftime("%a")
            d_records = (
                db.query(AttendanceRecord)
                .join(AttendanceSession)
                .filter(AttendanceSession.date == d)
                .all()
            )
            pres = sum(1 for r in d_records if r.status in ["PRESENT", "LATE"])
            ab = sum(1 for r in d_records if r.status == "ABSENT")
            daily_trend.append({
                "date": d,
                "day": day_name,
                "present": pres,
                "absent": ab,
                "total": pres + ab
            })

        # Department distribution
        dept_rows = (
            db.query(Student.department, func.count(Student.id))
            .filter(Student.enrollment_status == "APPROVED")
            .group_by(Student.department)
            .all()
        )
        dept_stats = [{"department": d[0], "count": d[1]} for d in dept_rows]

        # Subject stats
        subj_rows = db.query(Subject).limit(6).all()
        subject_stats = []
        for sub in subj_rows:
            recs = (
                db.query(AttendanceRecord)
                .join(AttendanceSession)
                .filter(AttendanceSession.subject_id == sub.id)
                .all()
            )
            p = sum(1 for r in recs if r.status in ["PRESENT", "LATE"])
            tot = len(recs)
            pct = round((p / tot * 100), 1) if tot > 0 else 100.0
            subject_stats.append({
                "subject": sub.code,
                "name": sub.name,
                "total_records": tot,
                "attendance_pct": pct
            })

        return AdminDashboardStats(
            total_students=total_students,
            active_students=active_students,
            pending_enrollments=pending_enrollments,
            today_sessions_count=len(today_sessions),
            today_attendance_marked=today_marked,
            today_present=today_present,
            today_absent=today_absent,
            average_attendance_percentage=avg_pct,
            low_attendance_students_count=low_count,
            daily_trend=daily_trend,
            department_stats=dept_stats,
            subject_stats=subject_stats
        )

    @staticmethod
    def export_attendance_csv(
        db: Session,
        date_filter: Optional[str] = None,
        subject_id: Optional[int] = None,
        section: Optional[str] = None
    ) -> str:
        """Generates CSV format attendance report."""
        query = db.query(AttendanceRecord).join(AttendanceSession).join(Student)
        if date_filter:
            query = query.filter(AttendanceSession.date == date_filter)
        if subject_id:
            query = query.filter(AttendanceSession.subject_id == subject_id)
        if section:
            query = query.filter(AttendanceSession.section == section)

        records = query.order_by(AttendanceRecord.marked_at.desc()).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Record ID", "Date", "Subject Code", "Subject Name", "Roll No",
            "Enrollment No", "Student Name", "Section", "Status", "In-Time",
            "Out-Time", "Confidence", "Marked By", "Remarks"
        ])

        for r in records:
            writer.writerow([
                r.id,
                r.session.date if r.session else "",
                r.session.subject.code if (r.session and r.session.subject) else "",
                r.session.subject.name if (r.session and r.session.subject) else "",
                r.student.roll_no if r.student else "",
                r.student.enrollment_no if r.student else "",
                r.student.full_name if r.student else "",
                r.session.section if r.session else "",
                r.status,
                r.in_time or "",
                r.out_time or "",
                f"{r.confidence:.2f}" if r.confidence else "",
                r.marked_by,
                r.remarks or ""
            ])

        return output.getvalue()
