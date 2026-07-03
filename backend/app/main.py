from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ingredients, meals, students, absences, dashboard, student_meals, student_health_flags

app = FastAPI(title="YemekhanAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(ingredients.router)
app.include_router(meals.router)
app.include_router(students.router)
app.include_router(absences.router)
app.include_router(student_meals.router)
app.include_router(student_health_flags.router)


@app.get("/")
def root():
    return {"status": "ok", "project": "YemekhanAI"}
