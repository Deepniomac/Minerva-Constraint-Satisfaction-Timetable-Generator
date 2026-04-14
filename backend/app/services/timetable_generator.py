from sqlalchemy.orm import Session
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.faculty import Faculty
from app.models.room import Room
from app.models.timeslot import TimeSlot


def generate_timetable(db: Session):
    courses = db.query(Course).all()
    faculty_list = db.query(Faculty).all()
    rooms = db.query(Room).all()
    timeslots = db.query(TimeSlot).all()
    if not courses or not faculty_list or not rooms or not timeslots:
        return {"error": "Seed departments/courses/faculty/rooms/timeslots first"}

    db.query(Assignment).delete()
    total = min(len(courses), len(faculty_list), len(rooms), len(timeslots))
    for i in range(total):
        db.add(
            Assignment(
                course_id=courses[i].id,
                faculty_id=faculty_list[i].id,
                room_id=rooms[i].id,
                timeslot_id=timeslots[i].id,
            )
        )
    db.commit()
    return {"message": "Draft timetable generated", "total_assignments": total}
