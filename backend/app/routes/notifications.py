from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
def list_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    username = current_user.get("username")
    items = (
        db.query(Notification)
        .filter(or_(Notification.username.is_(None), Notification.username == username))
        .order_by(Notification.id.desc())
        .all()
    )
    return items


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    username = current_user.get("username")
    item = db.query(Notification).filter(Notification.id == notification_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    if item.username and item.username != username:
        raise HTTPException(status_code=403, detail="Cannot update this notification")
    item.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/broadcast")
def broadcast(
    title: str,
    message: str,
    kind: str = "info",
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    item = Notification(username=None, kind=kind, title=title, message=message)
    db.add(item)
    db.commit()
    return {"message": "Broadcast sent", "id": item.id}
