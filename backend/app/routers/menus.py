from datetime import date, timedelta

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.menu import (
    WeeklyMenu,
    WeeklyMenuDetail,
    WeeklyMenuGenerate,
    WeeklyMenuStatusUpdate,
    WeeklyMenuCreateManual,
    WeeklyMenuMealItemCreate,
    WeeklyMenuPortionsUpdate,
    WeeklyMenuItemPortionsUpdate,
    WeeklyMenuItemMealUpdate,
    SeasonalMenuRevisionResponse,
)
from app.services.menu_ai import MenuAIError, generate_weekly_menu, suggest_seasonal_revisions

router = APIRouter(prefix="/menus", tags=["menus"])


def _monday_of(d: date) -> date:
    """Haftalar her zaman Pazartesi'den başlar; verilen tarihi haftasının Pazartesi'sine sabitler."""
    return d - timedelta(days=d.weekday())


def _existing_menu_in_week(monday: date, exclude_id: int | None = None) -> dict | None:
    """O takvim haftası (Pzt–Paz) içinde başlayan mevcut bir menü varsa döndürür."""
    q = (
        get_db()
        .table("weekly_menus")
        .select("id, status, week_start_date")
        .gte("week_start_date", monday.isoformat())
        .lte("week_start_date", (monday + timedelta(days=6)).isoformat())
    )
    if exclude_id is not None:
        q = q.neq("id", exclude_id)
    res = q.execute()
    return res.data[0] if res.data else None


def _reject_if_week_taken(monday: date) -> None:
    existing = _existing_menu_in_week(monday)
    if existing:
        durum = "onaylı" if existing["status"] == "approved" else "taslak"
        raise HTTPException(
            status_code=409,
            detail=(
                f"{monday.isoformat()} haftası için zaten {durum} bir menü var (id={existing['id']}). "
                "Aynı hafta için ikinci menü oluşturulamaz; mevcut menüyü düzenleyin veya silin."
            ),
        )


def _recompute_menu_totals(menu_id: int) -> None:
    db = get_db()
    items = db.table("weekly_menu_items").select("estimated_cost, calories, protein, iron, portions").eq("weekly_menu_id", menu_id).execute()
    # Maliyet kişi sayısıyla (kalem porsiyonu) ölçeklenir; besin değerleri kişi başı (porsiyon başı) kalır.
    total_cost = sum(float(i.get("estimated_cost") or 0) * float(i.get("portions") or 1) for i in items.data)
    total_calories = sum(float(i.get("calories") or 0) for i in items.data)
    total_protein = sum(float(i.get("protein") or 0) for i in items.data)
    total_iron = sum(float(i.get("iron") or 0) for i in items.data)
    db.table("weekly_menus").update({
        "total_cost": round(total_cost, 2),
        "total_calories": round(total_calories, 2),
        "total_protein": round(total_protein, 2),
        "total_iron": round(total_iron, 2),
    }).eq("id", menu_id).execute()


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
    week_start = _monday_of(payload.week_start_date)
    _reject_if_week_taken(week_start)
    try:
        return generate_weekly_menu(
            week_start, payload.budget, payload.extra_instructions, payload.portions
        )
    except MenuAIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/manual", response_model=WeeklyMenuDetail, status_code=201)
def create_manual_menu(payload: WeeklyMenuCreateManual):
    """Yemek Kategorisi kataloğundan elle yemek seçilerek doldurulacak boş bir haftalık menü oluşturur."""
    week_start = _monday_of(payload.week_start_date)
    _reject_if_week_taken(week_start)
    res = get_db().table("weekly_menus").insert({
        "week_start_date": week_start.isoformat(),
        "budget": payload.budget,
        "portions": max(payload.portions, 1),
        "total_cost": 0,
        "total_calories": 0,
        "total_protein": 0,
        "total_iron": 0,
        "status": "draft",
    }).execute()
    return {**res.data[0], "items": []}


@router.post("/{menu_id}/items", response_model=WeeklyMenuDetail, status_code=201)
def add_meal_item(menu_id: int, payload: WeeklyMenuMealItemCreate):
    db = get_db()
    menu_res = db.table("weekly_menus").select("id, portions").eq("id", menu_id).single().execute()
    if not menu_res.data:
        raise HTTPException(status_code=404, detail="Menu not found")
    menu_portions = max(menu_res.data.get("portions") or 40, 1)

    meal_res = db.table("meals").select(
        "id, name, portions, calories, protein, iron, meal_ingredients(quantity, ingredients(price))"
    ).eq("id", payload.meal_id).single().execute()
    if not meal_res.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    meal = meal_res.data

    recipe_portions = max(meal["portions"], 1)
    total_ingredient_cost = sum(
        float(mi["quantity"]) * float((mi.get("ingredients") or {}).get("price") or 0)
        for mi in (meal.get("meal_ingredients") or [])
    )
    estimated_cost = round(total_ingredient_cost / recipe_portions, 2)

    # Kalem porsiyonu, menü seviyesindeki "kaç kişi" değerine eşitlenir (Dashboard bunu kullanır).
    db.table("weekly_menu_items").insert({
        "weekly_menu_id": menu_id,
        "day_of_week": payload.day_of_week,
        "category": payload.category,
        "meal_id": meal["id"],
        "meal_name": meal["name"],
        "portions": menu_portions,
        "estimated_cost": estimated_cost,
        "calories": meal["calories"],
        "protein": meal["protein"],
        "iron": meal["iron"],
    }).execute()

    _recompute_menu_totals(menu_id)

    final = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu_id).execute()
    return {**final.data, "items": items_res.data}


