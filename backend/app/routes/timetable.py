from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import require_roles
from app.models.assignment import Assignment
from app.services.timetable_generator import generate_timetable

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.post("/generate")
def generate(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head"))):
    return generate_timetable(db)


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
