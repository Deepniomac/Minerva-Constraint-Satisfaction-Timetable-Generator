from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.services.csv_importer import import_subjects_csv_text

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/subjects-csv")
async def import_subjects_csv_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "department_head")),
):
    filename = file.filename or "subjects.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to decode CSV as UTF-8")
    if not text.strip():
        raise HTTPException(status_code=400, detail="CSV is empty")

    result = import_subjects_csv_text(db, text, source=f"upload:{filename}")
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("reason", "Import failed"))
    return result
