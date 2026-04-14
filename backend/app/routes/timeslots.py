from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models.timeslot import TimeSlot

router = APIRouter(prefix="/timeslots", tags=["timeslots"])


@router.post("/")
def create_timeslot(day: str, slot: str, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head"))):
    existing = db.query(TimeSlot).filter(TimeSlot.day == day, TimeSlot.slot == slot).first()
    if existing:
        raise HTTPException(status_code=400, detail="Timeslot already exists")
    timeslot = TimeSlot(day=day, slot=slot)
    db.add(timeslot)
    db.commit()
    db.refresh(timeslot)
    return timeslot


@router.get("/")
def list_timeslots(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(TimeSlot).all()


@router.get("/{timeslot_id}")
def get_timeslot(timeslot_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    timeslot = db.query(TimeSlot).filter(TimeSlot.id == timeslot_id).first()
    if not timeslot:
        raise HTTPException(status_code=404, detail="Timeslot not found")
    return timeslot


@router.put("/{timeslot_id}")
def update_timeslot(
    timeslot_id: int,
    day: str | None = None,
    slot: str | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    timeslot = db.query(TimeSlot).filter(TimeSlot.id == timeslot_id).first()
    if not timeslot:
        raise HTTPException(status_code=404, detail="Timeslot not found")
    if day:
        timeslot.day = day
    if slot:
        timeslot.slot = slot
    db.commit()
    db.refresh(timeslot)
    return timeslot


@router.delete("/{timeslot_id}")
def delete_timeslot(timeslot_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    timeslot = db.query(TimeSlot).filter(TimeSlot.id == timeslot_id).first()
    if not timeslot:
        raise HTTPException(status_code=404, detail="Timeslot not found")
    db.delete(timeslot)
    db.commit()
    return {"message": "Timeslot deleted"}
