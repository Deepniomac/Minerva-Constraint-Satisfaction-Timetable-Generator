import re
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.faculty_course_map import FacultyCourseMap
from app.models.room import Room
from app.services.csv_importer import import_subjects_csv_text


def _get_or_create_department(db: Session, name: str):
    d = db.query(Department).filter(Department.name == name).first()
    if d:
        return d, False
    d = Department(name=name)
    db.add(d)
    db.flush()
    return d, True


def process_minerva_prompt(db: Session, message: str, apply: bool = True):
    text = (message or "").strip()
    if not text:
        return {"ok": False, "error": "Empty message"}

    # If user pasted CSV-like payload, use existing CSV importer.
    if "Subject,Professor,Hours,Sections" in text or ("Subject" in text and "Professor" in text and "Sections" in text):
        result = import_subjects_csv_text(db, text, source="chatbot")
        return {"ok": result.get("ok", False), "mode": "csv", "result": result}

    lines = [ln.strip() for ln in re.split(r"[;\n]+", text) if ln.strip()]
    actions = []
    unknown = []
    stats = {"departments_created": 0, "faculty_created": 0, "courses_created": 0, "courses_updated": 0, "rooms_created": 0, "mappings_created": 0}

    for line in lines:
        low = line.lower()
        # add department CSE
        m = re.match(r"add\s+department\s+(.+)$", line, flags=re.I)
        if m:
            dept_name = m.group(1).strip()
            dept, created = _get_or_create_department(db, dept_name)
            if created:
                stats["departments_created"] += 1
            actions.append({"type": "department", "name": dept.name, "created": created})
            continue

        # add room 5A capacity 60 type classroom
        m = re.match(r"add\s+room\s+(.+?)(?:\s+capacity\s+(\d+))?(?:\s+type\s+(\w+))?$", line, flags=re.I)
        if m:
            room_name = m.group(1).strip()
            capacity = int(m.group(2)) if m.group(2) else 60
            room_type = (m.group(3) or "classroom").strip().lower()
            room = db.query(Room).filter(Room.name == room_name).first()
            created = False
            if not room:
                room = Room(name=room_name, capacity=capacity, type=room_type)
                db.add(room)
                created = True
                stats["rooms_created"] += 1
            else:
                room.capacity = capacity
                room.type = room_type
            actions.append({"type": "room", "name": room_name, "created": created})
            continue

        # add faculty Dr Name dept CSE
        m = re.match(r"add\s+faculty\s+(.+?)\s+dept\s+(.+)$", line, flags=re.I)
        if m:
            faculty_name = m.group(1).strip()
            dept_name = m.group(2).strip()
            dept, _ = _get_or_create_department(db, dept_name)
            faculty = db.query(Faculty).filter(Faculty.name == faculty_name).first()
            created = False
            if not faculty:
                faculty = Faculty(name=faculty_name, dept_id=dept.id)
                db.add(faculty)
                created = True
                stats["faculty_created"] += 1
            else:
                faculty.dept_id = dept.id
            actions.append({"type": "faculty", "name": faculty_name, "dept": dept_name, "created": created})
            continue

        # add course Data Structures hours 3 dept CSE [lab]
        m = re.match(r"add\s+course\s+(.+?)\s+hours\s+(\d+)\s+dept\s+(.+?)(?:\s+(lab))?$", line, flags=re.I)
        if m:
            course_name = m.group(1).strip()
            hours = int(m.group(2))
            dept_name = m.group(3).strip()
            is_lab = bool(m.group(4))
            dept, _ = _get_or_create_department(db, dept_name)
            course = db.query(Course).filter(Course.name == course_name).first()
            created = False
            if not course:
                course = Course(name=course_name, dept_id=dept.id, hours_per_week=hours, is_lab=is_lab)
                db.add(course)
                created = True
                stats["courses_created"] += 1
            else:
                course.dept_id = dept.id
                course.hours_per_week = hours
                course.is_lab = is_lab
                stats["courses_updated"] += 1
            actions.append({"type": "course", "name": course_name, "hours": hours, "dept": dept_name, "created": created})
            continue

        # map faculty Dr Rao to Data Structures
        m = re.match(r"(?:map|assign)\s+faculty\s+(.+?)\s+(?:to|for)\s+(.+)$", line, flags=re.I)
        if m:
            faculty_name = m.group(1).strip()
            course_name = m.group(2).strip()
            faculty = db.query(Faculty).filter(Faculty.name == faculty_name).first()
            course = db.query(Course).filter(Course.name == course_name).first()
            if faculty and course:
                existing = db.query(FacultyCourseMap).filter(FacultyCourseMap.faculty_id == faculty.id, FacultyCourseMap.course_id == course.id).first()
                created = False
                if not existing:
                    db.add(FacultyCourseMap(faculty_id=faculty.id, course_id=course.id))
                    created = True
                    stats["mappings_created"] += 1
                actions.append({"type": "faculty_course_map", "faculty": faculty_name, "course": course_name, "created": created})
            else:
                unknown.append({"line": line, "reason": "faculty or course not found"})
            continue

        unknown.append({"line": line, "reason": "could not parse"})

    if apply:
        db.commit()
    else:
        db.rollback()
    return {"ok": True, "mode": "nlp", "actions": actions, "unknown": unknown, "stats": stats}
