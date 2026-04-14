from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine
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

from app.routes import auth, departments, faculty, courses, rooms, timeslots, semesters, timetable, notifications, audit, reports

app = FastAPI(title="Minerva Timetable API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/")
def root():
    return {"message": "Minerva Backend Running"}
