from collections import defaultdict
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.course import Course
from app.models.faculty import Faculty
from app.models.room import Room
from app.models.semester import Semester
from app.models.timetable_run import TimetableRun
from app.models.timeslot import TimeSlot


def validate_assignments(assignments: list[Assignment], timeslot_lookup: dict[int, TimeSlot]):
    conflicts = []
    faculty_slot = set()
    room_slot = set()
    course_slot = set()
    for a in assignments:
        ts = timeslot_lookup.get(a.timeslot_id)
        slot_key = (ts.day if ts else None, ts.slot if ts else None)
        f_key = (a.faculty_id, *slot_key)
        r_key = (a.room_id, *slot_key)
        c_key = (a.course_id, *slot_key)
        if f_key in faculty_slot:
            conflicts.append({"type": "faculty_overlap", "faculty_id": a.faculty_id, "day": slot_key[0], "slot": slot_key[1]})
        if r_key in room_slot:
            conflicts.append({"type": "room_overlap", "room_id": a.room_id, "day": slot_key[0], "slot": slot_key[1]})
        if c_key in course_slot:
            conflicts.append({"type": "course_duplicate", "course_id": a.course_id, "day": slot_key[0], "slot": slot_key[1]})
        faculty_slot.add(f_key)
        room_slot.add(r_key)
        course_slot.add(c_key)
    return {"is_valid": len(conflicts) == 0, "conflicts": conflicts}


def validate_current_run(db: Session, run_id: int | None = None):
    query = db.query(Assignment)
    if run_id is not None:
        query = query.filter(Assignment.run_id == run_id)
    assignments = query.all()
    timeslots = db.query(TimeSlot).all()
    validation = validate_assignments(assignments, {t.id: t for t in timeslots})
    validation["assignment_count"] = len(assignments)
    validation["run_id"] = run_id
    return validation


def generate_timetable(db: Session, semester_id: int | None = None):
    courses = db.query(Course).all()
    faculty_list = db.query(Faculty).all()
    rooms = db.query(Room).all()
    timeslots = db.query(TimeSlot).all()
    if not courses or not faculty_list or not rooms or not timeslots:
        return {"error": "Seed departments/courses/faculty/rooms/timeslots first"}

    semester = None
    if semester_id is not None:
        semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if semester is None:
        semester = db.query(Semester).filter(Semester.is_active == True).first()  # noqa: E712
    if semester is None:
        return {"error": "No active semester found. Create/activate a semester first."}

    latest_version = db.query(func.max(TimetableRun.version)).filter(TimetableRun.semester_id == semester.id).scalar() or 0
    run = TimetableRun(semester_id=semester.id, version=latest_version + 1, status="draft")
    db.add(run)
    db.flush()

    faculty_slots = set()
    room_slots = set()
    course_slots = set()
    faculty_ids = [f.id for f in faculty_list]
    room_ids = [r.id for r in rooms]
    faculty_by_dept = defaultdict(list)
    for f in faculty_list:
        faculty_by_dept[f.dept_id].append(f.id)
    room_by_type = defaultdict(list)
    for r in rooms:
        room_by_type[(r.type or "").strip().lower()].append(r.id)

    created = 0
    unscheduled_courses = []
    for course in courses:
        preferred_faculty = faculty_by_dept.get(course.dept_id) or faculty_ids
        preferred_rooms = room_by_type.get("lab" if course.is_lab else "classroom") or room_ids
        placed = False
        for ts in timeslots:
            slot_key = (ts.day, ts.slot)
            if (course.id, *slot_key) in course_slots:
                continue
            faculty_id = next((fid for fid in preferred_faculty if (fid, *slot_key) not in faculty_slots), None)
            room_id = next((rid for rid in preferred_rooms if (rid, *slot_key) not in room_slots), None)
            if faculty_id is None or room_id is None:
                continue
            db.add(
                Assignment(
                    course_id=course.id,
                    faculty_id=faculty_id,
                    room_id=room_id,
                    timeslot_id=ts.id,
                    semester_id=semester.id,
                    run_id=run.id,
                )
            )
            faculty_slots.add((faculty_id, *slot_key))
            room_slots.add((room_id, *slot_key))
            course_slots.add((course.id, *slot_key))
            created += 1
            placed = True
            break
        if not placed:
            unscheduled_courses.append(course.name)

    db.commit()
    validation = validate_current_run(db, run.id)
    return {
        "message": "Draft timetable generated" if not unscheduled_courses else "Draft timetable generated with unscheduled courses",
        "run_id": run.id,
        "semester_id": semester.id,
        "version": run.version,
        "status": run.status,
        "total_assignments": created,
        "unscheduled_courses": unscheduled_courses,
        "validation": validation,
    }


def publish_timetable(db: Session, run_id: int):
    run = db.query(TimetableRun).filter(TimetableRun.id == run_id).first()
    if not run:
        return {"error": "Run not found"}
    validation = validate_current_run(db, run_id)
    if not validation["is_valid"]:
        return {"error": "Run has conflicts", "validation": validation}
    run.status = "published"
    run.published_at = func.now()
    db.commit()
    return {"message": "Timetable published", "run_id": run_id, "status": run.status}
