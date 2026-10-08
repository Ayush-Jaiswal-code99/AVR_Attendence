import os
import io
import uuid
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import User, Student, AttendanceSession, AttendanceRecord, Subject
from backend.app.config import settings

client = TestClient(app)

def create_test_image(format="JPEG", size=(200, 200), color=(128, 128, 128)):
    """Creates a basic image in memory."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf

def get_admin_headers():
    res = client.post("/api/auth/login", json={
        "username_or_email": "admin@college.edu",
        "password": "Admin@123"
    })
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

# ==================== 1. AUTHENTICATION TESTS ====================

def test_admin_login_success():
    response = client.post("/api/auth/login", json={
        "username_or_email": "admin@college.edu",
        "password": "Admin@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["email"] == "admin@college.edu"

def test_student_login_success():
    response = client.post("/api/auth/login", json={
        "username_or_email": "vishal@college.edu",
        "password": "Student@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "STUDENT"
    assert data["user"]["student_id"] is not None

def test_student_login_via_enrollment_and_roll():
    res1 = client.post("/api/auth/login", json={
        "username_or_email": "EN2023CS01",
        "password": "Student@123"
    })
    assert res1.status_code == 200

    res2 = client.post("/api/auth/login", json={
        "username_or_email": "CS2023001",
        "password": "Student@123"
    })
    assert res2.status_code == 200

def test_login_invalid_password():
    response = client.post("/api/auth/login", json={
        "username_or_email": "admin@college.edu",
        "password": "WrongPassword999"
    })
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

# ==================== 2. AUTHORIZATION & RBAC TESTS ====================

def test_rbac_student_cannot_access_admin_endpoints():
    st_res = client.post("/api/auth/login", json={
        "username_or_email": "vishal@college.edu",
        "password": "Student@123"
    })
    st_token = st_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {st_token}"}

    adm_dash = client.get("/api/admin/dashboard", headers=headers)
    assert adm_dash.status_code == 403
    assert "Admin privileges required" in adm_dash.json()["detail"]

    adm_st = client.get("/api/admin/students", headers=headers)
    assert adm_st.status_code == 403

def test_idor_protection_student_can_only_access_own_data():
    st_res = client.post("/api/auth/login", json={
        "username_or_email": "vishal@college.edu",
        "password": "Student@123"
    })
    st_token = st_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {st_token}"}

    me_res = client.get("/api/students/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["college_email"] == "vishal@college.edu"

    dash_res = client.get("/api/students/me/dashboard", headers=headers)
    assert dash_res.status_code == 200
    assert dash_res.json()["student"]["college_email"] == "vishal@college.edu"

# ==================== 3. ADMIN STUDENT CRUD TESTS ====================

def test_admin_student_list_and_search():
    headers = get_admin_headers()
    res = client.get("/api/admin/students?search=Vishal", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any(s["full_name"] == "Vishal Kumar" for s in data["students"])

def test_admin_student_create_update_delete():
    headers = get_admin_headers()
    uid = uuid.uuid4().hex[:6]
    create_payload = {
        "full_name": f"Test Student {uid}",
        "gender": "Female",
        "college_email": f"crud_test_{uid}@college.edu",
        "personal_email": f"crud_test_{uid}@gmail.com",
        "phone_number": "+91 99999 88888",
        "enrollment_no": f"EN2023{uid.upper()}",
        "roll_no": f"CS2023{uid.upper()}",
        "department": "CSE",
        "branch": "CSE",
        "year": 1,
        "semester": 2,
        "section": "B",
        "password": "Student@123",
        "enrollment_status": "APPROVED"
    }
    create_res = client.post("/api/admin/students", json=create_payload, headers=headers)
    assert create_res.status_code == 200
    created_id = create_res.json()["student"]["id"]

    update_res = client.put(f"/api/admin/students/{created_id}", json={
        "full_name": f"Updated Student {uid}",
        "phone_number": "+91 99999 77777"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["student"]["full_name"] == f"Updated Student {uid}"

    del_res = client.delete(f"/api/admin/students/{created_id}", headers=headers)
    assert del_res.status_code == 200

    get_res = client.get(f"/api/admin/students/{created_id}", headers=headers)
    assert get_res.status_code == 404

# ==================== 4. ENROLLMENT APPROVAL WORKFLOW ====================

def test_pending_enrollment_workflow():
    headers = get_admin_headers()
    uid = uuid.uuid4().hex[:6]
    email = f"pending_{uid}@college.edu"

    # Create a student with PENDING status
    create_payload = {
        "full_name": f"Pending Student {uid}",
        "gender": "Male",
        "college_email": email,
        "personal_email": f"pending_{uid}@gmail.com",
        "phone_number": "+91 98765 11111",
        "enrollment_no": f"EN_PND_{uid.upper()}",
        "roll_no": f"CS_PND_{uid.upper()}",
        "department": "CSE",
        "branch": "CSE",
        "year": 1,
        "semester": 1,
        "section": "A",
        "password": "Student@123",
        "enrollment_status": "PENDING"
    }
    create_res = client.post("/api/admin/students", json=create_payload, headers=headers)
    assert create_res.status_code == 200
    st_id = create_res.json()["student"]["id"]

    # 1. Verify pending student login is BLOCKED
    login_res = client.post("/api/auth/login", json={
        "username_or_email": email,
        "password": "Student@123"
    })
    assert login_res.status_code == 403
    assert "pending approval" in login_res.json()["detail"].lower()

    # 2. Admin approves enrollment
    appr_res = client.post(f"/api/admin/students/{st_id}/approve", headers=headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["student"]["enrollment_status"] == "APPROVED"

    # 3. Verify student can now login successfully
    login_res2 = client.post("/api/auth/login", json={
        "username_or_email": email,
        "password": "Student@123"
    })
    assert login_res2.status_code == 200
    assert "access_token" in login_res2.json()

# ==================== 5. ATTENDANCE & DUPLICATE PREVENTION ====================

def test_ai_attendance_mark_and_duplicate_prevention():
    payload = {
        "student_id": 1,
        "confidence": 0.96,
        "camera_id": "CAM_TEST_101",
        "status": "PRESENT"
    }
    res1 = client.post("/api/ai/attendance/mark", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True

    # Immediate second punch within cooldown
    res2 = client.post("/api/ai/attendance/mark", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_new_punch"] is False
    assert "cooldown" in data2["message"].lower()

# ==================== 6. ATTENDANCE CALCULATION FORMULA ====================

def test_attendance_percentage_calculation():
    res = client.post("/api/auth/login", json={
        "username_or_email": "vishal@college.edu",
        "password": "Student@123"
    })
    token = res.json()["access_token"]
    dash_res = client.get("/api/students/me/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    stats = dash_res.json()

    assert stats["total_classes"] > 0
    calculated = round((stats["total_present"] / stats["total_classes"]) * 100, 1)
    assert abs(stats["overall_percentage"] - calculated) < 0.2

def test_low_attendance_warning_threshold():
    res = client.post("/api/auth/login", json={
        "username_or_email": "prakhar@college.edu",
        "password": "Student@123"
    })
    token = res.json()["access_token"]
    dash_res = client.get("/api/students/me/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    stats = dash_res.json()
    assert stats["overall_percentage"] < 75.0
    assert stats["is_low_attendance"] is True

# ==================== 7. PHOTO UPLOAD VALIDATION ====================

def test_photo_upload_validation_no_face():
    blank_img = create_test_image(format="JPEG", size=(100, 100), color=(128, 128, 128))
    files = {"photo": ("blank.jpg", blank_img.getvalue(), "image/jpeg")}
    uid = uuid.uuid4().hex[:6]
    form_data = {
        "full_name": f"Invalid Photo User {uid}",
        "gender": "Male",
        "college_email": f"invalid_{uid}@college.edu",
        "phone_number": "+91 99887 76655",
        "enrollment_no": f"EN_INV_{uid.upper()}",
        "roll_no": f"CS_INV_{uid.upper()}",
        "department": "CSE",
        "branch": "CSE",
        "year": 1,
        "semester": 1,
        "section": "A",
        "password": "Student@123"
    }

    res = client.post("/api/auth/register-student", data=form_data, files=files)
    assert res.status_code == 400
    assert "No human face was detected" in res.json()["detail"]

def test_photo_upload_valid_face():
    seed_face_path = os.path.join(settings.BASE_DIR, "uploads", "faces", "seed", "saksham.jpg")
    if os.path.exists(seed_face_path):
        with open(seed_face_path, "rb") as f:
            face_bytes = f.read()
        files = {"photo": ("saksham.jpg", face_bytes, "image/jpeg")}
        uid = uuid.uuid4().hex[:6]
        form_data = {
            "full_name": f"Saksham Test {uid}",
            "gender": "Male",
            "college_email": f"saksham_{uid}@college.edu",
            "phone_number": "+91 99123 45678",
            "enrollment_no": f"EN_SAK_{uid.upper()}",
            "roll_no": f"CS_SAK_{uid.upper()}",
            "department": "CSE",
            "branch": "CSE",
            "year": 1,
            "semester": 1,
            "section": "A",
            "password": "Student@123"
        }
        res = client.post("/api/auth/register-student", data=form_data, files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["student"]["enrollment_status"] == "PENDING"

def test_ai_face_recognition_on_real_photo():
    # Test recognition on Vishal's photo
    vishal_path = os.path.join(settings.BASE_DIR, "uploads", "faces", "seed", "vishal.jpg")
    if os.path.exists(vishal_path):
        with open(vishal_path, "rb") as f:
            frame_bytes = f.read()
        files = {"file": ("vishal.jpg", frame_bytes, "image/jpeg")}
        res = client.post("/api/ai/recognize", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["faces_detected"] >= 1
        # Vishal is enrolled and approved, so he should be recognized!
        recognized_names = [f["student_name"] for f in data["recognized_faces"]]
        assert "Vishal Kumar" in recognized_names

