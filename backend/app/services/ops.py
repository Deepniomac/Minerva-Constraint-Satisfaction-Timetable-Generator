from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.notification import Notification


def write_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor_username: str | None = None,
    actor_role: str | None = None,
    meta: dict | None = None,
):
    log = AuditLog(
        actor_username=actor_username,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        meta=meta or {},
    )
    db.add(log)


def notify(
    db: Session,
    title: str,
    message: str,
    kind: str = "info",
    username: str | None = None,
):
    item = Notification(username=username, kind=kind, title=title, message=message)
    db.add(item)
