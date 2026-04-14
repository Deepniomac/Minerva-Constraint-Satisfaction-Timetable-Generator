from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models.course import Course
from app.models.department import Department

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("/")
def create_course(
    name: str,
    dept_id: int,
    hours_per_week: int = 3,
    is_lab: bool = False,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    course = Course(name=name, dept_id=dept_id, hours_per_week=hours_per_week, is_lab=is_lab)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/")
def list_courses(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(Course).all()


@router.get("/{course_id}")
def get_course(course_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}")
def update_course(
    course_id: int,
    name: str | None = None,
    dept_id: int | None = None,
    hours_per_week: int | None = None,
    is_lab: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if name:
        course.name = name
    if dept_id is not None:
        department = db.query(Department).filter(Department.id == dept_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        course.dept_id = dept_id
    if hours_per_week is not None:
        course.hours_per_week = hours_per_week
    if is_lab is not None:
        course.is_lab = is_lab
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}
