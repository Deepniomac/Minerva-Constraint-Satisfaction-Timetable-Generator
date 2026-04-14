from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models.semester import Semester

router = APIRouter(prefix="/semesters", tags=["semesters"])


@router.post("/")
def create_semester(
    name: str,
    start_date: str,
    end_date: str,
    is_active: bool = False,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
):
    existing = db.query(Semester).filter(Semester.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Semester already exists")
    if is_active:
        db.query(Semester).update({"is_active": False})
    semester = Semester(name=name, start_date=start_date, end_date=end_date, is_active=is_active)
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


@router.get("/")
def list_semesters(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(Semester).all()


@router.get("/{semester_id}")
def get_semester(semester_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    return semester


@router.put("/{semester_id}")
def update_semester(
    semester_id: int,
    name: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
):
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    if name:
        semester.name = name
    if start_date:
        semester.start_date = start_date
    if end_date:
        semester.end_date = end_date
    if is_active is not None:
        if is_active:
            db.query(Semester).update({"is_active": False})
        semester.is_active = is_active
    db.commit()
    db.refresh(semester)
    return semester


@router.delete("/{semester_id}")
def delete_semester(semester_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    db.delete(semester)
    db.commit()
    return {"message": "Semester deleted"}
