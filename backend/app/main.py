from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from pathlib import Path

from app.config import CORS_ALLOW_ORIGINS
from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.course import Course
from app.models.room import Room
from app.models.timeslot import TimeSlot
from app.models.assignment import Assignment
from app.models.preference import Preference
from app.models.semester import Semester
from app.models.timetable_run import TimetableRun
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.models.faculty_course_map import FacultyCourseMap
from app.models.section import Section
from app.models.resource import Resource

from app.routes import auth, departments, faculty, courses, rooms, timeslots, semesters, timetable, notifications, audit, reports, imports, chatbot, sections, resources
from app.services.csv_importer import import_subjects_csv

app = FastAPI(title="Minerva Timetable API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def _run_lightweight_schema_updates() -> None:
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        user_cols = {col["name"] for col in inspector.get_columns("users")}
        if "role" not in user_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'student' NOT NULL"))
    if "assignments" in inspector.get_table_names():
        assignment_cols = {col["name"] for col in inspector.get_columns("assignments")}
        with engine.begin() as conn:
            if "semester_id" not in assignment_cols:
                conn.execute(text("ALTER TABLE assignments ADD COLUMN semester_id INTEGER"))
            if "run_id" not in assignment_cols:
                conn.execute(text("ALTER TABLE assignments ADD COLUMN run_id INTEGER"))
            if "section_id" not in assignment_cols:
                conn.execute(text("ALTER TABLE assignments ADD COLUMN section_id INTEGER"))


_run_lightweight_schema_updates()

app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(faculty.router)
app.include_router(courses.router)
app.include_router(rooms.router)
app.include_router(timeslots.router)
app.include_router(semesters.router)
app.include_router(timetable.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(reports.router)
app.include_router(imports.router)
app.include_router(chatbot.router)
app.include_router(sections.router)
app.include_router(resources.router)


@app.get("/")
def root():
    return {"message": "Minerva Backend Running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def auto_import_subjects_csv():
    csv_path = Path(__file__).resolve().parents[1] / "data" / "subjects.csv"
    db = SessionLocal()
    try:
        result = import_subjects_csv(db, csv_path)
        if result.get("ok"):
            print(f"[CSV IMPORT] Imported subjects from {csv_path}")
            print(f"[CSV IMPORT] Stats: {result}")
        else:
            print(f"[CSV IMPORT] Skipped: {result.get('reason')}")
    except Exception as exc:
        print(f"[CSV IMPORT] Failed: {exc}")
    finally:
        db.close()
