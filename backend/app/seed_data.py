import os
import shutil
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    User, Student, Admin, Department, Subject, Faculty,
    AttendanceSession, AttendanceRecord, AuditLog
)
from backend.app.auth.security import hash_password
from backend.app.services.face_service import face_service

def run_seed():
    print("[*] Rebuilding database schema...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        admin_user = db.query(User).filter(User.email == "admin@college.edu").first()
        if admin_user:
            print("[*] Database is already initialized. Ensuring face cache is synced...")
            face_service.initialize_from_db(db)
            print(f"[*] Cache loaded with {len(face_service.known_names)} faces.")
            return

        print("[*] Seeding Administration Account...")
        admin_user = User(
            email="admin@college.edu",
            hashed_password=hash_password("Admin@123"),
            role="ADMIN",
            is_active=True
        )
        db.add(admin_user)
        db.flush()

        admin_profile = Admin(
            user_id=admin_user.id,
            full_name="College System Administrator",
            department="Academic Administration",
            phone="+91 98765 43210"
        )
        db.add(admin_profile)

        print("[*] Seeding Departments...")
        depts_data = [
            ("CSE", "Computer Science & Engineering"),
            ("ECE", "Electronics & Communication Engineering"),
            ("MECH", "Mechanical Engineering"),
            ("IT", "Information Technology"),
        ]
        dept_objs = {}
        for code, name in depts_data:
            d = Department(code=code, name=name)
            db.add(d)
            dept_objs[code] = d
        db.flush()

        print("[*] Seeding Faculty...")
        faculties_data = [
            ("Dr. Ramesh Sharma", "r.sharma@college.edu", "CSE", "Professor & HOD"),
            ("Prof. Sunita Verma", "s.verma@college.edu", "CSE", "Associate Professor"),
            ("Dr. Amit Patel", "a.patel@college.edu", "CSE", "Assistant Professor"),
        ]
        faculty_objs = []
        for name, email, dept, desig in faculties_data:
            f = Faculty(name=name, email=email, department=dept, designation=desig)
            db.add(f)
            faculty_objs.append(f)
        db.flush()

        print("[*] Seeding Subjects...")
        subjects_data = [
            ("CS401", "Data Structures & Algorithms", "CSE", 4, 4),
            ("CS402", "Operating Systems", "CSE", 4, 4),
            ("CS403", "Computer Networks", "CSE", 4, 4),
            ("CS404", "Database Management Systems", "CSE", 4, 4),
            ("CS405", "Software Engineering", "CSE", 4, 3),
        ]
        subject_objs = []
        for code, name, dept, sem, cred in subjects_data:
            s = Subject(code=code, name=name, department=dept, semester=sem, credits=cred)
            db.add(s)
            subject_objs.append(s)
        db.flush()

        print("[*] Seeding Demo Students with real facial embeddings...")
        seed_faces_dir = os.path.join(settings.BASE_DIR, "uploads", "faces", "seed")
        
        students_info = [
            {
                "email": "vishal@college.edu",
                "name": "Vishal Kumar",
                "enrollment": "EN2023CS01",
                "roll": "CS2023001",
                "phone": "+91 98111 22334",
                "img_name": "vishal.jpg",
                "status": "APPROVED",
                "present_bias": 0.88
            },
            {
                "email": "abhinav@college.edu",
                "name": "Abhinav Singh",
                "enrollment": "EN2023CS02",
                "roll": "CS2023002",
                "phone": "+91 98222 33445",
                "img_name": "abhinav.jpg",
                "status": "APPROVED",
                "present_bias": 0.85
            },
            {
                "email": "ayush@college.edu",
                "name": "Ayush Srivastav",
                "enrollment": "EN2023CS03",
                "roll": "CS2023003",
                "phone": "+91 98333 44556",
                "img_name": "ayush srivastav.jpg",
                "status": "APPROVED",
                "present_bias": 0.94
            },
            {
                "email": "prakhar@college.edu",
                "name": "Prakhar Gupta",
                "enrollment": "EN2023CS04",
                "roll": "CS2023004",
                "phone": "+91 98444 55667",
                "img_name": "prakhar.jpg",
                "status": "APPROVED",
                "present_bias": 0.45  # Triggers low attendance warning (< 75%)
            },
            {
                "email": "shashank@college.edu",
                "name": "Shashank Mishra",
                "enrollment": "EN2023CS05",
                "roll": "CS2023005",
                "phone": "+91 98555 66778",
                "img_name": "shashank.jpg",
                "status": "APPROVED",
                "present_bias": 0.82
            },
            {
                "email": "harshit@college.edu",
                "name": "Harshit Verma",
                "enrollment": "EN2023CS06",
                "roll": "CS2023006",
                "phone": "+91 98666 77889",
                "img_name": "harshit.jpg",
                "status": "PENDING",  # For testing pending approval
                "present_bias": 0.0
            }
        ]

        student_objs = []
        for sinfo in students_info:
            u = User(
                email=sinfo["email"],
                hashed_password=hash_password("Student@123"),
                role="STUDENT",
                is_active=True
            )
            db.add(u)
            db.flush()

            st = Student(
                user_id=u.id,
                enrollment_no=sinfo["enrollment"],
                roll_no=sinfo["roll"],
                full_name=sinfo["name"],
                gender="Male",
                date_of_birth="2003-05-15",
                college_email=sinfo["email"],
                personal_email=sinfo["email"].replace("@college.edu", "@gmail.com"),
                phone_number=sinfo["phone"],
                department="CSE",
                branch="CSE",
                year=2,
                semester=4,
                section="A",
                enrollment_status=sinfo["status"],
                enrolled_at=datetime.utcnow() - timedelta(days=30),
                approved_at=datetime.utcnow() - timedelta(days=29) if sinfo["status"] == "APPROVED" else None,
                approved_by_id=admin_user.id if sinfo["status"] == "APPROVED" else None
            )
            db.add(st)
            db.flush()
            student_objs.append((st, sinfo["present_bias"]))

            # Process face photo if image file exists
            img_path = os.path.join(seed_faces_dir, sinfo["img_name"])
            if os.path.exists(img_path):
                with open(img_path, "rb") as f:
                    img_bytes = f.read()
                try:
                    rel_url, _ = face_service.register_student_face(
                        db=db,
                        student_id=st.id,
                        image_bytes=img_bytes,
                        filename=sinfo["img_name"]
                    )
                    print(f"  [+] Enrolled face for {sinfo['name']} -> {rel_url}")
                except Exception as e:
                    print(f"  [-] Note: Could not extract face for {sinfo['name']}: {e}")

        db.commit()

        print("[*] Seeding Historical Attendance Sessions & Records...")
        today = date.today()
        session_objs = []

        # Create sessions over the last 12 days (excluding weekends)
        session_id_counter = 1
        for day_offset in range(12, 0, -1):
            sess_date = today - timedelta(days=day_offset)
            if sess_date.weekday() >= 5:  # skip weekends
                continue
            date_str = sess_date.strftime("%Y-%m-%d")

            # 2 subjects per day
            subj_for_day = [subject_objs[(day_offset) % len(subject_objs)], subject_objs[(day_offset + 1) % len(subject_objs)]]
            for idx, subj in enumerate(subj_for_day):
                start_h = "09:30" if idx == 0 else "11:30"
                end_h = "10:30" if idx == 0 else "12:30"
                fac = faculty_objs[idx % len(faculty_objs)]

                sess = AttendanceSession(
                    subject_id=subj.id,
                    faculty_id=fac.id,
                    department="CSE",
                    semester=4,
                    section="A",
                    date=date_str,
                    start_time=start_h,
                    end_time=end_h,
                    room="Room 302",
                    camera_id="CAM_ROOM_302",
                    status="COMPLETED",
                    created_by_id=admin_user.id
                )
                db.add(sess)
                db.flush()
                session_objs.append(sess)

                # Seed attendance for approved students
                for st, bias in student_objs:
                    if st.enrollment_status != "APPROVED":
                        continue
                    # Deterministic pseudo-random based on ID and day
                    pseudo = ((st.id * 7 + day_offset * 13 + idx * 3) % 100) / 100.0
                    is_present = pseudo < bias

                    if is_present:
                        rec = AttendanceRecord(
                            session_id=sess.id,
                            student_id=st.id,
                            status="PRESENT",
                            marked_at=datetime.combine(sess_date, datetime.min.time()) + timedelta(hours=int(start_h.split(":")[0]), minutes=int(start_h.split(":")[1]) + 5),
                            marked_by="AI_CAMERA",
                            confidence=round(0.88 + (pseudo * 0.1), 2),
                            camera_id="CAM_ROOM_302",
                            in_time=f"{start_h}:12",
                            out_time=f"{end_h}:00",
                            remarks="Face verified"
                        )
                        db.add(rec)
                    else:
                        rec = AttendanceRecord(
                            session_id=sess.id,
                            student_id=st.id,
                            status="ABSENT",
                            marked_at=datetime.combine(sess_date, datetime.min.time()) + timedelta(hours=int(end_h.split(":")[0])),
                            marked_by="SYSTEM_AUTO",
                            confidence=None,
                            camera_id=None,
                            in_time=None,
                            out_time=None,
                            remarks="Absent"
                        )
                        db.add(rec)

        # Today's active session
        today_str = today.strftime("%Y-%m-%d")
        today_sess = AttendanceSession(
            subject_id=subject_objs[0].id,
            faculty_id=faculty_objs[0].id,
            department="CSE",
            semester=4,
            section="A",
            date=today_str,
            start_time="09:00",
            end_time="17:00",
            room="Room 302",
            camera_id="CAM_ROOM_302",
            status="ACTIVE",
            created_by_id=admin_user.id
        )
        db.add(today_sess)
        db.flush()

        # Mark 3 students present today for immediate live display
        for st, _ in student_objs[:3]:
            if st.enrollment_status == "APPROVED":
                rec = AttendanceRecord(
                    session_id=today_sess.id,
                    student_id=st.id,
                    status="PRESENT",
                    marked_at=datetime.now(),
                    marked_by="AI_CAMERA",
                    confidence=0.96,
                    camera_id="CAM_ROOM_302",
                    in_time="09:05:14",
                    out_time=None,
                    remarks="Real-time Face Match"
                )
                db.add(rec)

        db.commit()

        # Initialize memory face cache
        face_service.initialize_from_db(db)

        print("[*] Database seeded successfully!")
        print("[*] Admin Account   : admin@college.edu / Admin@123")
        print("[*] Demo Students   :")
        for sinfo in students_info:
            print(f"    - {sinfo['name']} ({sinfo['email']}) / Student@123 [{sinfo['status']}]")

    except Exception as e:
        db.rollback()
        print(f"[!] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
