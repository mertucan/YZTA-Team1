import csv
import hashlib
import hmac
from datetime import date
from io import StringIO
from typing import Any

from app.config import settings
from app.database import get_db

EXPORT_FIELDS = [
    "subject_code",
    "age_group",
    "consumed_at",
    "meal_name",
    "meal_category",
    "calories",
    "protein",
    "iron",
]
PAGE_SIZE = 1000


def _subject_code(student_id: Any) -> str:
    salt = settings.research_export_salt or settings.supabase_service_role_key
    digest = hmac.new(str(salt).encode(), str(student_id).encode(), hashlib.sha256).hexdigest()
    return f"SUB-{digest[:12].upper()}"


def _age_group(age: Any) -> str | None:
    if age is None:
        return None
    try:
        value = int(age)
    except (TypeError, ValueError):
        return None
    if value < 18:
        return "0-17"
    if value <= 24:
        return "18-24"
    if value <= 34:
        return "25-34"
    if value <= 44:
        return "35-44"
    if value <= 54:
        return "45-54"
    return "55+"


def fetch_anonymized_nutrition_rows(
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0

    while True:
        query = (
            get_db()
            .table("student_meals")
            .select(
                "id, consumed_at, student_id, "
                "students(id, age), "
                "meals(name, category, calories, protein, iron)"
            )
            .order("consumed_at", desc=False)
            .range(offset, offset + PAGE_SIZE - 1)
        )

        if start_date:
            query = query.gte("consumed_at", start_date.isoformat())
        if end_date:
            query = query.lte("consumed_at", f"{end_date.isoformat()}T23:59:59")

        result = query.execute()
        records = result.data or []

        for record in records:
            student = record.get("students") or {}
            meal = record.get("meals") or {}
            rows.append(
                {
                    "subject_code": _subject_code(record.get("student_id")),
                    "age_group": _age_group(student.get("age")),
                    "consumed_at": record.get("consumed_at"),
                    "meal_name": meal.get("name"),
                    "meal_category": meal.get("category"),
                    "calories": meal.get("calories") or 0,
                    "protein": meal.get("protein") or 0,
                    "iron": meal.get("iron") or 0,
                }
            )

        if len(records) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return rows


def build_export_preview(rows: list[dict[str, Any]]) -> dict[str, Any]:
    dates = [row["consumed_at"] for row in rows if row.get("consumed_at")]
    subject_count = len({row["subject_code"] for row in rows})
    export_allowed = subject_count >= settings.research_export_min_subjects
    suppression_reason = None
    if not rows:
        suppression_reason = "Seçilen aralıkta export edilecek kayıt bulunamadı."
    elif not export_allowed:
        suppression_reason = (
            f"Anonimlik için en az {settings.research_export_min_subjects} farklı özne gerekir."
        )
    return {
        "record_count": len(rows),
        "subject_count": subject_count,
        "date_min": min(dates) if dates else None,
        "date_max": max(dates) if dates else None,
        "fields": EXPORT_FIELDS,
        "export_allowed": export_allowed,
        "suppression_reason": suppression_reason,
        "min_subjects": settings.research_export_min_subjects,
    }


def rows_to_csv(rows: list[dict[str, Any]]) -> str:
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=EXPORT_FIELDS, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def rows_to_csv_bytes(rows: list[dict[str, Any]]) -> bytes:
    return rows_to_csv(rows).encode("utf-8-sig")
