from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.meal import Meal, MealCreate, MealUpdate

router = APIRouter(prefix="/meals", tags=["meals"])

MEAL_SELECT = "*, meal_ingredients(ingredient_id, quantity, ingredients(name, unit))"


def _to_meal_out(row: dict) -> dict:
    items = [
        {
            "ingredient_id": mi["ingredient_id"],
            "ingredient_name": (mi.get("ingredients") or {}).get("name", ""),
            "unit": (mi.get("ingredients") or {}).get("unit", ""),
            "quantity": mi["quantity"],
        }
        for mi in row.pop("meal_ingredients", []) or []
    ]
    row["items"] = items
    return row


def _recompute_nutrition(meal_id: int, portions: int) -> None:
    db = get_db()
    rows = (
        db.table("meal_ingredients")
        .select("quantity, ingredients(calories, protein, iron)")
        .eq("meal_id", meal_id)
        .execute()
    )
    total_cal = total_pro = total_iron = 0.0
    for row in rows.data:
        ing = row.get("ingredients") or {}
        qty = float(row["quantity"])
        total_cal += qty * float(ing.get("calories") or 0)
        total_pro += qty * float(ing.get("protein") or 0)
        total_iron += qty * float(ing.get("iron") or 0)

    divisor = max(portions, 1)
    db.table("meals").update({
        "calories": round(total_cal / divisor, 2),
        "protein": round(total_pro / divisor, 2),
        "iron": round(total_iron / divisor, 2),
    }).eq("id", meal_id).execute()


@router.get("/", response_model=list[Meal])
def list_meals():
    res = get_db().table("meals").select(MEAL_SELECT).execute()
    return [_to_meal_out(row) for row in res.data]


@router.get("/{meal_id}", response_model=Meal)
def get_meal(meal_id: int):
    res = get_db().table("meals").select(MEAL_SELECT).eq("id", meal_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    return _to_meal_out(res.data)


@router.post("/", response_model=Meal, status_code=201)
def create_meal(payload: MealCreate):
    db = get_db()
    meal_res = db.table("meals").insert({
        "name": payload.name,
        "category": payload.category,
        "portions": payload.portions,
    }).execute()
    meal = meal_res.data[0]

    if payload.items:
        db.table("meal_ingredients").insert([
            {"meal_id": meal["id"], "ingredient_id": item.ingredient_id, "quantity": item.quantity}
            for item in payload.items
        ]).execute()
        _recompute_nutrition(meal["id"], payload.portions)

    final = db.table("meals").select(MEAL_SELECT).eq("id", meal["id"]).single().execute()
    return _to_meal_out(final.data)


@router.patch("/{meal_id}", response_model=Meal)
def update_meal(meal_id: int, payload: MealUpdate):
    db = get_db()
    current_res = db.table("meals").select("*").eq("id", meal_id).single().execute()
    if not current_res.data:
        raise HTTPException(status_code=404, detail="Meal not found")

    field_updates = payload.model_dump(exclude={"items"}, exclude_none=True)
    if field_updates:
        db.table("meals").update(field_updates).eq("id", meal_id).execute()

    portions = field_updates.get("portions", current_res.data["portions"])

    if payload.items is not None:
        db.table("meal_ingredients").delete().eq("meal_id", meal_id).execute()
        if payload.items:
            db.table("meal_ingredients").insert([
                {"meal_id": meal_id, "ingredient_id": item.ingredient_id, "quantity": item.quantity}
                for item in payload.items
            ]).execute()
        _recompute_nutrition(meal_id, portions)
    elif "portions" in field_updates:
        _recompute_nutrition(meal_id, portions)

    final = db.table("meals").select(MEAL_SELECT).eq("id", meal_id).single().execute()
    return _to_meal_out(final.data)


@router.delete("/{meal_id}", status_code=204)
def delete_meal(meal_id: int):
    get_db().table("meals").delete().eq("id", meal_id).execute()
