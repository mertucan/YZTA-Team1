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


@router.patch("/{menu_id}/status")
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
    result = dict(res.data[0])

    # Onay → tedarik bağlantısı: menü onaylanınca eksikler hesaplanır; frontend
    # "AI sipariş planı oluşturulsun mu?" diye sorar (modüller arası kapalı döngü).
    if payload.status == "approved":
        from app.services.stock import compute_alerts
        shortages = compute_alerts(db)["shortages"]
        result["shortage_count"] = len(shortages)
        result["shortage_preview"] = [
            {"name": s["name"], "shortage": s["shortage"], "unit": s["unit"]}
            for s in shortages[:5]
        ]
    return result


@router.get("/{menu_id}/attendance")
def attendance_suggestion(menu_id: int):
    """Devamsızlık → porsiyon bağlantısı: menü haftasının her günü için kayıtlı
    devamsızlığa göre beklenen kişi sayısını ve porsiyon önerisini hesaplar.
    (Ör: '29 Tem: 40 öğrenci devamsız → porsiyonu 150'den 110'a düşür')"""
    db = get_db()
    menu = db.table("weekly_menus").select("id, week_start_date, portions").eq("id", menu_id).single().execute()
    if not menu.data:
        raise HTTPException(status_code=404, detail="Menu not found")
    monday = date.fromisoformat(menu.data["week_start_date"])
    base_portions = int(menu.data.get("portions") or 0)

    total_students = len(db.table("students").select("id").execute().data)
    days_tr = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

    absences = db.table("student_absences").select("absence_date").gte(
        "absence_date", monday.isoformat()
    ).lte("absence_date", (monday + timedelta(days=6)).isoformat()).execute().data
    absent_by_date: dict[str, int] = {}
    for a in absences:
        absent_by_date[a["absence_date"]] = absent_by_date.get(a["absence_date"], 0) + 1

    items = db.table("weekly_menu_items").select("day_of_week, portions").eq(
        "weekly_menu_id", menu_id
    ).execute().data
    current_by_day = {}
    for it in items:
        current_by_day[it["day_of_week"]] = max(
            current_by_day.get(it["day_of_week"], 0), int(it.get("portions") or 0))

    rows, potential_savings = [], 0.0
    per_portion_cost = 0.0
    menu_row = db.table("weekly_menus").select("total_cost, portions").eq("id", menu_id).single().execute().data
    if menu_row and menu_row.get("portions"):
        per_portion_cost = float(menu_row.get("total_cost") or 0) / (7 * max(int(menu_row["portions"]), 1))

    for offset in range(7):
        d = monday + timedelta(days=offset)
        day_name = days_tr[offset]
        if day_name not in current_by_day:
            continue  # o gün menüde yemek yok
        absent = absent_by_date.get(d.isoformat(), 0)
        current = current_by_day[day_name]
        suggested = max(current - absent, 1)
        saving = round((current - suggested) * per_portion_cost, 2) if suggested < current else 0.0
        potential_savings += saving
        rows.append({
            "date": d.isoformat(), "day_of_week": day_name,
            "absent": absent, "current_portions": current,
            "suggested_portions": suggested, "change": suggested - current,
            "estimated_saving": saving,
        })
    return {
        "menu_id": menu_id, "total_students": total_students,
        "base_portions": base_portions, "days": rows,
        "total_estimated_saving": round(potential_savings, 2),
        "has_changes": any(r["change"] != 0 for r in rows),
    }


@router.post("/{menu_id}/apply-attendance", response_model=WeeklyMenuDetail)
def apply_attendance(menu_id: int):
    """Devamsızlık önerisini uygular: her günün kalem porsiyonları beklenen kişi
    sayısına çekilir, menü maliyeti yeniden hesaplanır."""
    db = get_db()
    suggestion = attendance_suggestion(menu_id)
    changed = 0
    for day in suggestion["days"]:
        if day["change"] == 0:
            continue
        db.table("weekly_menu_items").update(
            {"portions": day["suggested_portions"]}
        ).eq("weekly_menu_id", menu_id).eq("day_of_week", day["day_of_week"]).execute()
        changed += 1
    if changed:
        _recompute_menu_totals(menu_id)
    final = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu_id).execute()
    return {**final.data, "items": items_res.data}


@router.get("/{menu_id}/seasonal-revisions", response_model=SeasonalMenuRevisionResponse)
def get_seasonal_revisions(menu_id: int):
    try:
        return suggest_seasonal_revisions(menu_id)
    except MenuAIError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{menu_id}", status_code=204)
def delete_menu(menu_id: int):
    get_db().table("weekly_menus").delete().eq("id", menu_id).execute()
