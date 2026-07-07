from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.ingredient import Ingredient, IngredientCreate, IngredientUpdate

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("/", response_model=list[Ingredient])
def list_ingredients():
    res = get_db().table("ingredients").select("*").execute()
    return res.data


@router.get("/{ingredient_id}", response_model=Ingredient)
def get_ingredient(ingredient_id: int):
    res = get_db().table("ingredients").select("*").eq("id", ingredient_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return res.data


@router.post("/", response_model=Ingredient, status_code=201)
def create_ingredient(payload: IngredientCreate):
    res = get_db().table("ingredients").insert(payload.model_dump(mode="json")).execute()
    return res.data[0]


@router.patch("/{ingredient_id}", response_model=Ingredient)
def update_ingredient(ingredient_id: int, payload: IngredientUpdate):
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = get_db().table("ingredients").update(updates).eq("id", ingredient_id).execute()
    return res.data[0]


@router.delete("/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int):
    get_db().table("ingredients").delete().eq("id", ingredient_id).execute()
