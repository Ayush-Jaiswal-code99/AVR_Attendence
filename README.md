# 🎓 ApexAttend: Smart College Attendance Management System

An enterprise-grade, production-ready **Smart Attendance Management System** for colleges and universities powered by deep learning facial recognition (128-dimensional dlib face embeddings), Role-Based Access Control (RBAC), multi-step student self-enrollment wizard, anti-duplicate cooldown protection, and real-time Server-Sent Events (SSE) live camera monitoring.

---

## 🌟 Key Features

### 👨‍🎓 Student Portal
- **Secure Authentication**: Log in using College Email, University Roll Number, or Enrollment ID.
- **Biometric Self-Enrollment**: Multi-step registration wizard with photo upload or instant webcam snap; automatically generates and stores 128-dimensional facial embedding vectors.
- **Dynamic Attendance Dashboard**:
  - Live overall attendance percentage calculated as:
    $$\text{Attendance \%} = \left(\frac{\text{Present Classes}}{\text{Total Conducted Classes}}\right) \times 100$$
  - Real-time statistics: Total Conducted, Present, Absent, Classes this Month.
  - **Automated Low Attendance Warning Alert**: Highlights when attendance falls below the configurable 75% college requirement.
  - Visual analytics: Monthly attendance trend (Recharts Area chart) and Present/Absent distribution.
  - Subject-wise attendance breakdown table with progress bars and status indicators.
- **Protected Attendance History**: Filter records by subject, date range, or status (Present, Absent, Late). Strict IDOR protection ensures students can never query another student's data.
- **Student Profile Management**: View academic credentials, update phone and personal email, change passwords, and update facial biometrics.

### 🛡️ Administration Portal
- **Executive Analytics Dashboard**:
  - Total students, active students, pending enrollment count, today's sessions count, today's attendance marked, present today, absent today, college-wide average attendance %, and low-attendance student alerts.
  - 7-day daily attendance trend chart and department enrollment breakdown.
- **Student Management Directory**:
  - Filterable by department, semester, section, and status with pagination, search, and sorting.
  - Actions: View full profile & AI vector status, manually add students, edit student details, replace photo & retrain AI, and delete students.
- **Enrollment Verification Queue**:
  - Review pending student self-registrations and inspect uploaded face photos.
  - One-click **Approve** (instantly synchronizes face encodings into the active AI model cache) and **Reject**.
- **Attendance Records & Corrections**:
  - Rich filters by date, section, and status.
  - Manually mark attendance with in-time, out-time, and remarks.
  - Edit and correct existing attendance punches with an immutable audit trail.
  - One-click **Export to CSV** spreadsheet.
- **Lecture Session Scheduling**:
  - Schedule class sessions with Subject, Faculty, Department, Semester, Section, Date, Start/End times, Room, and AI Camera device.
  - Track live present count and toggle sessions as Active, Completed, or Cancelled.
- **Live AI Camera & Biometric Monitor**:
  - Interactive browser webcam feed or test image runner.
  - Runs frame inference against enrolled embeddings in milliseconds, overlays bounding boxes and match metrics, and automatically punches attendance in the active lecture session.
  - Real-time Server-Sent Events (SSE) stream (`/api/attendance/stream`) receives punches instantly without page refreshes.
- **Academic Structure & System Audit Logs**:
  - Manage course subjects, departments, and faculty.
  - Comprehensive audit log tracks administrator actions, entity modifications, timestamps, and client IP addresses.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          APEXATTEND ARCHITECTURE                       │
