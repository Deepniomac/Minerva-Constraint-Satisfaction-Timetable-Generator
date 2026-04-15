import re
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.faculty_course_map import FacultyCourseMap
from app.models.room import Room
from app.models.section import Section
from app.models.assignment import Assignment
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
        if not apply:
            return {
                "ok": True,
                "mode": "csv",
                "applied": False,
                "actions": [],
                "unknown": [{"line": "csv-preview", "reason": "CSV preview mode is not supported; apply to import."}],
                "stats": {},
            }
        result = import_subjects_csv_text(db, text, source="chatbot")
        return {"ok": result.get("ok", False), "mode": "csv", "applied": apply, "result": result}

    lines = [ln.strip() for ln in re.split(r"[;\n]+", text) if ln.strip()]
    actions = []
    unknown = []
    stats = {
        "departments_created": 0,
        "departments_deleted": 0,
        "faculty_created": 0,
        "faculty_deleted": 0,
        "courses_created": 0,
        "courses_updated": 0,
        "courses_deleted": 0,
        "rooms_created": 0,
        "rooms_deleted": 0,
        "sections_created": 0,
        "sections_deleted": 0,
        "mappings_created": 0,
        "mappings_deleted": 0,
    }

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

        # delete department CSE
        m = re.match(r"delete\s+department\s+(.+)$", line, flags=re.I)
        if m:
            dept_name = m.group(1).strip()
            dept = db.query(Department).filter(Department.name == dept_name).first()
            if not dept:
                unknown.append({"line": line, "reason": "department not found"})
                continue
            faculty_count = db.query(Faculty).filter(Faculty.dept_id == dept.id).count()
            course_count = db.query(Course).filter(Course.dept_id == dept.id).count()
            if faculty_count > 0 or course_count > 0:
                unknown.append(
                    {
                        "line": line,
                        "reason": f"department has dependencies (faculty={faculty_count}, courses={course_count})",
                    }
                )
                continue
            db.delete(dept)
            stats["departments_deleted"] += 1
            actions.append({"type": "department", "name": dept_name, "deleted": True})
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

        # add section 5A [dept CSE]
        m = re.match(r"add\s+section\s+(.+?)(?:\s+dept\s+(.+))?$", line, flags=re.I)
        if m:
            section_name = m.group(1).strip()
            dept_name = (m.group(2) or "").strip()
            section = db.query(Section).filter(Section.name == section_name).first()
            created = False
            dept_id = None
            if dept_name:
                dept, _ = _get_or_create_department(db, dept_name)
                dept_id = dept.id
            if not section:
                section = Section(name=section_name, dept_id=dept_id)
                db.add(section)
                created = True
                stats["sections_created"] += 1
            else:
                if dept_id is not None:
                    section.dept_id = dept_id
            actions.append({"type": "section", "name": section_name, "created": created})
            continue

        # delete room 5A
        m = re.match(r"delete\s+room\s+(.+)$", line, flags=re.I)
        if m:
            room_name = m.group(1).strip()
            room = db.query(Room).filter(Room.name == room_name).first()
            if not room:
                unknown.append({"line": line, "reason": "room not found"})
                continue
            assignment_count = db.query(Assignment).filter(Assignment.room_id == room.id).count()
            if assignment_count > 0:
                unknown.append({"line": line, "reason": f"room is used in assignments ({assignment_count})"})
                continue
            db.delete(room)
            stats["rooms_deleted"] += 1
            actions.append({"type": "room", "name": room_name, "deleted": True})
            continue

        # delete section 5A
        m = re.match(r"delete\s+section\s+(.+)$", line, flags=re.I)
        if m:
            section_name = m.group(1).strip()
            section = db.query(Section).filter(Section.name == section_name).first()
            if not section:
                unknown.append({"line": line, "reason": "section not found"})
                continue
            assignment_count = db.query(Assignment).filter(Assignment.section_id == section.id).count()
            if assignment_count > 0:
                unknown.append({"line": line, "reason": f"section is used in assignments ({assignment_count})"})
                continue
            db.delete(section)
            stats["sections_deleted"] += 1
            actions.append({"type": "section", "name": section_name, "deleted": True})
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

        # delete faculty Dr Rao
        m = re.match(r"delete\s+faculty\s+(.+)$", line, flags=re.I)
        if m:
            faculty_name = m.group(1).strip()
            faculty = db.query(Faculty).filter(Faculty.name == faculty_name).first()
            if not faculty:
                unknown.append({"line": line, "reason": "faculty not found"})
                continue
            assignment_count = db.query(Assignment).filter(Assignment.faculty_id == faculty.id).count()
            if assignment_count > 0:
                unknown.append({"line": line, "reason": f"faculty is used in assignments ({assignment_count})"})
                continue
            db.query(FacultyCourseMap).filter(FacultyCourseMap.faculty_id == faculty.id).delete()
            db.delete(faculty)
            stats["faculty_deleted"] += 1
            actions.append({"type": "faculty", "name": faculty_name, "deleted": True})
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

        # delete course Data Structures
        m = re.match(r"delete\s+course\s+(.+)$", line, flags=re.I)
        if m:
            course_name = m.group(1).strip()
            course = db.query(Course).filter(Course.name == course_name).first()
            if not course:
                unknown.append({"line": line, "reason": "course not found"})
                continue
            assignment_count = db.query(Assignment).filter(Assignment.course_id == course.id).count()
            if assignment_count > 0:
                unknown.append({"line": line, "reason": f"course is used in assignments ({assignment_count})"})
                continue
            db.query(FacultyCourseMap).filter(FacultyCourseMap.course_id == course.id).delete()
            db.delete(course)
            stats["courses_deleted"] += 1
            actions.append({"type": "course", "name": course_name, "deleted": True})
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

        # unmap faculty Dr Rao from Data Structures
        m = re.match(r"(?:unmap|remove)\s+faculty\s+(.+?)\s+(?:from)\s+(.+)$", line, flags=re.I)
        if m:
            faculty_name = m.group(1).strip()
            course_name = m.group(2).strip()
            faculty = db.query(Faculty).filter(Faculty.name == faculty_name).first()
            course = db.query(Course).filter(Course.name == course_name).first()
            if not faculty or not course:
                unknown.append({"line": line, "reason": "faculty or course not found"})
                continue
            existing = (
                db.query(FacultyCourseMap)
                .filter(FacultyCourseMap.faculty_id == faculty.id, FacultyCourseMap.course_id == course.id)
                .first()
            )
            if not existing:
                unknown.append({"line": line, "reason": "mapping not found"})
                continue
            db.delete(existing)
            stats["mappings_deleted"] += 1
            actions.append({"type": "faculty_course_map", "faculty": faculty_name, "course": course_name, "deleted": True})
            continue

        unknown.append({"line": line, "reason": "could not parse"})

    if apply:
        db.commit()
    else:
        db.rollback()
    return {"ok": True, "mode": "nlp", "applied": apply, "actions": actions, "unknown": unknown, "stats": stats}
