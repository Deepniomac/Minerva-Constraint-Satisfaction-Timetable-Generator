from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.database import Base


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    faculty_id = Column(Integer, ForeignKey("faculty.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    timeslot_id = Column(Integer, ForeignKey("timeslots.id"))
    course = relationship("Course", back_populates="assignments")
    faculty = relationship("Faculty", back_populates="assignments")
    room = relationship("Room", back_populates="assignments")
    timeslot = relationship("TimeSlot", back_populates="assignments")
