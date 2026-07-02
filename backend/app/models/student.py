from pydantic import BaseModel
from typing import Optional


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    national_id: str
    age: int


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None


class Student(StudentBase):
    id: int

    class Config:
        from_attributes = True
