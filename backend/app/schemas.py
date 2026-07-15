from datetime import date
from pydantic import BaseModel, Field


class NutritionStatistic(BaseModel):
    id: str
    report_date: date
    university_id: str
    analyzed_meals: int
    avg_calorie: float
    avg_protein: float
    avg_iron: float
    avg_fiber: float
    healthy_menu_ratio: float
    vegetable_ratio: float
    dessert_ratio: float
    high_calorie_ratio: float
    iron_rich_ratio: float
    protein_adequacy_ratio: float
    fiber_adequacy_ratio: float
    obesity_risk_ratio: float
    anemia_risk_ratio: float



class RiskIndicator(BaseModel):
    code: str
    label: str
    value: float
    unit: str = "%"
    level: str = Field(pattern="^(normal|watch|critical)$")
    explanation: str


class TrendPoint(BaseModel):
    period: str
    avg_calorie: float
    protein_adequacy_ratio: float
    vegetable_ratio: float
    dessert_ratio: float
    iron_rich_ratio: float
    obesity_risk_ratio: float
    anemia_risk_ratio: float





class StudentConsumptionRisks(BaseModel):
    total_registered_students: int = 0
    total_active_students: int
    obesity_risk_count: int
    anemia_risk_count: int
    obesity_risk_ratio: float
    anemia_risk_ratio: float


class StatisticsResponse(BaseModel):
    summary: NutritionStatistic
    risk_indicators: list[RiskIndicator]
    trend: list[dict]
    student_consumption_risks: StudentConsumptionRisks | None = None
    active_health_flags: dict[str, int] | None = None
    disclaimer: str
    age_group_risks: list[dict] | None = None
    age_group_conditions: list[dict] | None = None
    student_scatter_points: list[dict] | None = None


class AnalysisRequest(BaseModel):
    analysis_type: str
    start_date: date
    end_date: date
    meals: list[str]


class AnalysisResponse(BaseModel):
    id: int
    analysis_type: str
    start_date: date
    end_date: date
    meals: list[str]
    analyzed_meals_count: int
    results: dict
    created_at: str


class ComparisonRequest(BaseModel):
    analysis_type: str
    period1_start: date
    period1_end: date
    period2_start: date
    period2_end: date
    meals: list[str]


class ComparisonResponse(BaseModel):
    metrics: list[dict]


class WeeklyMenuInfo(BaseModel):
    id: int
    name: str | None = None
    week_start_date: date
    budget: float | None = None
    total_cost: float | None = None
    total_calories: float | None = None
    total_protein: float | None = None
    total_iron: float | None = None
    status: str
    notes: str | None = None


class MenuComparisonMetric(BaseModel):
    metric: str
    menu1_value: str
    menu2_value: str
    diff: str


class MenuComparisonResponse(BaseModel):
    menu1: WeeklyMenuInfo
    menu2: WeeklyMenuInfo
    metrics: list[MenuComparisonMetric]


class MealComparisonRow(BaseModel):
    meal_name: str
    avg_calorie: float
    avg_protein: float
    avg_iron: float
    avg_fiber: float
    obesity_risk_ratio: float
    anemia_risk_ratio: float


class MealComparisonResponse(BaseModel):
    metrics: list[MealComparisonRow]


