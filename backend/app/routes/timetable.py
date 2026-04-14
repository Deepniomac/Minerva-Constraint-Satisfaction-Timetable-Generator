from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import require_roles
from app.models.assignment import Assignment
from app.models.timeslot import TimeSlot
from app.models.timetable_run import TimetableRun
from app.services.ops import notify, write_audit
from app.services.timetable_generator import generate_timetable, override_assignment, publish_timetable, validate_current_run

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.post("/generate")
def generate(semester_id: int | None = None, db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "department_head"))):
    result = generate_timetable(db, semester_id=semester_id)
    if "run_id" in result:
        write_audit(
            db,
            action="timetable_generate",
            entity_type="timetable_run",
            entity_id=str(result["run_id"]),
            actor_username=current_user.get("username"),
            actor_role=current_user.get("role"),
            meta={"semester_id": result.get("semester_id"), "version": result.get("version")},
        )
        notify(
            db,
            title="Timetable draft generated",
            message=f'Run #{result["run_id"]} generated (v{result.get("version")}).',
            kind="success",
        )
        db.commit()
    return result


@router.post("/validate")
def validate(run_id: int | None = None, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return validate_current_run(db, run_id)


@router.post("/publish")
def publish(run_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "department_head"))):
    result = publish_timetable(db, run_id)
    if not result.get("error"):
        write_audit(
            db,
            action="timetable_publish",
            entity_type="timetable_run",
            entity_id=str(run_id),
            actor_username=current_user.get("username"),
            actor_role=current_user.get("role"),
            meta={"status": result.get("status")},
        )
        notify(
            db,
            title="Timetable published",
            message=f"Run #{run_id} is now published.",
            kind="success",
        )
        db.commit()
    return result


@router.get("/")
def get_timetable(
    run_id: int | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head", "faculty", "student")),
):
    query = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.course),
            joinedload(Assignment.faculty),
            joinedload(Assignment.room),
            joinedload(Assignment.timeslot),
        )
    )
    if run_id is not None:
        query = query.filter(Assignment.run_id == run_id)
    assignments = query.all()
    return [
        {
            "assignment_id": a.id,
            "run_id": a.run_id,
            "timeslot_id": a.timeslot_id,
            "room_id": a.room_id,
            "faculty_id": a.faculty_id,
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


@router.get("/timeslots")
def list_timeslots(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(TimeSlot).order_by(TimeSlot.day, TimeSlot.slot).all()


@router.post("/override")
def override_entry(
    assignment_id: int,
    timeslot_id: int,
    room_id: int | None = None,
    faculty_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "department_head")),
):
    result = override_assignment(
        db,
        assignment_id=assignment_id,
        timeslot_id=timeslot_id,
        room_id=room_id,
        faculty_id=faculty_id,
    )
    if not result.get("error"):
        write_audit(
            db,
            action="timetable_override",
            entity_type="assignment",
            entity_id=str(assignment_id),
            actor_username=current_user.get("username"),
            actor_role=current_user.get("role"),
            meta={"timeslot_id": timeslot_id, "room_id": room_id, "faculty_id": faculty_id},
        )
        notify(
            db,
            title="Timetable entry updated",
            message=f"Assignment #{assignment_id} was manually updated.",
            kind="info",
        )
        db.commit()
    return result
