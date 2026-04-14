# Minerva Constraint Satisfaction Timetable Generator

Phase 1 and Phase 2 foundation for a timetable automation platform aligned to the PRD.

## Repository Structure

- `backend` - FastAPI + SQLAlchemy APIs
- `frontend` - React Phase 1 console
- `docs` - project documentation and implementation records

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
# activate venv (Windows)
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Core Phase 1 Endpoints

- `POST /register`
- `POST /login`
- `CRUD /departments`
- `CRUD /faculty`
- `CRUD /courses`
- `CRUD /rooms`
- `CRUD /timeslots`
- `CRUD /semesters`
- `POST /timetable/generate`
- `GET /timetable/`

## Phase 2 Endpoints

- `POST /timetable/validate`
- `POST /timetable/publish`
- `GET /timetable/runs`

## Phase 2 Highlights

- Constraint-aware draft generation with hard conflict prevention rules
- Validation endpoint for run-level conflict checks before publish
- Timetable run lifecycle with `draft/published` status, `version`, and `semester_id`

## Phase 3 Highlights

- Calendar-style timetable view in frontend
- Manual override endpoint for moving assignments between timeslots
- Conflict-highlighted cells driven by validation output
- Run-specific timetable loading for draft review and edit workflows

## Documentation

- `docs/PROJECT_FROM_SCRATCH.md`
- `docs/PHASE1_CHANGELOG.md`