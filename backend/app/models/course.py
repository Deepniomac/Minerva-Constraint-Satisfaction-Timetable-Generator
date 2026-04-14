from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    dept_id = Column(Integer, ForeignKey("departments.id"))
    hours_per_week = Column(Integer)
    is_lab = Column(Boolean, default=False)
    assignments = relationship("Assignment", back_populates="course")
