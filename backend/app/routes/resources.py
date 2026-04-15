from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models.resource import Resource

router = APIRouter(prefix="/resources", tags=["resources"])


class ResourceCreate(BaseModel):
    title: str
    content: str
    category: str = "general"


class ResourceCreateConfidential(BaseModel):
    title: str
    content: str
    category: str = "confidential"
    is_confidential: bool = True


@router.post("/public")
def create_public_resource(
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "department_head", "faculty")),
):
    item = Resource(
        title=payload.title.strip(),
        content=payload.content.strip(),
        category=(payload.category or "general").strip().lower(),
        uploaded_by_username=current_user.get("username"),
        uploaded_by_role=current_user.get("role"),
        is_confidential=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/confidential")
def create_confidential_resource_manual(
    payload: ResourceCreateConfidential,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    # Intended for backend/manual operator workflows.
    item = Resource(
        title=payload.title.strip(),
        content=payload.content.strip(),
        category=(payload.category or "confidential").strip().lower(),
        uploaded_by_username=current_user.get("username"),
        uploaded_by_role=current_user.get("role"),
        is_confidential=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/")
def list_public_resources(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head", "faculty", "student")),
):
    return (
        db.query(Resource)
        .filter(Resource.is_confidential == False)  # noqa: E712
        .order_by(Resource.created_at.desc())
        .all()
    )


@router.get("/internal")
def list_all_resources_internal(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    return db.query(Resource).order_by(Resource.created_at.desc()).all()
