# Run Minerva From Scratch

This document explains how to run the full project end-to-end on a new machine.

## 1) Clone Project

```bash
git clone https://github.com/Deepniomac/Minerva-Constraint-Satisfaction-Timetable-Generator.git
cd Minerva-Constraint-Satisfaction-Timetable-Generator
```

## 2) Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate virtual environment:

- Windows PowerShell:
```bash
. .venv/Scripts/Activate.ps1
```

- macOS/Linux:
```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create environment file:

```bash
copy .env.example .env
```

Run backend:

```bash
python -m uvicorn app.main:app --reload
```

Backend URLs:
- API root: `http://127.0.0.1:8000/`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

## 3) Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

Frontend URL:
- `http://localhost:3000`

## 4) First-Time Data Setup (Swagger)

Open Swagger (`/docs`) and run in order:

1. `POST /register`
   - `username=admin1`
   - `password=admin123`
   - `role=admin`
2. `POST /login`
   - copy `access_token`
3. Click **Authorize** and use:
   - `Bearer <token>`
4. Create base data:
   - `POST /semesters` with `is_active=true`
   - `POST /departments`
   - `POST /faculty`
   - `POST /courses`
   - `POST /rooms`
   - `POST /timeslots` (multiple)

## 5) Timetable Workflow

1. `POST /timetable/generate`
2. `GET /timetable/runs`
3. `POST /timetable/validate?run_id=<id>`
4. `GET /timetable/?run_id=<id>`
5. Optional manual edit:
   - `POST /timetable/override`
6. Publish:
   - `POST /timetable/publish?run_id=<id>`

## 6) Phase 4 Features Check

- Notifications:
  - `GET /notifications/`
- Audit logs:
  - `GET /audit/`
- Reports:
  - `GET /reports/run-summary?run_id=<id>`
  - `GET /reports/run-export.csv?run_id=<id>`

## 7) Common Troubleshooting

- **401/403 errors**
  - re-login and re-authorize token
  - ensure role is `admin` or `department_head` for protected actions
- **500 errors on startup**
  - verify `pip install -r requirements.txt` ran in active venv
- **Frontend cannot call backend**
  - ensure backend runs on `127.0.0.1:8000`
  - check `CORS_ALLOW_ORIGINS` in `.env`
