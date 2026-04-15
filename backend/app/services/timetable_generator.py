from collections import defaultdict
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.course import Course
from app.models.faculty import Faculty
from app.models.faculty_course_map import FacultyCourseMap
from app.models.room import Room
from app.models.section import Section
from app.models.semester import Semester
from app.models.timetable_run import TimetableRun
from app.models.timeslot import TimeSlot


def validate_assignments(assignments: list[Assignment], timeslot_lookup: dict[int, TimeSlot]):
    conflicts = []
    faculty_slot = set()
    room_slot = set()
    section_slot = set()
    course_slot = set()
    for a in assignments:
        ts = timeslot_lookup.get(a.timeslot_id)
        slot_key = (ts.day if ts else None, ts.slot if ts else None)
        f_key = (a.faculty_id, *slot_key)
        r_key = (a.room_id, *slot_key)
        c_key = (a.course_id, *slot_key)
        s_key = (a.section_id, *slot_key) if a.section_id is not None else None
        if f_key in faculty_slot:
            conflicts.append({"type": "faculty_overlap", "faculty_id": a.faculty_id, "day": slot_key[0], "slot": slot_key[1]})
        if r_key in room_slot:
            conflicts.append({"type": "room_overlap", "room_id": a.room_id, "day": slot_key[0], "slot": slot_key[1]})
        if c_key in course_slot:
            conflicts.append({"type": "course_duplicate", "course_id": a.course_id, "day": slot_key[0], "slot": slot_key[1]})
        if s_key is not None and s_key in section_slot:
            conflicts.append({"type": "section_overlap", "section_id": a.section_id, "day": slot_key[0], "slot": slot_key[1]})
        faculty_slot.add(f_key)
        room_slot.add(r_key)
        course_slot.add(c_key)
        if s_key is not None:
            section_slot.add(s_key)
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
    sections = db.query(Section).all()
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
    section_ids = [s.id for s in sections]
    section_by_dept = defaultdict(list)
    for s in sections:
        section_by_dept[s.dept_id].append(s.id)
    faculty_by_dept = defaultdict(list)
    for f in faculty_list:
        faculty_by_dept[f.dept_id].append(f.id)
    faculty_by_course = defaultdict(list)
    for m in db.query(FacultyCourseMap).all():
        faculty_by_course[m.course_id].append(m.faculty_id)
    room_by_type = defaultdict(list)
    for r in rooms:
        room_by_type[(r.type or "").strip().lower()].append(r.id)

    created = 0
    unscheduled_courses = []
    for course in courses:
        # If explicit faculty-course mapping exists, use it first.
        # This naturally allows one faculty to teach multiple subjects.
        preferred_faculty = faculty_by_course.get(course.id) or faculty_by_dept.get(course.dept_id) or faculty_ids
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
                    section_id=(section_by_dept.get(course.dept_id) or section_ids or [None])[0],
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


def create_manual_run(db: Session, semester_id: int | None = None):
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
    db.commit()
    return {
        "message": "Manual timetable draft run created",
        "run_id": run.id,
        "semester_id": semester.id,
        "version": run.version,
        "status": run.status,
    }


def create_manual_assignment(
    db: Session,
    run_id: int,
    course_id: int,
    faculty_id: int,
    room_id: int,
    section_id: int | None,
    timeslot_id: int,
):
    run = db.query(TimetableRun).filter(TimetableRun.id == run_id).first()
    if not run:
        return {"error": "Run not found"}
    if run.status != "draft":
        return {"error": "Only draft runs can be edited manually"}
    target_timeslot = db.query(TimeSlot).filter(TimeSlot.id == timeslot_id).first()
    if not target_timeslot:
        return {"error": "Timeslot not found"}

    # Ensure selected faculty is eligible to teach selected course if mapping exists.
    mapped_faculty = [m.faculty_id for m in db.query(FacultyCourseMap).filter(FacultyCourseMap.course_id == course_id).all()]
    if mapped_faculty and faculty_id not in mapped_faculty:
        return {"error": "Selected faculty is not mapped to this course"}

    # Upsert by course+run so each course has one assignment in a run.
    assignment = db.query(Assignment).filter(Assignment.run_id == run_id, Assignment.course_id == course_id).first()
    if assignment is None:
        assignment = Assignment(
            run_id=run_id,
            semester_id=run.semester_id,
            course_id=course_id,
            faculty_id=faculty_id,
            room_id=room_id,
            section_id=section_id,
            timeslot_id=timeslot_id,
        )
        db.add(assignment)
    else:
        assignment.faculty_id = faculty_id
        assignment.room_id = room_id
        assignment.section_id = section_id
        assignment.timeslot_id = timeslot_id

    db.flush()
    validation = validate_current_run(db, run_id)
    if not validation["is_valid"]:
        db.rollback()
        return {"error": "Manual assignment creates conflicts", "validation": validation}
    db.commit()
    return {
        "message": "Manual assignment saved",
        "run_id": run_id,
        "assignment_id": assignment.id,
        "validation": validation,
    }


def override_assignment(
    db: Session,
    assignment_id: int,
    timeslot_id: int | None = None,
    room_id: int | None = None,
    faculty_id: int | None = None,
    section_id: int | None = None,
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        return {"error": "Assignment not found"}
    if assignment.run_id is None:
        return {"error": "Assignment is not linked to a timetable run"}

    target_timeslot_id = timeslot_id if timeslot_id is not None else assignment.timeslot_id
    target_room_id = room_id if room_id is not None else assignment.room_id
    target_faculty_id = faculty_id if faculty_id is not None else assignment.faculty_id
    target_section_id = section_id if section_id is not None else assignment.section_id

    target_timeslot = db.query(TimeSlot).filter(TimeSlot.id == target_timeslot_id).first()
    if not target_timeslot:
        return {"error": "Timeslot not found"}

    run_assignments = (
        db.query(Assignment)
        .filter(Assignment.run_id == assignment.run_id, Assignment.id != assignment.id)
        .all()
    )
    for other in run_assignments:
        if other.timeslot_id != target_timeslot_id:
            continue
        if other.room_id == target_room_id:
            return {"error": "Room conflict in selected timeslot"}
        if other.faculty_id == target_faculty_id:
            return {"error": "Faculty conflict in selected timeslot"}
        if other.course_id == assignment.course_id:
            return {"error": "Course already scheduled in selected timeslot"}
        if target_section_id is not None and other.section_id == target_section_id:
            return {"error": "Section conflict in selected timeslot"}

    assignment.timeslot_id = target_timeslot_id
    assignment.room_id = target_room_id
    assignment.faculty_id = target_faculty_id
    assignment.section_id = target_section_id
    db.commit()
    validation = validate_current_run(db, assignment.run_id)
    return {
        "message": "Assignment updated",
        "assignment_id": assignment.id,
        "run_id": assignment.run_id,
        "validation": validation,
    }
