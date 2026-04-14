from sqlalchemy import Boolean, Column, Integer, String
from app.database import Base


class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
