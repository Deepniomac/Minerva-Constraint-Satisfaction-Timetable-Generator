from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models.department import Department
from app.models.faculty import Faculty

router = APIRouter(prefix="/faculty", tags=["faculty"])


@router.post("/")
def create_faculty(name: str, dept_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head"))):
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    faculty = Faculty(name=name, dept_id=dept_id)
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return faculty


@router.get("/")
def list_faculty(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(Faculty).all()


@router.get("/{faculty_id}")
def get_faculty(faculty_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return faculty


@router.put("/{faculty_id}")
def update_faculty(
    faculty_id: int,
    name: str | None = None,
    dept_id: int | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    if name:
        faculty.name = name
    if dept_id is not None:
        department = db.query(Department).filter(Department.id == dept_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        faculty.dept_id = dept_id
    db.commit()
    db.refresh(faculty)
    return faculty


@router.delete("/{faculty_id}")
def delete_faculty(faculty_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    db.delete(faculty)
    db.commit()
    return {"message": "Faculty deleted"}
