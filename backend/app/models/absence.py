from pydantic import BaseModel
from typing import Optional
from datetime import date


class AbsenceBase(BaseModel):
    student_id: int
    absence_date: date


class AbsenceCreate(AbsenceBase):
    pass


class Absence(AbsenceBase):
    id: int

    class Config:
        from_attributes = True
