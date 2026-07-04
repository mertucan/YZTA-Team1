from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.menu import WeeklyMenu, WeeklyMenuDetail, WeeklyMenuGenerate, WeeklyMenuStatusUpdate
from app.services.menu_ai import MenuAIError, generate_weekly_menu

router = APIRouter(prefix="/menus", tags=["menus"])


@router.get("/", response_model=list[WeeklyMenu])
def list_menus():
    res = get_db().table("weekly_menus").select("*").order("week_start_date", desc=True).execute()
    return res.data


@router.get("/{menu_id}", response_model=WeeklyMenuDetail)
def get_menu(menu_id: int):
    db = get_db()
    menu_res = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    if not menu_res.data:
        raise HTTPException(status_code=404, detail="Menu not found")
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu_id).execute()
    return {**menu_res.data, "items": items_res.data}


@router.post("/generate", response_model=WeeklyMenuDetail, status_code=201)
def generate_menu(payload: WeeklyMenuGenerate):
    try:
        return generate_weekly_menu(payload.week_start_date, payload.budget, payload.extra_instructions)
    except MenuAIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{menu_id}/status", response_model=WeeklyMenu)
def update_menu_status(menu_id: int, payload: WeeklyMenuStatusUpdate):
    if payload.status not in ("draft", "approved"):
        raise HTTPException(status_code=400, detail="status must be 'draft' or 'approved'")
    res = get_db().table("weekly_menus").update({"status": payload.status}).eq("id", menu_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Menu not found")
    return res.data[0]


@router.delete("/{menu_id}", status_code=204)
def delete_menu(menu_id: int):
    get_db().table("weekly_menus").delete().eq("id", menu_id).execute()
