from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class TimeSlot(Base):
    __tablename__ = "timeslots"
    id = Column(Integer, primary_key=True)
    day = Column(String)
    slot = Column(String)
    assignments = relationship("Assignment", back_populates="timeslot")
