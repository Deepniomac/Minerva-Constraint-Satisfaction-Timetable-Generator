import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import require_roles
from app.models.assignment import Assignment
from app.models.timetable_run import TimetableRun

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/run-summary")
def run_summary(run_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    run = db.query(TimetableRun).filter(TimetableRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    assignments = db.query(Assignment).filter(Assignment.run_id == run_id).all()
    return {
        "run_id": run.id,
        "semester_id": run.semester_id,
        "version": run.version,
        "status": run.status,
        "total_assignments": len(assignments),
    }


@router.get("/run-export.csv")
def export_run_csv(run_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    assignments = (
        db.query(Assignment)
        .filter(Assignment.run_id == run_id)
        .options(
            joinedload(Assignment.course),
            joinedload(Assignment.faculty),
            joinedload(Assignment.room),
            joinedload(Assignment.timeslot),
        )
        .all()
    )
    if not assignments:
        raise HTTPException(status_code=404, detail="No assignments for run")

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["assignment_id", "run_id", "course", "faculty", "room", "day", "slot"])
    for a in assignments:
        writer.writerow(
            [
                a.id,
                a.run_id,
                a.course.name if a.course else "",
                a.faculty.name if a.faculty else "",
                a.room.name if a.room else "",
                a.timeslot.day if a.timeslot else "",
                a.timeslot.slot if a.timeslot else "",
            ]
        )
    output.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="timetable_run_{run_id}.csv"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
