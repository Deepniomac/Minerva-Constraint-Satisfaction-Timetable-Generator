from app.models.assignment import Assignment
from app.models.timeslot import TimeSlot
from app.services.timetable_generator import validate_assignments


def _slot(idx: int, day: str, slot: str):
    return TimeSlot(id=idx, day=day, slot=slot)


def _assignment(course_id: int, faculty_id: int, room_id: int, section_id: int | None, timeslot_id: int):
    return Assignment(
        course_id=course_id,
        faculty_id=faculty_id,
        room_id=room_id,
        section_id=section_id,
        timeslot_id=timeslot_id,
    )


def test_section_overlap_is_detected():
    slots = {1: _slot(1, "Mon", "9-10")}
    assignments = [
        _assignment(course_id=1, faculty_id=1, room_id=1, section_id=101, timeslot_id=1),
        _assignment(course_id=2, faculty_id=2, room_id=2, section_id=101, timeslot_id=1),
    ]
    result = validate_assignments(assignments, slots)
    assert result["is_valid"] is False
    assert any(c["type"] == "section_overlap" for c in result["conflicts"])


def test_distinct_sections_no_section_overlap():
    slots = {1: _slot(1, "Tue", "10-11")}
    assignments = [
        _assignment(course_id=1, faculty_id=1, room_id=1, section_id=201, timeslot_id=1),
        _assignment(course_id=2, faculty_id=2, room_id=2, section_id=202, timeslot_id=1),
    ]
    result = validate_assignments(assignments, slots)
    assert not any(c["type"] == "section_overlap" for c in result["conflicts"])
