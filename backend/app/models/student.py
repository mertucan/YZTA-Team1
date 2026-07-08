from pydantic import BaseModel, Field
from typing import Optional


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    national_id: str = Field(pattern=r"^\d{11}$")
    age: int = Field(ge=0)


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
