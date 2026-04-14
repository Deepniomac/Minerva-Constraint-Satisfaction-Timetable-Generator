from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TimetableRun(Base):
    __tablename__ = "timetable_runs"

    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="draft")  # draft | published
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)

    assignments = relationship("Assignment", back_populates="run")
