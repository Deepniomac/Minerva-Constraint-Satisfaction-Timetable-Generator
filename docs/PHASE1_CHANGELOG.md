# Phase 1 Changelog

## Date

2026-04-14

## Summary

Implemented foundational backend and frontend scaffolding for PRD Phase 1:

- Role-aware auth and guards
- Semester model and CRUD
- CRUD routes for core academic entities
- Timetable endpoints protected by role
- Basic frontend management console

## Backend Files Added

- `backend/app/main.py`
- `backend/app/database.py`
- `backend/app/auth.py`
- `backend/app/dependencies.py`
- `backend/app/models/*.py`
- `backend/app/routes/*.py`
- `backend/app/services/timetable_generator.py`
- `backend/requirements.txt`

## Frontend Files Added

- `frontend/package.json`
- `frontend/public/index.html`
- `frontend/src/index.js`
- `frontend/src/App.js`

## Docs Added

- `docs/PROJECT_FROM_SCRATCH.md`
- `docs/PHASE1_CHANGELOG.md`

---

# Phase 2 Changelog

## Date

2026-04-14

## Summary

Implemented scheduling engine upgrades and run lifecycle controls:

- Constraint-aware timetable generation (hard constraints)
- Pre-publish validation endpoint
- Run-level lifecycle management (draft/published)
- Versioning per semester
- Frontend controls for generate/validate/publish/list runs

## Backend Updates

- Added model: `backend/app/models/timetable_run.py`
- Updated model: `backend/app/models/assignment.py` (`semester_id`, `run_id`)
- Updated service: `backend/app/services/timetable_generator.py`
  - `generate_timetable(...)`
  - `validate_current_run(...)`
  - `publish_timetable(...)`
- Updated route: `backend/app/routes/timetable.py`
  - `POST /timetable/validate`
  - `POST /timetable/publish`
  - `GET /timetable/runs`
- Updated startup schema updates in `backend/app/main.py`

## Frontend Updates

- Updated `frontend/src/App.js` to support:
  - Semester-aware generation
  - Run validation
  - Run publishing
  - Run listing

---

# Phase 3 Changelog

## Date

2026-04-14

## Summary

Implemented timetable review/edit UI and manual override flow:

- Calendar-style timetable grid in frontend
- Override API for assignment timeslot changes
- Conflict-highlighted UI cells using validation results
- Run-scoped timetable loading

## Backend Updates

- Updated `backend/app/routes/timetable.py`:
  - `GET /timetable/?run_id=<id>` (run-scoped list)
  - `GET /timetable/timeslots`
  - `POST /timetable/override`
- Updated `backend/app/services/timetable_generator.py`:
  - `override_assignment(...)` with hard constraint checks

## Frontend Updates

- Updated `frontend/src/App.js`:
  - Calendar grid (day x slot)
  - Override controls (select assignment + target timeslot)
  - Conflict summary panel and cell-level highlighting
