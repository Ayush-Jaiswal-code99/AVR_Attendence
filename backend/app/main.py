import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.auth.router import router as auth_router
from backend.app.routers.student import router as student_router
from backend.app.routers.admin import router as admin_router
from backend.app.routers.attendance import router as attendance_router
from backend.app.routers.academic import router as academic_router
from backend.app.routers.ai import router as ai_router
from backend.app.services.face_service import face_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables created
    Base.metadata.create_all(bind=engine)
    
    # Initialize face recognition cache from database
    db = SessionLocal()
    try:
        face_service.initialize_from_db(db)
    finally:
        db.close()
    
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-grade Smart Attendance Management System with AI Facial Recognition and RBAC.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev and network devices
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded face photos
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads/faces", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(student_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(attendance_router, prefix="/api")
app.include_router(academic_router, prefix="/api")
app.include_router(ai_router, prefix="/api")

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_engine": "operational",
        "enrolled_faces": len(face_service.known_names)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
