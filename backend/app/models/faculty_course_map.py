from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from app.database import Base


class FacultyCourseMap(Base):
    __tablename__ = "faculty_course_map"
    __table_args__ = (UniqueConstraint("faculty_id", "course_id", name="uq_faculty_course"),)

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
