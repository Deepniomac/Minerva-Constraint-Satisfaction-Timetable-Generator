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

Optional: seed quick demo data (departments/faculty/courses/rooms/sections/timeslots/semester):

```bash
python scripts/seed_demo.py
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
   - `POST /sections`
   - `POST /timeslots` (multiple)

Alternative via frontend:

- Open frontend and use **Create Account** box to create:
  - `admin` / `department_head` / `faculty` / `student`
- Login from **Sign In** box and proceed role-wise.

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

## 7) Resource Hub Check

- Publish public academic resource (faculty/admin):
  - `POST /resources/public`
- Read public resources (student/faculty/admin):
  - `GET /resources/`
- Confidential resource (admin/manual only):
  - `POST /resources/confidential`

## 8) Common Troubleshooting

- **401/403 errors**
  - re-login and re-authorize token
  - ensure role is `admin` or `department_head` for protected actions
- **500 errors on startup**
  - verify `pip install -r requirements.txt` ran in active venv
- **Frontend cannot call backend**
  - ensure backend runs on `127.0.0.1:8000`
  - check `CORS_ALLOW_ORIGINS` in `.env`
- **Generate shows missing/undefined run/version**
  - ensure at least one active semester exists
  - ensure rooms and timeslots are seeded
  - frontend now shows explicit generate failure messages when prerequisites are missing

## 9) Chatbot Safe Usage Flow

In Minerva chat:

1. Type command text and click **Preview**
2. Review parsed actions and blocked items
3. Click **Apply Preview** to commit DB changes

Example:

```text
add section CSE-A dept CSE;
add faculty Dr Rao dept CSE;
map faculty Dr Rao to Data Structures
```

## 10) Run Unit Tests

```bash
cd ..
set PYTHONPATH=backend
python -m pytest backend/tests
```

## 11) Clean Demo Reset (Optional)

If you want to present from absolute scratch, clear all runtime data before demo:

```bash
cd backend
python - <<'PY'
import app.main
from app.database import SessionLocal
from app.models.assignment import Assignment
from app.models.timetable_run import TimetableRun
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.preference import Preference
from app.models.faculty_course_map import FacultyCourseMap
from app.models.faculty import Faculty
from app.models.course import Course
from app.models.room import Room
from app.models.section import Section
from app.models.timeslot import TimeSlot
from app.models.semester import Semester
from app.models.department import Department
from app.models.user import User
from app.models.resource import Resource

db = SessionLocal()
for model in [Assignment, TimetableRun, Notification, AuditLog, Preference, FacultyCourseMap, Resource, Faculty, Course, Room, Section, TimeSlot, Semester, Department, User]:
    db.query(model).delete()
db.commit()
db.close()
print("All runtime data cleared.")
PY
```
