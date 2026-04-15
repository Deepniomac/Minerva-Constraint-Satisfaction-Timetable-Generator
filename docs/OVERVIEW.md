# Minerva Overview

Minerva is a role-aware timetable automation platform for academic institutions.

## Core Value

- Replaces manual spreadsheet scheduling with constrained timetable generation
- Supports both automatic generation and manual drag-and-drop edits
- Enforces hard conflicts across faculty, room, course, and section slot overlap
- Tracks lifecycle from draft runs to published schedules

## Roles

- Admin / Department Head:
  - master data management
  - run generation, validation, publish, overrides
  - audit visibility and operational controls
- Faculty:
  - run operations and manual scheduling workflows
  - no admin master-data actions
- Student:
  - view-focused controls for timetable, summary, and notifications

## Minerva Chatbot

- Accepts raw command-style input for entity creation/update/delete
- Includes safe preview mode before commit:
  - Preview: parse + simulate
  - Apply Preview: commit changes

## Final Additions

- Role-locked top navigation
- Home dashboard cards for quick system status
- Section entity and section-aware hard conflict detection
- Backend seed script and validation unit tests
