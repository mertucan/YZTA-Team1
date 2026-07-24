from collections import defaultdict
from datetime import date

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.expense import Expense, ExpenseCreate, ExpenseUpdate

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("/", response_model=list[Expense])
def list_expenses():
    res = get_db().table("expenses").select("*").order("expense_date", desc=True).execute()
    return res.data


@router.get("/summary")
def expense_summary():
    """Harcama özeti: toplam, kategori dağılımı, aylık trend, en büyük gider.
    Yönetici paneli + AI analizinin beslendiği kaynak."""
    rows = get_db().table("expenses").select("*").execute().data
    total = sum(float(r.get("amount") or 0) for r in rows)

    by_category = defaultdict(float)
    by_month = defaultdict(float)
    for r in rows:
        by_category[r.get("category") or "Diğer"] += float(r.get("amount") or 0)
        d = str(r.get("expense_date") or "")[:7]  # YYYY-MM
        if d:
            by_month[d] += float(r.get("amount") or 0)

    biggest = max(rows, key=lambda r: float(r.get("amount") or 0), default=None)
    return {
        "total": round(total, 2),
        "count": len(rows),
        "by_category": [{"category": k, "amount": round(v, 2)} for k, v in
                        sorted(by_category.items(), key=lambda x: x[1], reverse=True)],
        "by_month": [{"month": k, "amount": round(v, 2)} for k, v in sorted(by_month.items())],
        "biggest": biggest,
    }


@router.post("/", response_model=Expense, status_code=201)
def create_expense(payload: ExpenseCreate):
    res = get_db().table("expenses").insert(payload.model_dump(mode="json")).execute()
    return res.data[0]


@router.patch("/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, payload: ExpenseUpdate):
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = get_db().table("expenses").update(updates).eq("id", expense_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    return res.data[0]


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int):
    get_db().table("expenses").delete().eq("id", expense_id).execute()
