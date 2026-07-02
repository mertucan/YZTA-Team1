from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.meal import Meal, MealCreate, MealUpdate

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("/", response_model=list[Meal])
def list_meals():
    res = get_db().table("meals").select("*").execute()
    return res.data


@router.get("/{meal_id}", response_model=Meal)
def get_meal(meal_id: int):
    res = get_db().table("meals").select("*").eq("id", meal_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    return res.data


@router.post("/", response_model=Meal, status_code=201)
def create_meal(payload: MealCreate):
    res = get_db().table("meals").insert(payload.model_dump()).execute()
    return res.data[0]


@router.patch("/{meal_id}", response_model=Meal)
def update_meal(meal_id: int, payload: MealUpdate):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = get_db().table("meals").update(updates).eq("id", meal_id).execute()
    return res.data[0]


@router.delete("/{meal_id}", status_code=204)
def delete_meal(meal_id: int):
    get_db().table("meals").delete().eq("id", meal_id).execute()