└────────────────────────────────────────────────────────────────────────┘

    [Edge / Webcam / IP Camera]           [Student Registration Wizard]
                 │                                      │
                 ▼                                      ▼
         POST /api/ai/recognize                POST /api/auth/register-student
                 │                                      │
                 ▼                                      ▼
        ┌────────────────────────────────────────────────────────┐
        │                 FastAPI Backend Engine                 │
        │                                                        │
        │  ┌──────────────────────┐    ┌──────────────────────┐  │
        │  │ FaceEnrollmentService│    │  AttendanceService   │  │
        │  │ • Image Validation   │    │  • Duplicate filter  │  │
        │  │ • dlib 128-d Vector  │    │  • Cooldown (60s)    │  │
        │  │ • Memory Cache Sync  │    │  • Dual-Punch (In/Out│  │
        │  └──────────┬───────────┘    └──────────┬───────────┘  │
        └─────────────┼───────────────────────────┼──────────────┘
                      │                           │
                      ▼                           ▼
        ┌────────────────────────────────────────────────────────┐
        │                   Relational Database                  │
        │  • users               • departments    • sessions     │
        │  • students            • subjects       • attendance   │
        │  • face_profiles       • faculty        • audit_logs   │
        └────────────────────────────────────────────────────────┘
                      │                           │
                      ▼                           ▼
        ┌───────────────────────────┐    ┌───────────────────────┐
        │   Real-Time SSE Stream    │    │  Modern React Portal  │
        │   GET /api/attendance/    │───▶│  (Vite + TailwindCSS) │
        │   stream                  │    │  • Student Dashboard  │
        └───────────────────────────┘    │  • Admin Control Hub  │
                                         └───────────────────────┘
```

---

## 🧠 AI Face Recognition Pipeline & Integration

### How Uploaded Student Photos Reach the AI Recognition Pipeline

1. **Upload & Image Validation**:
   - When a student registers or an administrator updates a photo, the image is passed to `FaceEnrollmentService.register_student_face()`.
   - Validates file type (`JPG`, `JPEG`, `PNG`, `WEBP`) and enforces a 5MB size limit.
   - Decodes image with PIL/OpenCV and verifies file integrity.

2. **Face Detection & Embedding Extraction**:
   - Detects the human face using `face_recognition.face_locations()`. If no face is detected, the API rejects the request with an informative `400 Bad Request` error.
   - Generates a **128-dimensional floating point embedding vector** via `face_recognition.face_encodings()`.

3. **Secure Persistent Storage**:
   - The photo is saved securely to `backend/uploads/faces/student_{id}_{timestamp}.jpg`.
   - The embedding vector is serialized to JSON and stored in the `face_profiles` database table linked via foreign key to the `Student`.
   - Raw embeddings are kept internal to the backend and never exposed to unprivileged users.

4. **Runtime Cache Synchronization**:
   - `FaceEnrollmentService` updates its in-memory NumPy encoding arrays (`known_encodings`, `known_student_ids`, `known_names`, `known_roll_nos`) and serializes to `backend/cache/encodings_cache.pkl`.
   - When an administrator approves a pending student, the cache is instantly refreshed so the AI camera begins recognizing that student immediately.

5. **AI Edge Camera Ingestion API**:
   - External cameras, edge devices, or GPU servers can send attendance punches directly:
     ```http
     POST /api/attendance/mark HTTP/1.1
     Content-Type: application/json

     {
       "student_id": 1,
       "session_id": 1,
       "confidence": 0.94,
       "camera_id": "CAM_ROOM_302",
       "timestamp": "2026-10-08T10:30:00"
     }
     ```
   - Alternatively, video frames can be sent directly to `POST /api/ai/recognize-and-punch` for full on-server face matching and punch recording.

---

## 🔒 Authentication, Authorization & Security (RBAC)

- **Password Security**: Passwords hashed using industry-standard `bcrypt` with unique salts.
- **JWT Tokens**: HS256-signed JSON Web Tokens with embedded subject ID, user role, and expiration timestamps.
- **Strict Role-Based Access Control**:
  - Unauthenticated routes: `/api/auth/login`, `/api/auth/register-student`, `/health`.
  - Student routes: Protected by `require_student`. Enforces IDOR protection by fetching student data exclusively from the verified token's student ID (`/api/students/me`).
  - Admin routes: Protected by `require_admin`. Validates `user.role == 'ADMIN'` on every request.
- **Audit Trail**: Administrative actions (editing attendance, approving enrollments, manual punches, student deletions) log to the `audit_logs` table with admin email, timestamp, IP address, and JSON diffs.

---

## 📁 Repository Structure

```text
AVR_attendence/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── router.py            # Login, register, token refresh, password
│   │   │   └── security.py          # bcrypt password hashing & JWT generation
│   │   ├── routers/
│   │   │   ├── academic.py          # Subjects, departments, faculty endpoints
│   │   │   ├── admin.py             # Admin metrics, student CRUD, approvals
│   │   │   ├── ai.py                # AI recognition, edge camera punch, cache reload
│   │   │   ├── attendance.py        # Attendance records, sessions, CSV export, SSE stream
│   │   │   └── student.py           # Student profile, dashboard summary, attendance
│   │   ├── services/
│   │   │   ├── attendance_service.py # Attendance calculations, cooldown, dual-punch
│   │   │   ├── audit_service.py     # System audit logging
│   │   │   └── face_service.py      # FaceEnrollmentService & dlib AI pipeline
│   │   ├── config.py                # Pydantic environment configuration
│   │   ├── database.py              # SQLAlchemy engine, session maker, SQLite WAL
│   │   ├── dependencies.py          # RBAC dependencies (require_admin, require_student)
│   │   ├── main.py                  # FastAPI application entry point & CORS
│   │   ├── models.py                # SQLAlchemy ORM database models
│   │   ├── schemas.py               # Pydantic v2 validation models
│   │   └── seed_data.py             # Demo database seeder with real faces
│   ├── cache/                       # Pre-computed encodings_cache.pkl
│   ├── requirements.txt             # Backend Python dependencies
│   ├── tests/
│   │   └── test_system.py           # 15 automated pytest integration tests
│   └── uploads/faces/               # Securely stored face images
├── frontend/
│   ├── src/
│   │   ├── api/                     # Axios/Fetch API clients (auth, student, admin, ai)
│   │   ├── components/              # Navbar, Sidebar, StatCard, Modal, PhotoUpload, Toast
│   │   ├── context/                 # AuthContext (JWT state, permissions)
│   │   ├── pages/
│   │   │   ├── admin/               # AdminDashboard, Students, Approvals, Camera, Sessions
│   │   │   ├── student/             # StudentDashboard, Profile, Attendance history
│   │   │   ├── Login.jsx            # Dual student/admin login with quick-fill demo buttons
│   │   │   └── StudentEnrollment.jsx# 6-step registration wizard
│   │   ├── App.jsx                  # Root layout & route orchestration
│   │   ├── index.css                # TailwindCSS glassmorphism utilities
│   │   └── main.jsx                 # React root mount
│   ├── package.json                 # Node dependencies
│   ├── tailwind.config.js           # TailwindCSS styling configuration
│   └── vite.config.js               # Vite bundler configuration & /api proxy
├── .env.example                     # Environment variables template
├── attendance.db                    # Relational SQLite database
├── start_app.sh                     # Unified single-command launcher
└── README.md                        # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (tested on Node v22)
- OpenCV & dlib libraries (pre-configured in `.venv`)

### 2. Environment Setup
```bash
# Clone or navigate to the repository
cd /home/ayush/programming/AVR_attendence

# Copy environment variables
cp .env.example .env
```

### 3. Install Dependencies
```bash
# Backend dependencies
./.venv/bin/pip install -r backend/requirements.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 4. Initialize & Seed Database
Seeds the database with administration credentials, 5 course subjects, 3 faculty members, 6 demo students with real face photos, and 2 weeks of attendance logs:
```bash
PYTHONPATH=. ./.venv/bin/python -m backend.app.seed_data
```

### 5. Start the Complete Application
Launch both backend and frontend servers with one command:
```bash
./start_app.sh
```

Or run them individually:
```bash
# Terminal 1: Backend
PYTHONPATH=. ./.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

- **Frontend Portal**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000/api](http://localhost:8000/api)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc Docs**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔑 Demo Credentials (Development Only)

| Role | Username / Identifier | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `Admin@123` | Full system access, approvals, sessions, audit |
| **Student** | `vishal@college.edu` or `CS2023001` | `Student@123` | Active student with 88% overall attendance |
| **Student** | `prakhar@college.edu` or `CS2023004` | `Student@123` | Active student with **47% attendance (&lt;75% Warning)** |
| **Student** | `abhinav@college.edu` or `CS2023002` | `Student@123` | Active student with 85% attendance |
| **Student** | `harshit@college.edu` or `CS2023006` | `Student@123` | Pending enrollment (shows pending approval screen) |

*(The login page features 1-click **Quick Fill Demo Credentials** buttons for instant evaluation).*

---

## 🧪 Running Automated Tests

Run the full automated test suite covering authentication, RBAC, IDOR prevention, student CRUD, enrollment approval workflow, duplicate punch prevention, percentage calculation formulas, and AI face recognition:

```bash
PYTHONPATH=. ./.venv/bin/pytest backend/tests/test_system.py -v
```

All 15 test suites pass with 100% success.

---

## 📦 Production Build Commands

```bash
# Build optimized frontend bundle
cd frontend
npm run build
cd ..

# Run backend with production workers
./.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## ✅ Deliverable Verification Checklist

- [x] **Frontend working**: Modern React 18 + Vite + TailwindCSS glassmorphism interface.
- [x] **Backend working**: FastAPI application with full REST API and OpenAPI docs.
- [x] **Database connected**: Relational SQLite database with WAL mode and foreign key constraints.
- [x] **Student login working**: Supports College Email, Enrollment ID, and Roll Number with bcrypt hashing.
- [x] **Admin login working**: Separate admin dashboard with management access.
- [x] **RBAC working**: Strict middleware blocks students from administrative endpoints; prevents IDOR.
- [x] **Student registration working**: 6-step registration wizard with client & server-side validation.
- [x] **Photo upload working**: Supports JPG/PNG/WEBP, up to 5MB, preview, webcam snap, and face verification.
- [x] **AI enrollment interface working**: Automatically computes 128-d dlib face embedding vectors upon registration.
- [x] **Attendance API working**: Edge camera ingestion (`/api/attendance/mark`) and frame matching (`/api/ai/recognize-and-punch`).
- [x] **Attendance calculation working**: Formula $(Present / Conducted) \times 100$ excludes cancelled classes; triggers warning under 75%.
- [x] **Admin CRUD working**: Full student directory CRUD, session management, manual attendance marking, and CSV export.
- [x] **Responsive UI working**: Clean layout for desktop, tablets, and mobile devices.
- [x] **Error handling working**: Meaningful HTTP error codes and toast notifications.
- [x] **Security basics implemented**: Password hashing, JWT auth, input validation, audit logging.
- [x] **Tests passing**: 15 comprehensive automated integration tests passing.
