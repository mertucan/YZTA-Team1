from pydantic import BaseModel
from typing import Optional
from datetime import date


class ExpenseBase(BaseModel):
    category: str
    description: Optional[str] = None
    amount: float = 0
    expense_date: date


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None


class Expense(ExpenseBase):
    id: int

    class Config:
        from_attributes = True
