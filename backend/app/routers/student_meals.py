from fastapi import APIRouter
from app.database import get_db

router = APIRouter(prefix="/student-meals", tags=["student-meals"])


@router.get("/")
def list_student_meals():
    """Returns all student meal records joined with student and meal details."""
    res = (
        get_db()
        .table("student_meals")
        .select("id, consumed_at, students(id, first_name, last_name), meals(id, name, calories)")
        .order("consumed_at", desc=True)
        .execute()
    )
    return res.data


@router.get("/by-student")
def calories_by_student():
    """Aggregated calorie totals per student across all recorded meals."""
    res = (
        get_db()
        .table("student_meals")
        .select("student_id, students(first_name, last_name), meals(calories)")
        .execute()
    )

    totals: dict[int, dict] = {}
    for row in res.data:
        sid = row["student_id"]
        cal = (row.get("meals") or {}).get("calories", 0) or 0
        if sid not in totals:
            student = row.get("students") or {}
            totals[sid] = {
                "student_id": sid,
                "first_name": student.get("first_name", ""),
                "last_name": student.get("last_name", ""),
                "total_calories": 0,
                "meal_count": 0,
            }
        totals[sid]["total_calories"] += cal
        totals[sid]["meal_count"] += 1

    return sorted(totals.values(), key=lambda x: x["total_calories"], reverse=True)
