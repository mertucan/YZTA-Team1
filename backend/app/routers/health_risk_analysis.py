import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.catering_management.core.database import get_db
from app.services.analytics import (
    ensure_schema,
    get_history_statistics,
    get_latest_statistics,
    get_monthly_statistics,
)

router = APIRouter(prefix="/health-risk-analysis", tags=["health-risk-analysis"])


@router.get("/statistics/latest")
def latest_statistics(db: Session = Depends(get_db)):
    return get_latest_statistics(db)


@router.get("/statistics/history")
def history_statistics(months: int = 6, db: Session = Depends(get_db)):
    return get_history_statistics(db, months)


@router.get("/statistics/monthly/{year}/{month}")
def monthly_statistics(year: int, month: int, db: Session = Depends(get_db)):
    return get_monthly_statistics(db, year, month)


@router.post("/schema")
def create_statistics_schema(db: Session = Depends(get_db)):
    # Bu uç DDL (şema oluşturma/değiştirme) çalıştırır. İnternete açık bir uçtan
    # DDL tetiklenmesini engellemek için varsayılan olarak kapalıdır; yalnızca
    # kurulum sırasında ALLOW_SCHEMA_ENDPOINT=1 ortam değişkeni ile açılır.
    if os.getenv("ALLOW_SCHEMA_ENDPOINT", "").strip().lower() not in {"1", "true", "yes"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu uç devre dışı. Kurulum için ALLOW_SCHEMA_ENDPOINT ortam değişkenini etkinleştirin.",
        )
    ensure_schema(db)
    return {"status": "ok"}
