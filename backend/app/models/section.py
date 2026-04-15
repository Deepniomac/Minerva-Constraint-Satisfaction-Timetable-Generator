from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    dept_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assignments = relationship("Assignment", back_populates="section")
