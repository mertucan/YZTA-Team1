from fastapi import APIRouter, Depends
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
    ensure_schema(db)
    return {"status": "ok"}
