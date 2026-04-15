from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.services.minerva_chatbot import process_minerva_prompt

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class MinervaPrompt(BaseModel):
    message: str
    apply: bool = True


@router.post("/minerva")
def minerva_chat(payload: MinervaPrompt, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "department_head", "faculty"))):
    result = process_minerva_prompt(db, payload.message, apply=payload.apply)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unable to process prompt"))
    return result
