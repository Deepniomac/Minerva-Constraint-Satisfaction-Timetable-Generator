from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dept_id = Column(Integer, ForeignKey("departments.id"))
    assignments = relationship("Assignment", back_populates="faculty")
