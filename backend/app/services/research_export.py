import csv
import hashlib
import hmac
import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from io import StringIO
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings

PAGE_SIZE = 1000


@dataclass(frozen=True)
class ExportTable:
    id: str
    label: str
    description: str
    fields: tuple[str, ...]
    query: str
    date_field: str | None = None
    contains_subjects: bool = False
    requires_min_subjects: bool = False
    required_columns: tuple[str, ...] = ()


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


def _ascii_text(value: str) -> str:
    repaired = value
    mojibake_markers = ("Ã", "Ä", "Å")
    if any(marker in repaired for marker in mojibake_markers):
        for encoding in ("latin1", "cp1252"):
            try:
                candidate = repaired.encode(encoding).decode("utf-8")
            except UnicodeError:
                continue
            if not any(marker in candidate for marker in mojibake_markers):
                repaired = candidate
                break

    replacements = {
        "ı": "i",
        "İ": "I",
        "ş": "s",
        "Ş": "S",
        "ğ": "g",
        "Ğ": "G",
        "ü": "u",
        "Ü": "U",
        "ö": "o",
        "Ö": "O",
        "ç": "c",
        "Ç": "C",
    }
    translated = "".join(replacements.get(char, char) for char in repaired)
    normalized = unicodedata.normalize("NFKD", translated)
    return normalized.encode("ascii", "ignore").decode("ascii")


def _format_csv_value(value: Any) -> Any:
    if isinstance(value, str):
        return _ascii_text(value)
    if isinstance(value, Decimal):
        return f"{float(value):.2f}".replace(".", ",")
    if isinstance(value, float):
        return f"{value:.2f}".replace(".", ",")
    return value


def _table_exists(db: Session, table_name: str) -> bool:
    return bool(db.execute(text("select to_regclass(:name)"), {"name": f"public.{table_name}"}).scalar())


def _has_required_columns(db: Session, table_name: str, columns: tuple[str, ...]) -> bool:
    if not columns:
        return True
    result = db.execute(
        text(
            """
            select column_name
            from information_schema.columns
            where table_schema = 'public' and table_name = :table_name
            """
        ),
        {"table_name": table_name},
    )
    existing = {row._mapping["column_name"] for row in result.all()}
    return set(columns).issubset(existing)


