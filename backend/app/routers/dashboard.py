from fastapi import APIRouter
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats():
    db = get_db()

    students = db.table("students").select("id", count="exact").execute()
    absences = db.table("student_absences").select("id", count="exact").execute()
    ingredients = db.table("ingredients").select("id", count="exact").execute()
    meals = db.table("meals").select("id", count="exact").execute()

    low_stock = db.table("ingredients").select("*").lt("stock", 20).execute()

    return {
        "total_students": students.count or 0,
        "total_absences": absences.count or 0,
        "total_ingredients": ingredients.count or 0,
        "total_meals": meals.count or 0,
        "low_stock_ingredients": low_stock.data,
    }
