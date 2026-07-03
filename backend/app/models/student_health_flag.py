from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StudentHealthFlagBase(BaseModel):
    student_id: int
    condition_type: str
    flag_label: str
    severity: str = "medium"
    notes: Optional[str] = None
    is_active: bool = True


class StudentHealthFlagCreate(StudentHealthFlagBase):
    pass


class StudentHealthFlagUpdate(BaseModel):
    condition_type: Optional[str] = None
    flag_label: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class StudentHealthFlag(StudentHealthFlagBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
