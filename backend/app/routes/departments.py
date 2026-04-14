from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models.department import Department

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("/")
def create_department(name: str, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    existing = db.query(Department).filter(Department.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")
    department = Department(name=name)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.get("/")
def list_departments(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(Department).all()


@router.get("/{department_id}")
def get_department(department_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.put("/{department_id}")
def update_department(department_id: int, name: str, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    department.name = name
    db.commit()
    db.refresh(department)
    return department


@router.delete("/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(department)
    db.commit()
    return {"message": "Department deleted"}
