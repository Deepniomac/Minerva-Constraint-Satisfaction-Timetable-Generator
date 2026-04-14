from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/")
def list_audit(limit: int = 100, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head"))):
    limit = max(1, min(limit, 500))
    items = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    return items
