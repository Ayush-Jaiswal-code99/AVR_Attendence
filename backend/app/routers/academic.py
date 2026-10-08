from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Department, Subject, Faculty, User
from backend.app.schemas import (
    DepartmentResponse, SubjectResponse, SubjectCreate,
    FacultyResponse, FacultyCreate
)
from backend.app.dependencies import require_admin

router = APIRouter(prefix="/academic", tags=["Academic Structure"])

@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    """Fetch list of active departments."""
    return db.query(Department).all()

@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(
    department: Optional[str] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Fetch subjects, optionally filtered by department and semester."""
    query = db.query(Subject)
    if department:
        query = query.filter(Subject.department == department.upper())
    if semester:
        query = query.filter(Subject.semester == semester)
    return query.all()

@router.post("/subjects", response_model=SubjectResponse)
def create_subject(
    payload: SubjectCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin creates a new subject."""
    existing = db.query(Subject).filter(Subject.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Subject code '{payload.code}' already exists")

    new_sub = Subject(
        code=payload.code.upper(),
        name=payload.name.strip(),
        department=payload.department.upper(),
        semester=payload.semester,
        credits=payload.credits
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub

@router.get("/faculty", response_model=List[FacultyResponse])
def get_faculty(
    department: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch list of faculty members."""
    query = db.query(Faculty)
    if department:
        query = query.filter(Faculty.department == department.upper())
    return query.all()

@router.post("/faculty", response_model=FacultyResponse)
def create_faculty(
    payload: FacultyCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin creates a new faculty member."""
    existing = db.query(Faculty).filter(Faculty.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Faculty member with this email already exists")

    fac = Faculty(
        name=payload.name.strip(),
        email=payload.email.lower(),
        department=payload.department.upper(),
        designation=payload.designation
    )
    db.add(fac)
    db.commit()
    db.refresh(fac)
    return fac
