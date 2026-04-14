from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from app.config import JWT_ALGORITHM, JWT_SECRET_KEY

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return {"username": payload["sub"], "role": payload.get("role", "student")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_roles(*allowed_roles: str):
    allowed = set(allowed_roles)

    def role_dependency(current_user=Depends(get_current_user)):
        role = current_user.get("role", "student")
        if role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return role_dependency
