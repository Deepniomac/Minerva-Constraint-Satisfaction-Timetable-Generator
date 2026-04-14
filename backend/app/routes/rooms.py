from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models.room import Room

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("/")
def create_room(
    name: str,
    capacity: int,
    type: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    room = Room(name=name, capacity=capacity, type=type)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.get("/")
def list_rooms(db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    return db.query(Room).all()


@router.get("/{room_id}")
def get_room(room_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty", "student"))):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.put("/{room_id}")
def update_room(
    room_id: int,
    name: str | None = None,
    capacity: int | None = None,
    type: str | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if name:
        room.name = name
    if capacity is not None:
        room.capacity = capacity
    if type:
        room.type = type
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return {"message": "Room deleted"}
