from pydantic import BaseModel
from typing import Optional
from datetime import date


class WeeklyMenuGenerate(BaseModel):
    week_start_date: date
    budget: float
    extra_instructions: Optional[str] = None


class WeeklyMenuItem(BaseModel):
    id: int
    weekly_menu_id: int
    day_of_week: str
    meal_name: str
    ingredient_id: int
    quantity: float
    estimated_cost: float
    calories: float
    protein: float
    iron: float

    class Config:
        from_attributes = True


class WeeklyMenu(BaseModel):
    id: int
    week_start_date: date
    budget: float
    total_cost: float
    total_calories: float
    total_protein: float
    total_iron: float
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class WeeklyMenuDetail(WeeklyMenu):
    items: list[WeeklyMenuItem] = []


class WeeklyMenuStatusUpdate(BaseModel):
    status: str
