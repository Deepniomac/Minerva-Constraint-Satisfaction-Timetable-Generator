from sqlalchemy import Column, ForeignKey, Integer
from app.database import Base


class Preference(Base):
    __tablename__ = "preferences"
    id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"))
    timeslot_id = Column(Integer, ForeignKey("timeslots.id"))
    preference_level = Column(Integer)
