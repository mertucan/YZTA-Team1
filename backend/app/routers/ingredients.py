from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.ingredient import (
    Ingredient,
    IngredientCreate,
    IngredientUpdate,
    IngredientBatch,
    IngredientBatchCreate,
    IngredientBatchUpdate,
)

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


def _recompute_stock(ingredient_id: int) -> None:
    db = get_db()
    batches = db.table("ingredient_batches").select("quantity").eq("ingredient_id", ingredient_id).execute()
    total = sum(float(b["quantity"]) for b in batches.data)
    db.table("ingredients").update({"stock": total}).eq("id", ingredient_id).execute()


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
    res = get_db().table("ingredients").insert({**payload.model_dump(mode="json"), "stock": 0}).execute()
    return res.data[0]


@router.patch("/{ingredient_id}", response_model=Ingredient)
def update_ingredient(ingredient_id: int, payload: IngredientUpdate):
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = get_db().table("ingredients").update(updates).eq("id", ingredient_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return res.data[0]


@router.delete("/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int):
    get_db().table("ingredients").delete().eq("id", ingredient_id).execute()


@router.get("/{ingredient_id}/batches", response_model=list[IngredientBatch])
def list_batches(ingredient_id: int):
    res = (
        get_db()
        .table("ingredient_batches")
        .select("*")
        .eq("ingredient_id", ingredient_id)
        .order("purchase_date", desc=True)
        .execute()
    )
    return res.data


@router.post("/{ingredient_id}/batches", response_model=IngredientBatch, status_code=201)
def create_batch(ingredient_id: int, payload: IngredientBatchCreate):
    res = (
        get_db()
        .table("ingredient_batches")
        .insert({**payload.model_dump(mode="json"), "ingredient_id": ingredient_id})
        .execute()
    )
    _recompute_stock(ingredient_id)
    return res.data[0]


@router.patch("/{ingredient_id}/batches/{batch_id}", response_model=IngredientBatch)
def update_batch(ingredient_id: int, batch_id: int, payload: IngredientBatchUpdate):
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = (
        get_db()
        .table("ingredient_batches")
        .update(updates)
        .eq("id", batch_id)
        .eq("ingredient_id", ingredient_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    _recompute_stock(ingredient_id)
    return res.data[0]


@router.delete("/{ingredient_id}/batches/{batch_id}", status_code=204)
def delete_batch(ingredient_id: int, batch_id: int):
    get_db().table("ingredient_batches").delete().eq("id", batch_id).eq("ingredient_id", ingredient_id).execute()
    _recompute_stock(ingredient_id)