@router.patch("/{menu_id}/portions", response_model=WeeklyMenuDetail)
def update_menu_portions(menu_id: int, payload: WeeklyMenuPortionsUpdate):
    """Menü seviyesindeki kişi/porsiyon sayısını değiştirir; tüm kalemlerin porsiyonunu eşitler,
    toplam maliyeti orantılı yeniden hesaplar. Onaylı menülerde de çalışır."""
    if payload.portions < 1:
        raise HTTPException(status_code=400, detail="portions en az 1 olmalı")
    db = get_db()
    menu_res = db.table("weekly_menus").select("id").eq("id", menu_id).single().execute()
    if not menu_res.data:
        raise HTTPException(status_code=404, detail="Menu not found")

    db.table("weekly_menus").update({"portions": payload.portions}).eq("id", menu_id).execute()
    db.table("weekly_menu_items").update({"portions": payload.portions}).eq("weekly_menu_id", menu_id).execute()
    _recompute_menu_totals(menu_id)

    final = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu_id).execute()
    return {**final.data, "items": items_res.data}


@router.patch("/{menu_id}/items/{item_id}", response_model=WeeklyMenuDetail)
def update_item_portions(menu_id: int, item_id: int, payload: WeeklyMenuItemPortionsUpdate):
    """Tek bir menü kaleminin (yemeğin) kişi/porsiyon sayısını değiştirir; ör. çorbayı
    daha az kişi içeceği için ayrı ayarlanabilir. Toplam maliyet yeniden hesaplanır."""
    if payload.portions < 1:
        raise HTTPException(status_code=400, detail="portions en az 1 olmalı")
    db = get_db()
    upd = (
        db.table("weekly_menu_items")
        .update({"portions": payload.portions})
        .eq("id", item_id)
        .eq("weekly_menu_id", menu_id)
        .execute()
    )
    if not upd.data:
        raise HTTPException(status_code=404, detail="Menu item not found")
    _recompute_menu_totals(menu_id)
    final = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu_id).execute()
    return {**final.data, "items": items_res.data}


@router.patch("/{menu_id}/items/{item_id}/meal", response_model=WeeklyMenuDetail)
def replace_item_meal(menu_id: int, item_id: int, payload: WeeklyMenuItemMealUpdate):
    """Menü kalemindeki yemeği başka bir yemekle değiştirir (mevsimsel revizyon uygulaması).
    Kalemin kişi/porsiyon sayısı korunur; maliyet/besin değerleri yeni yemeğe göre güncellenir."""
    db = get_db()
    item_res = (
        db.table("weekly_menu_items")
        .select("id")
        .eq("id", item_id)
        .eq("weekly_menu_id", menu_id)
        .execute()
    )
    if not item_res.data:
        raise HTTPException(status_code=404, detail="Menu item not found")

    meal_res = (
        db.table("meals")
        .select("id, name, category, portions, calories, protein, iron, meal_ingredients(quantity, ingredients(price))")
        .eq("id", payload.meal_id)
        .execute()
    )
    if not meal_res.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    meal = meal_res.data[0]

    recipe_portions = max(meal.get("portions") or 1, 1)
    total_ingredient_cost = sum(
        float(mi["quantity"]) * float((mi.get("ingredients") or {}).get("price") or 0)
        for mi in (meal.get("meal_ingredients") or [])
    )
    estimated_cost = round(total_ingredient_cost / recipe_portions, 2)

    db.table("weekly_menu_items").update({
        "meal_id": meal["id"],
        "meal_name": meal["name"],
        "estimated_cost": estimated_cost,
        "calories": meal.get("calories") or 0,
        "protein": meal.get("protein") or 0,
        "iron": meal.get("iron") or 0,
    }).eq("id", item_id).execute()

    _recompute_menu_totals(menu_id)
    final = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu_id).execute()
    return {**final.data, "items": items_res.data}


@router.delete("/{menu_id}/items/{item_id}", response_model=WeeklyMenuDetail)
def remove_menu_item(menu_id: int, item_id: int):
    db = get_db()
    db.table("weekly_menu_items").delete().eq("id", item_id).eq("weekly_menu_id", menu_id).execute()
    _recompute_menu_totals(menu_id)
    final = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    if not final.data:
        raise HTTPException(status_code=404, detail="Menu not found")
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu_id).execute()
    return {**final.data, "items": items_res.data}


@router.patch("/{menu_id}/status", response_model=WeeklyMenu)
def update_menu_status(menu_id: int, payload: WeeklyMenuStatusUpdate):
    if payload.status not in ("draft", "approved"):
        raise HTTPException(status_code=400, detail="status must be 'draft' or 'approved'")
    db = get_db()
    menu = db.table("weekly_menus").select("week_start_date").eq("id", menu_id).single().execute()
    if not menu.data:
        raise HTTPException(status_code=404, detail="Menu not found")

    if payload.status == "approved":
        # Haftada tek onaylı menü: aynı takvim haftasında (Pzt–Paz) başlayan diğer onaylıları taslağa çek.
        monday = _monday_of(date.fromisoformat(menu.data["week_start_date"]))
        db.table("weekly_menus").update({"status": "draft"}).gte(
            "week_start_date", monday.isoformat()
        ).lte(
            "week_start_date", (monday + timedelta(days=6)).isoformat()
        ).eq("status", "approved").neq("id", menu_id).execute()

    res = db.table("weekly_menus").update({"status": payload.status}).eq("id", menu_id).execute()
    return res.data[0]


@router.get("/{menu_id}/seasonal-revisions", response_model=SeasonalMenuRevisionResponse)
def get_seasonal_revisions(menu_id: int):
    try:
        return suggest_seasonal_revisions(menu_id)
    except MenuAIError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{menu_id}", status_code=204)
def delete_menu(menu_id: int):
    get_db().table("weekly_menus").delete().eq("id", menu_id).execute()
