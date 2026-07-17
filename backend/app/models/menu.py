from pydantic import BaseModel
from typing import Optional
from datetime import date


class WeeklyMenuGenerate(BaseModel):
    week_start_date: date
    budget: float
    portions: int = 40
    extra_instructions: Optional[str] = None


class WeeklyMenuCreateManual(BaseModel):
    week_start_date: date
    budget: float = 0
    portions: int = 40


class WeeklyMenuMealItemCreate(BaseModel):
    day_of_week: str
    category: str
    meal_id: int


class WeeklyMenuPortionsUpdate(BaseModel):
    portions: int


class WeeklyMenuItemPortionsUpdate(BaseModel):
    portions: int


class WeeklyMenuItemMealUpdate(BaseModel):
    meal_id: int


class WeeklyMenuItem(BaseModel):
    id: int
    weekly_menu_id: int
    day_of_week: str
    meal_name: str
    ingredient_id: Optional[int] = None
    meal_id: Optional[int] = None
    partner_product_integration_id: Optional[int] = None
    source: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    portions: Optional[int] = None
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
    portions: int = 40
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


class SeasonalMenuRevision(BaseModel):
    menu_item_id: int
    day_of_week: str
    category: str
    current_meal_id: int
    current_meal_name: str
    current_cost: float
    suggested_meal_id: int
    suggested_meal_name: str
    suggested_cost: float
    estimated_savings: float
    seasonal_score: float
    local_score: float
    price_advantage_score: float
    local_ingredient_ratio: float
    seasonal_ingredients: list[str] = []
    local_ingredients: list[str] = []
    opportunity_ingredients: list[str] = []
    reason: str


class SeasonalMenuRevisionResponse(BaseModel):
    menu_id: int
    week_start_date: date
    total_estimated_savings: float
    average_local_ingredient_ratio: float
    revision_count: int
    revisions: list[SeasonalMenuRevision] = []
