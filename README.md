# Minerva Constraint Satisfaction Timetable Generator

Phase 1 foundation for a timetable automation platform aligned to the PRD.

## Repository Structure

- `backend` - FastAPI + SQLAlchemy APIs
- `frontend` - React Phase 1 console
- `docs` - interview and implementation records

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

## Documentation

- `docs/PROJECT_FROM_SCRATCH.md`
- `docs/PHASE1_CHANGELOG.md`