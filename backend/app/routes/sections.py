from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models.assignment import Assignment
from app.models.section import Section

router = APIRouter(prefix="/sections", tags=["sections"])


@router.post("/")
def create_section(
    name: str,
    dept_id: int | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    existing = db.query(Section).filter(Section.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Section already exists")
    section = Section(name=name, dept_id=dept_id)
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.get("/")
def list_sections(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(Section).all()


@router.put("/{section_id}")
def update_section(
    section_id: int,
    name: str | None = None,
    dept_id: int | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if name:
        section.name = name
    if dept_id is not None:
        section.dept_id = dept_id
    db.commit()
    db.refresh(section)
    return section


@router.delete("/{section_id}")
def delete_section(section_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    usage = db.query(Assignment).filter(Assignment.section_id == section.id).count()
    if usage > 0:
        raise HTTPException(status_code=400, detail=f"Section is used in assignments ({usage})")
    db.delete(section)
    db.commit()
    return {"message": "Section deleted"}
