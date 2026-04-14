# Minerva Project From Scratch (Interview Notes)

## 1) Problem Statement

Minerva automates timetable setup for institutions by replacing manual spreadsheet scheduling with API-driven resource management and timetable generation.

## 2) Target Architecture

- `backend` (FastAPI + SQLAlchemy + SQLite/Postgres)
- `frontend` (React app for role-aware operations)
- JWT authentication with role payload
- Modular entity routes for timetable master data

## 3) Phase 1 Goals (Foundation)

- Role-based authentication (Admin, Department Head, Faculty, Student)
- Core data models and CRUD for:
  - Departments
  - Faculty
  - Courses
  - Rooms
  - TimeSlots
  - Semesters
- Protected timetable generate/list endpoints
- Minimal frontend admin console for auth + seed actions

## 4) What Was Implemented

### Backend

- Added role column to `User`
- Added `Semester` model
- Added `require_roles(...)` authorization dependency
- Added/updated routes:
  - `/register`, `/login`
  - `/departments/*`
  - `/faculty/*`
  - `/courses/*`
  - `/rooms/*`
  - `/timeslots/*`
  - `/semesters/*`
  - `/timetable/generate`, `/timetable/`
- Added startup schema patch for existing DBs missing `users.role`

### Frontend

- Built a minimal Phase 1 console:
  - Login + store JWT and role
  - Role-aware admin/dept-head actions
  - Basic create department/faculty actions
  - Trigger timetable generation
  - Display API response payload

## 5) API Role Matrix

- `admin`
  - full CRUD on all Phase 1 entities
  - timetable debug/generate/list
- `department_head`
  - create/update/list most academic entities
  - timetable generate/list
- `faculty`
  - read-only entity access + timetable list
- `student`
  - read-only entity access + timetable list

## 6) How To Run

### Backend

1. `cd backend`
2. `python -m venv .venv`
3. Activate venv
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm start`

## 7) Demo Flow (Interview)

1. Register an admin user: `POST /register?username=admin&password=admin123&role=admin`
2. Login and copy token
3. Create Department
4. Create Faculty (linked to department)
5. Create Course/Room/Timeslot/Semester from APIs
6. Generate timetable
7. Open frontend and show role-aware controls

## 8) Known Gaps (Next Phases)

- Real CSP solver (current generator is draft/simple)
- Conflict detection engine
- Drag-and-drop timetable editor
- Utilization analytics dashboards
- Export/reporting, notifications, audit trail
- Semester-aware timetable versioning and publish workflow
