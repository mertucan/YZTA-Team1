from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    absences,
    dashboard,
    health_risk_analysis,
    ingredients,
    meals,
    menus,
    partner_products,
    research_exports,
    student_health_flags,
    student_meals,
    students,
    university_quality_exports,
)
from app.catering_management.integration import register_catering_routes

app = FastAPI(title="YemekhanAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(health_risk_analysis.router)
app.include_router(ingredients.router)
app.include_router(meals.router)
app.include_router(students.router)
app.include_router(absences.router)
app.include_router(student_meals.router)
app.include_router(student_health_flags.router)
app.include_router(menus.router)
app.include_router(partner_products.router)
app.include_router(research_exports.router)
app.include_router(university_quality_exports.router)
register_catering_routes(app)


@app.get("/")
def root():
    return {"status": "ok", "project": "YemekhanAI"}
