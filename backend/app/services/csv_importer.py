import csv
from pathlib import Path
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.faculty_course_map import FacultyCourseMap
from app.models.room import Room


def _parse_hours(raw: str) -> int:
    try:
        return int(str(raw).strip())
    except Exception:
        return 3


def _split_sections(raw: str) -> list[str]:
    if raw is None:
        return []
    return [part.strip() for part in str(raw).split(",") if part.strip()]


def _import_subject_rows(db: Session, rows: Iterable[dict], source: str) -> dict:
    # Keep a dedicated import department so seeded data is grouped.
    department_name = "Auto Imported"
    department = db.query(Department).filter(Department.name == department_name).first()
    if not department:
        department = Department(name=department_name)
        db.add(department)
        db.flush()

    existing_faculty = {f.name.strip().lower(): f for f in db.query(Faculty).all() if f.name}
    existing_courses = {c.name.strip().lower(): c for c in db.query(Course).all() if c.name}
    existing_rooms = {r.name.strip().lower(): r for r in db.query(Room).all() if r.name}
    existing_mappings = {
        (m.faculty_id, m.course_id)
        for m in db.query(FacultyCourseMap).all()
    }

    stats = {
        "rows_processed": 0,
        "faculty_created": 0,
        "courses_created": 0,
        "courses_updated": 0,
        "rooms_created": 0,
        "faculty_course_mappings_created": 0,
    }

    for row in rows:
        stats["rows_processed"] += 1
        subject = (row.get("Subject") or "").strip()
        professor = (row.get("Professor") or "").strip()
        hours = _parse_hours(row.get("Hours") or "")
        sections = _split_sections(row.get("Sections") or "")

        if professor:
            key = professor.lower()
            if key not in existing_faculty:
                faculty = Faculty(name=professor, dept_id=department.id)
                db.add(faculty)
                db.flush()
                existing_faculty[key] = faculty
                stats["faculty_created"] += 1

        if subject:
            key = subject.lower()
            if key not in existing_courses:
                course = Course(
                    name=subject,
                    dept_id=department.id,
                    hours_per_week=hours,
                    is_lab=("lab" in subject.lower()),
                )
                db.add(course)
                db.flush()
                existing_courses[key] = course
                stats["courses_created"] += 1
            else:
                course = existing_courses[key]
                if (course.hours_per_week or 0) < hours:
                    course.hours_per_week = hours
                    stats["courses_updated"] += 1

        if professor and subject:
            f_obj = existing_faculty.get(professor.lower())
            c_obj = existing_courses.get(subject.lower())
            if f_obj and c_obj:
                key = (f_obj.id, c_obj.id)
                if key not in existing_mappings:
                    db.add(FacultyCourseMap(faculty_id=f_obj.id, course_id=c_obj.id))
                    existing_mappings.add(key)
                    stats["faculty_course_mappings_created"] += 1

        for sec in sections:
            key = sec.lower()
            if key not in existing_rooms:
                room = Room(name=sec, capacity=60, type="classroom")
                db.add(room)
                existing_rooms[key] = room
                stats["rooms_created"] += 1

    db.commit()
    return {"ok": True, "source": source, **stats}


def import_subjects_csv(db: Session, csv_path: Path) -> dict:
    if not csv_path.exists():
        return {"ok": False, "reason": f"CSV not found: {csv_path}"}
    with csv_path.open("r", encoding="utf-8-sig", newline="") as fp:
        return _import_subject_rows(db, csv.DictReader(fp), str(csv_path))


def import_subjects_csv_text(db: Session, text: str, source: str = "upload") -> dict:
    lines = text.splitlines()
    return _import_subject_rows(db, csv.DictReader(lines), source)