def _rows_from_query(
    db: Session,
    export_table: ExportTable,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    date_clause = ""
    params: dict[str, Any] = {}

    if export_table.date_field and start_date:
        date_clause += f" and {export_table.date_field} >= :start_date"
        params["start_date"] = start_date
    if export_table.date_field and end_date:
        date_clause += f" and {export_table.date_field} <= :end_date"
        params["end_date"] = end_date

    while True:
        page_params = {**params, "limit": PAGE_SIZE, "offset": offset}
        page_sql = export_table.query.format(date_clause=date_clause)
        result = db.execute(text(page_sql), page_params)
        records = [dict(row._mapping) for row in result.all()]
        rows.extend(records)
        if len(records) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return rows


def _date_clause_params(
    export_table: ExportTable,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[str, dict[str, Any]]:
    date_clause = ""
    params: dict[str, Any] = {}

    if export_table.date_field and start_date:
        date_clause += f" and {export_table.date_field} >= :start_date"
        params["start_date"] = start_date
    if export_table.date_field and end_date:
        date_clause += f" and {export_table.date_field} <= :end_date"
        params["end_date"] = end_date

    return date_clause, params


def _unpaged_select_sql(export_table: ExportTable, date_clause: str) -> str:
    page_sql = export_table.query.format(date_clause=date_clause)
    return re.sub(
        r"\s+order\s+by[\s\S]+?limit\s+:limit\s+offset\s+:offset\s*$",
        "",
        page_sql.strip(),
        flags=re.IGNORECASE,
    )


def _preview_counts(
    db: Session,
    export_table: ExportTable,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[int, int]:
    if export_table.id == "students":
        record_count = int(db.execute(text("select count(*) from students")).scalar() or 0)
        return record_count, record_count

    date_clause, params = _date_clause_params(export_table, start_date=start_date, end_date=end_date)
    base_sql = _unpaged_select_sql(export_table, date_clause)
    record_count = int(
        db.execute(text(f"select count(*) from ({base_sql}) export_rows"), params).scalar() or 0
    )
    subject_count = 0
    if export_table.contains_subjects:
        subject_count = int(
            db.execute(
                text(f"select count(distinct student_id) from ({base_sql}) export_rows where student_id is not null"),
                params,
            ).scalar()
            or 0
        )
    return record_count, subject_count


def _student_rows(db: Session) -> list[dict[str, Any]]:
    result = db.execute(text("select id, age from students order by id limit :limit"), {"limit": PAGE_SIZE * 20})
    return [
        {"subject_code": _subject_code(row._mapping["id"]), "age_group": _age_group(row._mapping["age"])}
        for row in result.all()
    ]


EXPORT_TABLES: tuple[ExportTable, ...] = (
    ExportTable(
        id="meal_consumptions",
        label="Yemek tüketimleri",
        description="Ogrenci tuketim kayitlari; ogrenci id anonim subject_code olarak aktarilir.",
        fields=("consumption_id", "subject_code", "age_group", "meal_id", "meal_name", "meal_category", "consumed_at"),
        date_field="sm.consumed_at::date",
        contains_subjects=True,
        requires_min_subjects=True,
        query="""
            select
              sm.id as consumption_id,
              sm.student_id,
              s.age,
              sm.meal_id,
              m.name as meal_name,
              m.category as meal_category,
              sm.consumed_at
            from meal_consumptions sm
            left join students s on s.id = sm.student_id
            left join meals m on m.id = sm.meal_id
            where 1=1 {date_clause}
            order by sm.consumed_at, sm.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="student_meals",
        label="Öğrenci yemekleri",
        description="Alternatif tuketim kayitlari; kimlik alani yerine anonim subject_code verilir.",
        fields=("consumption_id", "subject_code", "age_group", "meal_id", "meal_name", "meal_category", "consumed_at"),
        date_field="sm.consumed_at::date",
        contains_subjects=True,
        requires_min_subjects=True,
        query="""
            select
              sm.id as consumption_id,
              sm.student_id,
              s.age,
              sm.meal_id,
              m.name as meal_name,
              m.category as meal_category,
              sm.consumed_at
            from student_meals sm
            left join students s on s.id = sm.student_id
            left join meals m on m.id = sm.meal_id
            where 1=1 {date_clause}
            order by sm.consumed_at, sm.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="students",
        label="Öğrenci demografisi",
        description="Ad, soyad ve TC kimlik numarasi olmadan yalniz anonim kod ve yas grubu.",
        fields=("subject_code", "age_group"),
        contains_subjects=True,
        requires_min_subjects=True,
        query="",
    ),
    ExportTable(
        id="student_health_flags",
        label="Sağlık bayrakları",
        description="Saglik durumu etiketleri; ogrenci kimligi anonim subject_code ile aktarilir.",
        fields=("flag_id", "subject_code", "age_group", "condition_type", "flag_label", "severity", "is_active", "created_at"),
        date_field="f.created_at::date",
        contains_subjects=True,
        requires_min_subjects=True,
        query="""
            select
              f.id as flag_id,
              f.student_id,
              s.age,
              f.condition_type,
              f.flag_label,
              f.severity,
              f.is_active,
              f.created_at
            from student_health_flags f
            left join students s on s.id = f.student_id
            where 1=1 {date_clause}
            order by f.created_at, f.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="meals",
        label="Yemek kataloğu",
        description="Yemek id, ad ve besin degerleri. Tuketim tablolarini yorumlamak icin guvenli sozluk.",
        fields=("id", "name", "category", "portions", "calories", "protein", "iron"),
        query="""
            select id, name, category, portions, calories, protein, iron
            from meals
            where 1=1 {date_clause}
            order by id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="meal_nutrition",
        label="Yemek besin analizi",
        description="Supabase meal_nutrition gorunumu/tablosu; meal_id ve yemek adiyla aktarilir.",
        fields=("meal_id", "name", "calories", "protein", "iron", "fiber", "category"),
        query="""
            select meal_id, name, calories, protein, iron, fiber, category
            from meal_nutrition
            where 1=1 {date_clause}
            order by meal_id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="meal_ratings",
        label="Yemek puanları",
        description="Kisi bilgisi icermeyen yemek puani olcumleri.",
        fields=("id", "score"),
        query="select id, score from meal_ratings where 1=1 {date_clause} order by id limit :limit offset :offset",
    ),
    ExportTable(
        id="meal_ingredients",
        label="Yemek malzeme ilişkisi",
        description="Yemek ve malzeme adlariyla tarif icerigi.",
        fields=("id", "meal_id", "meal_name", "ingredient_id", "ingredient_name", "quantity"),
        query="""
            select mi.id, mi.meal_id, m.name as meal_name, mi.ingredient_id, i.name as ingredient_name, mi.quantity
            from meal_ingredients mi
            left join meals m on m.id = mi.meal_id
            left join ingredients i on i.id = mi.ingredient_id
            where 1=1 {date_clause}
            order by mi.meal_id, mi.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="ingredients",
        label="Malzemeler",
        description="Malzeme stok, besin, fiyat ve yerellik bilgileri.",
        fields=("id", "name", "unit", "stock", "calories", "price", "protein", "iron", "is_local", "origin_region", "season_start_month", "season_end_month", "market_price", "last_price_checked_at"),
        date_field="last_price_checked_at",
        query="""
            select id, name, unit, stock, calories, price, protein, iron, is_local, origin_region,
                   season_start_month, season_end_month, market_price, last_price_checked_at
            from ingredients
            where 1=1 {date_clause}
            order by id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="ingredient_batches",
        label="Malzeme parti stokları",
        description="Parti, son kullanma ve maliyet verileri; malzeme adiyla birlikte.",
        fields=("id", "ingredient_id", "ingredient_name", "quantity", "purchase_date", "expiry_date", "unit_price", "created_at"),
        date_field="purchase_date",
        query="""
            select b.id, b.ingredient_id, i.name as ingredient_name, b.quantity, b.purchase_date,
                   b.expiry_date, b.unit_price, b.created_at
            from ingredient_batches b
            left join ingredients i on i.id = b.ingredient_id
            where 1=1 {date_clause}
            order by b.purchase_date, b.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="ingredient_carbon_factors",
        label="Malzeme karbon faktörleri",
        description="Malzeme bazli CO2 katsayilari.",
        fields=("id", "ingredient_id", "ingredient_name", "co2_per_unit"),
        query="""
            select f.id, f.ingredient_id, i.name as ingredient_name, f.co2_per_unit
            from ingredient_carbon_factors f
            left join ingredients i on i.id = f.ingredient_id
            where 1=1 {date_clause}
            order by f.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="ingredient_market_prices",
        label="Market fiyat eşleşmeleri",
        description="Malzeme market fiyatlari; urun URL'si aktarilmaz.",
        fields=("id", "ingredient_id", "ingredient_name", "source", "product_name", "pack_quantity", "pack_unit", "last_price", "unit_price", "unit_matched", "checked_at"),
        date_field="p.checked_at::date",
        query="""
            select p.id, p.ingredient_id, i.name as ingredient_name, p.source, p.product_name,
                   p.pack_quantity, p.pack_unit, p.last_price, p.unit_price, p.unit_matched, p.checked_at
            from ingredient_market_prices p
            left join ingredients i on i.id = p.ingredient_id
            where 1=1 {date_clause}
            order by p.checked_at, p.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="weekly_menus",
        label="Haftalık menüler",
        description="Menu ozetleri ve besin toplamları.",
        fields=("id", "name", "week_start_date", "budget", "total_cost", "total_calories", "total_protein", "total_iron", "status", "portions", "created_at"),
        date_field="week_start_date",
        query="""
            select id, name, week_start_date, budget, total_cost, total_calories, total_protein,
                   total_iron, status, portions, created_at
            from weekly_menus
            where 1=1 {date_clause}
            order by week_start_date, id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="weekly_menu_items",
        label="Haftalık menü kalemleri",
        description="Menu satirlari; yemek/malzeme/partner urun adlariyla okunabilir hale getirilir.",
        fields=("id", "weekly_menu_id", "day_of_week", "meal_name", "meal_id", "meal_catalog_name", "ingredient_id", "ingredient_name", "quantity", "estimated_cost", "calories", "protein", "iron", "category", "portions", "source", "partner_product_name"),
        query="""
            select wmi.id, wmi.weekly_menu_id, wmi.day_of_week, wmi.meal_name, wmi.meal_id,
                   m.name as meal_catalog_name, wmi.ingredient_id, i.name as ingredient_name,
                   wmi.quantity, wmi.estimated_cost, wmi.calories, wmi.protein, wmi.iron,
                   wmi.category, wmi.portions, wmi.source, p.product_name as partner_product_name
            from weekly_menu_items wmi
            left join meals m on m.id = wmi.meal_id
            left join ingredients i on i.id = wmi.ingredient_id
            left join partner_product_integrations p on p.id = wmi.partner_product_integration_id
            where 1=1 {date_clause}
            order by wmi.weekly_menu_id, wmi.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="nutrition_statistics",
        label="Beslenme istatistikleri",
        description="Kurum/ay bazli aggregate risk ve beslenme metrikleri.",
        fields=("id", "report_date", "university_id", "university_name", "analyzed_meals", "avg_calorie", "avg_protein", "avg_iron", "avg_fiber", "healthy_menu_ratio", "vegetable_ratio", "dessert_ratio", "high_calorie_ratio", "iron_rich_ratio", "protein_adequacy_ratio", "fiber_adequacy_ratio", "obesity_risk_ratio", "anemia_risk_ratio", "created_at"),
        date_field="n.report_date",
        query="""
            select n.id, n.report_date, n.university_id, u.university_name, n.analyzed_meals,
                   n.avg_calorie, n.avg_protein, n.avg_iron, n.avg_fiber, n.healthy_menu_ratio,
                   n.vegetable_ratio, n.dessert_ratio, n.high_calorie_ratio, n.iron_rich_ratio,
                   n.protein_adequacy_ratio, n.fiber_adequacy_ratio, n.obesity_risk_ratio,
                   n.anemia_risk_ratio, n.created_at
            from nutrition_statistics n
            left join universities u on u.id = n.university_id
            where 1=1 {date_clause}
            order by n.report_date, n.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="universities",
        label="Üniversiteler",
        description="Kurum bilgileri; sirket ile birlikte aggregate baglam saglar.",
        fields=("id", "university_name", "city", "student_count", "status", "created_at", "company_id", "company_name"),
        query="""
            select u.id, u.university_name, u.city, u.student_count, u.status, u.created_at,
                   u.company_id, c.company_name
            from universities u
            left join companies c on c.id = u.company_id
            where 1=1 {date_clause}
            order by u.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="companies",
        label="Şirketler",
        description="Sirket sozlugu; vergi, telefon, email ve adres aktarilmaz.",
        fields=("id", "company_name", "status", "created_at"),
        query="select id, company_name, status, created_at from companies where 1=1 {date_clause} order by id limit :limit offset :offset",
    ),
    ExportTable(
        id="university_menu_assignments",
        label="Üniversite menü atamaları",
        description="Kurum-menu atama bilgisi; atayan kullanici id'si anonimlestirilir.",
        fields=("id", "menu_id", "start_date", "end_date", "status", "is_published", "created_at", "company_id", "company_name", "university_id", "university_name", "assigned_by_code", "weekly_menu_id"),
        date_field="a.start_date",
        query="""
            select a.id, a.menu_id, a.start_date, a.end_date, a.status, a.is_published,
                   a.created_at, a.company_id, c.company_name, a.university_id, u.university_name,
                   a.assigned_by, a.weekly_menu_id
            from university_menu_assignments a
            left join companies c on c.id = a.company_id
            left join universities u on u.id = a.university_id
            where 1=1 {date_clause}
            order by a.start_date, a.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="partner_product_integrations",
        label="Partner ürün entegrasyonları",
        description="Partner urun onerileri; submitted_by/reviewed_by kullanici id'leri anonim kodlanir.",
        fields=("id", "company_id", "company_name", "submitted_by_code", "reviewed_by_code", "partner_company_name", "brand_name", "product_name", "product_category", "suggested_menu_category", "serving_size", "calories", "protein", "sugar", "sodium", "target_segments", "allergens", "status", "created_at", "updated_at"),
        date_field="p.created_at::date",
        query="""
            select p.id, p.company_id, c.company_name, p.submitted_by, p.reviewed_by,
                   p.partner_company_name, p.brand_name, p.product_name, p.product_category,
                   p.suggested_menu_category, p.serving_size, p.calories, p.protein, p.sugar,
                   p.sodium, p.target_segments, p.allergens, p.status, p.created_at, p.updated_at
            from partner_product_integrations p
            left join companies c on c.id = p.company_id
            where 1=1 {date_clause}
            order by p.created_at, p.id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="analysis_reports",
        label="Analiz raporları",
        description="Varsa kayitli analiz raporlari; tablo mevcutsa export edilir.",
        fields=("id", "title", "report_type", "status", "created_at", "updated_at"),
        required_columns=("id", "title", "report_type", "status", "created_at", "updated_at"),
        date_field="created_at::date",
        query="""
            select id, title, report_type, status, created_at, updated_at
            from analysis_reports
            where 1=1 {date_clause}
            order by created_at, id
            limit :limit offset :offset
        """,
    ),
    ExportTable(
        id="menu_sustainability_reports",
        label="Menü sürdürülebilirlik raporları",
        description="Varsa menu surdurulebilirlik raporlari; kisi verisi icermeyen metrikler.",
        fields=("id", "weekly_menu_id", "total_co2", "local_ingredient_ratio", "seasonal_ingredient_ratio", "created_at"),
        required_columns=("id", "weekly_menu_id", "total_co2", "local_ingredient_ratio", "seasonal_ingredient_ratio", "created_at"),
        date_field="created_at::date",
        query="""
            select id, weekly_menu_id, total_co2, local_ingredient_ratio, seasonal_ingredient_ratio, created_at
            from menu_sustainability_reports
            where 1=1 {date_clause}
            order by created_at, id
            limit :limit offset :offset
        """,
    ),
)

EXPORT_TABLE_BY_ID = {table.id: table for table in EXPORT_TABLES}


def list_export_tables(db: Session) -> list[dict[str, Any]]:
    available = []
    for export_table in EXPORT_TABLES:
        table_name = export_table.id
        if table_name == "students" or (
            _table_exists(db, table_name)
            and _has_required_columns(db, table_name, export_table.required_columns)
        ):
            available.append(
                {
                    "id": export_table.id,
                    "label": export_table.label,
                    "description": export_table.description,
                    "fields": export_table.fields,
                    "contains_subjects": export_table.contains_subjects,
                    "requires_min_subjects": export_table.requires_min_subjects,
                }
            )
    return available


def normalize_table_ids(table_ids: list[str] | None) -> list[str]:
    if not table_ids:
        return ["student_meals"]
    seen = set()
    normalized = []
    for table_id in table_ids:
        if table_id in EXPORT_TABLE_BY_ID and table_id not in seen:
            normalized.append(table_id)
            seen.add(table_id)
    return normalized


def fetch_export_rows(
    db: Session,
    table_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    export_table = EXPORT_TABLE_BY_ID[table_id]
    if table_id == "students":
        rows = _student_rows(db)
    else:
        rows = _rows_from_query(db, export_table, start_date=start_date, end_date=end_date)
    return [_transform_row(row) for row in rows]


def build_export_preview(
    db: Session,
    table_ids: list[str] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    selected = normalize_table_ids(table_ids)
    table_previews = []
    total_records = 0
    total_subject_count = 0

    for table_id in selected:
        table = EXPORT_TABLE_BY_ID[table_id]
        record_count, subject_count = _preview_counts(
            db,
            table,
            start_date=start_date,
            end_date=end_date,
        )
        total_records += record_count
        total_subject_count = max(total_subject_count, subject_count)
        table_previews.append(
            {
                "id": table.id,
                "label": table.label,
                "record_count": record_count,
                "subject_count": subject_count,
                "fields": table.fields,
                "contains_subjects": table.contains_subjects,
                "requires_min_subjects": table.requires_min_subjects,
            }
        )

    restricted_tables = [
        table for table in table_previews
        if table["requires_min_subjects"] and table["record_count"] > 0 and table["subject_count"] < settings.research_export_min_subjects
    ]
    export_allowed = total_records > 0 and not restricted_tables
    suppression_reason = None
    if total_records == 0:
        suppression_reason = "Secilen tablolar ve tarih araliginda export edilecek kayit bulunamadi."
    elif restricted_tables:
        names = ", ".join(table["label"] for table in restricted_tables)
        suppression_reason = f"Anonimlik icin {names} tablolarinda en az {settings.research_export_min_subjects} farkli ozne gerekir."

    return {
        "record_count": total_records,
        "subject_count": total_subject_count,
        "table_count": len(selected),
        "selected_table_ids": selected,
        "tables": table_previews,
        "fields": sorted({field for table in table_previews for field in table["fields"]}),
        "export_allowed": export_allowed,
        "suppression_reason": suppression_reason,
        "min_subjects": settings.research_export_min_subjects,
        "date_min": start_date.isoformat() if start_date else None,
        "date_max": end_date.isoformat() if end_date else None,
    }


def build_export_attachments(
    db: Session,
    table_ids: list[str],
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    attachments = []
    for table_id in normalize_table_ids(table_ids):
        table = EXPORT_TABLE_BY_ID[table_id]
        rows = fetch_export_rows(db, table_id, start_date=start_date, end_date=end_date)
        safe_name = re.sub(r"[^a-z0-9_-]+", "-", table.id.lower()).strip("-")
        attachments.append(
            {
                "table_id": table.id,
                "label": table.label,
                "filename": f"yemekhanai-{safe_name}.csv",
                "content": rows_to_csv_bytes(rows, table.fields),
                "record_count": len(rows),
            }
        )
    return attachments


def rows_to_csv(rows: list[dict[str, Any]], fields: tuple[str, ...]) -> str:
    output = StringIO()
    output.write("sep=;\r\n")
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore", delimiter=";")
    writer.writeheader()
    writer.writerows({field: _format_csv_value(row.get(field)) for field in fields} for row in rows)
    return output.getvalue()


def rows_to_csv_bytes(rows: list[dict[str, Any]], fields: tuple[str, ...]) -> bytes:
    return rows_to_csv(rows, fields).encode("utf-8")


def _transform_row(row: dict[str, Any]) -> dict[str, Any]:
    transformed = dict(row)
    if "student_id" in transformed:
        transformed["subject_code"] = _subject_code(transformed.pop("student_id"))
    if "age" in transformed:
        transformed["age_group"] = _age_group(transformed.pop("age"))
    if "assigned_by" in transformed:
        transformed["assigned_by_code"] = _subject_code(f"user:{transformed.pop('assigned_by')}")
    if "submitted_by" in transformed:
        transformed["submitted_by_code"] = _subject_code(f"user:{transformed.pop('submitted_by')}")
    if "reviewed_by" in transformed:
        reviewed_by = transformed.pop("reviewed_by")
        transformed["reviewed_by_code"] = _subject_code(f"user:{reviewed_by}") if reviewed_by else None
    return transformed
