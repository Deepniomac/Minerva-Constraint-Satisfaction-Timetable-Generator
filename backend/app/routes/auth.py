from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.auth import create_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User

router = APIRouter(tags=["auth"])
VALID_ROLES = {"admin", "department_head", "faculty", "student"}


@router.post("/register")
def register(username: str, password: str, role: str = "student", db: Session = Depends(get_db)):
    normalized_role = role.strip().lower()
    if normalized_role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=username, password=hash_password(password), role=normalized_role)
    db.add(user)
    db.commit()
    return {"message": "User registered", "role": normalized_role}


@router.post("/login")
def login(username: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": username, "role": user.role})
    return {"access_token": token, "role": user.role, "username": user.username}
