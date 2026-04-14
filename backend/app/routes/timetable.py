from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import require_roles
from app.models.assignment import Assignment
from app.models.timetable_run import TimetableRun
from app.services.timetable_generator import generate_timetable, publish_timetable, validate_current_run

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.post("/generate")
def generate(semester_id: int | None = None, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head"))):
    return generate_timetable(db, semester_id=semester_id)


@router.post("/validate")
def validate(run_id: int | None = None, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return validate_current_run(db, run_id)


@router.post("/publish")
def publish(run_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head"))):
    return publish_timetable(db, run_id)


@router.get("/")
def get_timetable(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    assignments = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.course),
            joinedload(Assignment.faculty),
            joinedload(Assignment.room),
            joinedload(Assignment.timeslot),
        )
        .all()
    )
    return [
        {
            "course": a.course.name if a.course else None,
            "faculty": a.faculty.name if a.faculty else None,
            "room": a.room.name if a.room else None,
            "day": a.timeslot.day if a.timeslot else None,
            "time": a.timeslot.slot if a.timeslot else None,
        }
        for a in assignments
    ]


@router.get("/runs")
def list_runs(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    runs = db.query(TimetableRun).order_by(TimetableRun.id.desc()).all()
    return [
        {
            "id": r.id,
            "semester_id": r.semester_id,
            "version": r.version,
            "status": r.status,
            "created_at": r.created_at,
            "published_at": r.published_at,
        }
        for r in runs
    ]
