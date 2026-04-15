from app.database import SessionLocal
from app.models.course import Course
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.room import Room
from app.models.section import Section
from app.models.semester import Semester
from app.models.timeslot import TimeSlot


def _get_or_create(db, model, defaults=None, **filters):
    obj = db.query(model).filter_by(**filters).first()
    if obj:
        return obj, False
    payload = {**filters, **(defaults or {})}
    obj = model(**payload)
    db.add(obj)
    db.flush()
    return obj, True


def run():
    db = SessionLocal()
    stats = {
        "departments": 0,
        "faculty": 0,
        "courses": 0,
        "rooms": 0,
        "sections": 0,
        "timeslots": 0,
        "semesters": 0,
    }
    try:
        cse, created = _get_or_create(db, Department, name="CSE")
        stats["departments"] += int(created)
        ece, created = _get_or_create(db, Department, name="ECE")
        stats["departments"] += int(created)

        for name, dept in [("Dr Rao", cse.id), ("Dr Iyer", cse.id), ("Dr Nair", ece.id)]:
            _, created = _get_or_create(db, Faculty, name=name, dept_id=dept)
            stats["faculty"] += int(created)

        for name, dept, hours, is_lab in [
            ("Data Structures", cse.id, 4, False),
            ("Operating Systems", cse.id, 4, False),
            ("Networks Lab", cse.id, 2, True),
            ("Digital Electronics", ece.id, 3, False),
        ]:
            _, created = _get_or_create(
                db,
                Course,
                name=name,
                dept_id=dept,
                defaults={"hours_per_week": hours, "is_lab": is_lab},
            )
            stats["courses"] += int(created)

        for name, cap, typ in [("5A", 60, "classroom"), ("5B", 60, "classroom"), ("Lab-1", 40, "lab")]:
            _, created = _get_or_create(db, Room, name=name, defaults={"capacity": cap, "type": typ})
            stats["rooms"] += int(created)

        for name, dept in [("CSE-A", cse.id), ("CSE-B", cse.id), ("ECE-A", ece.id)]:
            _, created = _get_or_create(db, Section, name=name, defaults={"dept_id": dept})
            stats["sections"] += int(created)

        _, created = _get_or_create(
            db,
            Semester,
            name="2026 Even",
            defaults={"start_date": "2026-01-10", "end_date": "2026-05-25", "is_active": True},
        )
        stats["semesters"] += int(created)

        for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
            for slot in ["9-10", "10-11", "11-12", "2-3", "3-4"]:
                _, created = _get_or_create(db, TimeSlot, day=day, slot=slot)
                stats["timeslots"] += int(created)

        db.commit()
        print("Seed complete:", stats)
    finally:
        db.close()


if __name__ == "__main__":
    run()
