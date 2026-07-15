from __future__ import annotations

import time
import calendar
from datetime import date, datetime
from statistics import mean

from dateutil.relativedelta import relativedelta
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas import NutritionStatistic, RiskIndicator, TrendPoint

DISCLAIMER = "Bu modül teşhis koymaz, bireysel sağlık değerlendirmesi yapmaz ve karar destek sağlamaz."

_stats_cache = {}

def _get_cached(key: str, ttl_seconds: int = 300) -> dict | None:
    now = time.time()
    if key in _stats_cache:
        val, expiry = _stats_cache[key]
        if now < expiry:
            return val
    return None

def _set_cached(key: str, val: dict, ttl_seconds: int = 300) -> None:
    _stats_cache[key] = (val, time.time() + ttl_seconds)


def _num(value, default: float = 0.0) -> float:
    if value is None:
        return default
    return float(value)


def _int(value, default: int = 0) -> int:
    if value is None:
        return default
    return int(value)


def _month_start(target: date) -> date:
    return date(target.year, target.month, 1)


def _as_stat(row) -> NutritionStatistic:
    mapping = row._mapping if hasattr(row, "_mapping") else row
    report_date = mapping["report_date"]
    if hasattr(report_date, "date"):
        report_date = report_date.date()

    return NutritionStatistic(
        id=str(mapping.get("id", f"STAT-{report_date:%Y%m}")),
        report_date=report_date,
        university_id=str(mapping.get("university_id") or "ALL"),
        analyzed_meals=_int(mapping.get("analyzed_meals")),
        avg_calorie=round(_num(mapping.get("avg_calorie")), 1),
        avg_protein=round(_num(mapping.get("avg_protein")), 1),
        avg_iron=round(_num(mapping.get("avg_iron")), 1),
        avg_fiber=round(_num(mapping.get("avg_fiber")), 1),
        healthy_menu_ratio=round(_num(mapping.get("healthy_menu_ratio")), 1),
        vegetable_ratio=round(_num(mapping.get("vegetable_ratio")), 1),
        dessert_ratio=round(_num(mapping.get("dessert_ratio")), 1),
        high_calorie_ratio=round(_num(mapping.get("high_calorie_ratio")), 1),
        iron_rich_ratio=round(_num(mapping.get("iron_rich_ratio")), 1),
        protein_adequacy_ratio=round(_num(mapping.get("protein_adequacy_ratio")), 1),
        fiber_adequacy_ratio=round(_num(mapping.get("fiber_adequacy_ratio")), 1),
        obesity_risk_ratio=round(_num(mapping.get("obesity_risk_ratio")), 1),
        anemia_risk_ratio=round(_num(mapping.get("anemia_risk_ratio")), 1),
    )



def _risk_indicators(stat: NutritionStatistic) -> list[RiskIndicator]:
    return [
        RiskIndicator(code="HIGH_CALORIE_MENU_RATIO", label="Yuksek kalorili menu tercih orani", value=stat.high_calorie_ratio, level="watch" if stat.high_calorie_ratio >= 35 else "normal", explanation="Toplu tuketimde enerji yogun menulerin payini gosterir."),
        RiskIndicator(code="IRON_RICH_MENU_RATIO", label="Demir acisindan zengin menu tercihi", value=stat.iron_rich_ratio, level="watch" if stat.iron_rich_ratio < 45 else "normal", explanation="Demir iceren yemek secimlerinin aggregate oranidir."),
        RiskIndicator(code="PROTEIN_ADEQUACY", label="Protein yeterlilik orani", value=stat.protein_adequacy_ratio, level="normal" if stat.protein_adequacy_ratio >= 80 else "watch", explanation="Ortalama protein miktarinin kurum hedefiyle karsilastirilmasidir."),
        RiskIndicator(code="VEGETABLE_RATIO", label="Sebze tuketim orani", value=stat.vegetable_ratio, level="watch" if stat.vegetable_ratio < 50 else "normal", explanation="Sebze iceren menulerin tercih edilme oranidir."),
        RiskIndicator(code="FIBER_ADEQUACY", label="Lif tuketim orani", value=stat.fiber_adequacy_ratio, level="normal" if stat.fiber_adequacy_ratio >= 80 else "watch", explanation="Ortalama lif miktarinin hedef degerle karsilastirilmasidir."),
        RiskIndicator(code="OBESITY_RISK", label="Obezite Eglim Riski", value=stat.obesity_risk_ratio, level="critical" if stat.obesity_risk_ratio >= 60 else ("watch" if stat.obesity_risk_ratio >= 30 else "normal"), explanation="Yuksek kalori ve tatli tuketimi, sebze yetersizligi riskidir."),
        RiskIndicator(code="ANEMIA_RISK", label="Anemi Eglim Riski", value=stat.anemia_risk_ratio, level="critical" if stat.anemia_risk_ratio >= 60 else ("watch" if stat.anemia_risk_ratio >= 40 else "normal"), explanation="Demir ve protein yetersizligine dayali anemi egilimidir."),
    ]



def _statistics_table_exists(db: Session) -> bool:
    return bool(db.execute(text("select to_regclass('public.nutrition_statistics')")).scalar())


def ensure_schema(db: Session) -> None:
    db.execute(text("""
        create table if not exists nutrition_statistics (
          id bigserial primary key,
          report_date date not null,
          university_id bigint references universities(id) on delete set null,
          analyzed_meals integer not null default 0,
          avg_calorie numeric(10,2) not null default 0,
          avg_protein numeric(10,2) not null default 0,
          avg_iron numeric(10,2) not null default 0,
          avg_fiber numeric(10,2) not null default 0,
          healthy_menu_ratio numeric(5,2) not null default 0,
          vegetable_ratio numeric(5,2) not null default 0,
          dessert_ratio numeric(5,2) not null default 0,
          high_calorie_ratio numeric(5,2) not null default 0,
          iron_rich_ratio numeric(5,2) not null default 0,
          protein_adequacy_ratio numeric(5,2) not null default 0,
          fiber_adequacy_ratio numeric(5,2) not null default 0,
          obesity_risk_ratio numeric(5,2) not null default 0,
          anemia_risk_ratio numeric(5,2) not null default 0,
          created_at timestamptz not null default now()
        )
    """))
    db.execute(text("create index if not exists idx_nutrition_statistics_report_date on nutrition_statistics(report_date desc)"))
    db.commit()


def _latest_from_statistics(db: Session) -> NutritionStatistic | None:
    row = db.execute(text("""
        select
          'STAT-' || to_char(max(report_date), 'YYYYMM') as id,
          max(report_date) as report_date,
          null as university_id,
          sum(analyzed_meals) as analyzed_meals,
          sum(avg_calorie * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_calorie,
          sum(avg_protein * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_protein,
          sum(avg_iron * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_iron,
          sum(avg_fiber * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_fiber,
          sum(healthy_menu_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as healthy_menu_ratio,
          sum(vegetable_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as vegetable_ratio,
          sum(dessert_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as dessert_ratio,
          sum(high_calorie_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as high_calorie_ratio,
          sum(iron_rich_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as iron_rich_ratio,
          sum(protein_adequacy_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as protein_adequacy_ratio,
          sum(fiber_adequacy_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as fiber_adequacy_ratio,
          sum(obesity_risk_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as obesity_risk_ratio,
          sum(anemia_risk_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as anemia_risk_ratio
        from nutrition_statistics
        where report_date = (select max(report_date) from nutrition_statistics)
    """)).first()
    if not row or row._mapping["report_date"] is None:
        return None
    return _as_stat(row)


def _from_menu_assignments(db: Session, target_month: date | None = None) -> NutritionStatistic | None:
    month_filter = ""
    params = {}
    if target_month:
        month_filter = "and date_trunc('month', uma.start_date)::date = :month_start"
        params["month_start"] = _month_start(target_month)

    row = db.execute(text(f"""
        with menu_rows as (
          select
            date_trunc('month', uma.start_date)::date as report_date,
            coalesce(u.student_count, 1) as estimated_meals,
            wm.total_calories as calories,
            wm.total_protein as protein,
            wm.total_iron as iron,
            coalesce(avg(wmi.calories), wm.total_calories / nullif(count(wmi.id), 0), 0) as avg_item_calories,
            coalesce(avg(wmi.protein), wm.total_protein / nullif(count(wmi.id), 0), 0) as avg_item_protein,
            coalesce(avg(wmi.iron), wm.total_iron / nullif(count(wmi.id), 0), 0) as avg_item_iron,
            sum(case when lower(wmi.meal_name) similar to '%(sebze|salata|fasulye|mercimek|brokoli|ispanak|kabak|patlican)%' then 1 else 0 end)::numeric / nullif(count(wmi.id), 0) as vegetable_ratio,
            sum(case when lower(wmi.meal_name) similar to '%(tatli|sutlac|baklava|kek|pasta|helva)%' then 1 else 0 end)::numeric / nullif(count(wmi.id), 0) as dessert_ratio,
            sum(case when coalesce(wmi.calories, 0) >= 800 then 1 else 0 end)::numeric / nullif(count(wmi.id), 0) as high_calorie_ratio,
            sum(case when coalesce(wmi.iron, 0) >= 6 then 1 else 0 end)::numeric / nullif(count(wmi.id), 0) as iron_rich_ratio
          from university_menu_assignments uma
          join weekly_menus wm on wm.id = uma.weekly_menu_id
          left join weekly_menu_items wmi on wmi.weekly_menu_id = wm.id
          left join universities u on u.id = uma.university_id
          where uma.is_published = true {month_filter}
          group by date_trunc('month', uma.start_date)::date, uma.id, u.student_count, wm.total_calories, wm.total_protein, wm.total_iron
        )
        select
          'MENU-' || to_char(max(report_date), 'YYYYMM') as id,
          max(report_date) as report_date,
          null as university_id,
          sum(estimated_meals) as analyzed_meals,
          sum(avg_item_calories * estimated_meals) / nullif(sum(estimated_meals), 0) as avg_calorie,
          sum(avg_item_protein * estimated_meals) / nullif(sum(estimated_meals), 0) as avg_protein,
          sum(avg_item_iron * estimated_meals) / nullif(sum(estimated_meals), 0) as avg_iron,
          0 as avg_fiber,
          sum(case when calories between 600 and 850 and protein >= 25 then estimated_meals else 0 end)::numeric * 100 / nullif(sum(estimated_meals), 0) as healthy_menu_ratio,
          coalesce(sum(vegetable_ratio * estimated_meals) / nullif(sum(estimated_meals), 0) * 100, 0) as vegetable_ratio,
          coalesce(sum(dessert_ratio * estimated_meals) / nullif(sum(estimated_meals), 0) * 100, 0) as dessert_ratio,
          coalesce(sum(high_calorie_ratio * estimated_meals) / nullif(sum(estimated_meals), 0) * 100, 0) as high_calorie_ratio,
          coalesce(sum(iron_rich_ratio * estimated_meals) / nullif(sum(estimated_meals), 0) * 100, 0) as iron_rich_ratio,
          least(sum(avg_item_protein * estimated_meals) / nullif(sum(estimated_meals), 0) / 30 * 100, 120) as protein_adequacy_ratio,
          0 as fiber_adequacy_ratio,
          coalesce(sum((high_calorie_ratio * 0.5 + dessert_ratio * 0.3 + (1.0 - vegetable_ratio) * 0.2) * estimated_meals) / nullif(sum(estimated_meals), 0) * 100, 0) as obesity_risk_ratio,
          coalesce(sum(((1.0 - iron_rich_ratio) * 0.7 + (1.0 - least(avg_item_protein / 30.0, 1.0)) * 0.3) * estimated_meals) / nullif(sum(estimated_meals), 0) * 100, 0) as anemia_risk_ratio
        from menu_rows
    """), params).first()
    if not row or row._mapping["report_date"] is None:
        return None
    return _as_stat(row)


def _statistics_history(db: Session, months: int) -> list[TrendPoint]:
    rows = db.execute(text("""
        select
          to_char(report_date, 'YYYY-MM') as period,
          sum(avg_calorie * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_calorie,
          sum(protein_adequacy_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as protein_adequacy_ratio,
          sum(vegetable_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as vegetable_ratio,
          sum(dessert_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as dessert_ratio,
          sum(iron_rich_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as iron_rich_ratio,
          sum(obesity_risk_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as obesity_risk_ratio,
          sum(anemia_risk_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as anemia_risk_ratio
        from nutrition_statistics
        group by report_date
        order by report_date desc
        limit :months
    """), {"months": months}).all()
    return [TrendPoint(**row._mapping) for row in reversed(rows)]


def _menu_history(db: Session, months: int) -> list[TrendPoint]:
    rows = db.execute(text("""
        with monthly as (
          select date_trunc('month', uma.start_date)::date as report_date
          from university_menu_assignments uma
          where uma.is_published = true
          group by 1
          order by 1 desc
          limit :months
        )
        select report_date from monthly order by report_date
    """), {"months": months}).all()
    points = []
    for row in rows:
        stat = _from_menu_assignments(db, row._mapping["report_date"])
        if stat:
            points.append(TrendPoint(period=stat.report_date.strftime("%Y-%m"), avg_calorie=stat.avg_calorie, protein_adequacy_ratio=stat.protein_adequacy_ratio, vegetable_ratio=stat.vegetable_ratio, dessert_ratio=stat.dessert_ratio, iron_rich_ratio=stat.iron_rich_ratio, obesity_risk_ratio=stat.obesity_risk_ratio, anemia_risk_ratio=stat.anemia_risk_ratio))
    return points




def _get_active_health_flags(db: Session) -> dict[str, int]:
    try:
        rows = db.execute(text("SELECT condition_type, count(*) as cnt FROM student_health_flags WHERE is_active=true GROUP BY condition_type")).all()
        return {row._mapping["condition_type"]: int(row._mapping["cnt"]) for row in rows}
    except Exception:
        db.rollback()
        return {}


def _get_student_consumption_risks(db: Session) -> dict:
    try:
        # Total registered students (from students table)
        total_registered = db.execute(text("SELECT count(*) FROM students")).scalar() or 0

        query = """
        with student_stats as (
            select
                sm.student_id,
                avg(m.calories * coalesce(m.portions, 1)) as avg_cal,
                avg(m.protein * coalesce(m.portions, 1)) as avg_prot,
                avg(m.iron * coalesce(m.portions, 1)) as avg_iron
            from meal_consumptions sm
            join meal_nutrition m on m.meal_id = sm.meal_id
            group by sm.student_id
        )
        select
            count(distinct student_id) as total_students,
            sum(case when avg_cal > 900 or (avg_cal > 800 and avg_prot < 20) then 1 else 0 end) as obesity_risk_count,
            sum(case when avg_iron < 5.0 then 1 else 0 end) as anemia_risk_count
        from student_stats
        """
        row = db.execute(text(query)).first()
        if not row or row[0] == 0:
            return {
                "total_registered_students": int(total_registered),
                "total_active_students": 0,
                "obesity_risk_count": 0,
                "anemia_risk_count": 0,
                "obesity_risk_ratio": 0.0,
                "anemia_risk_ratio": 0.0
            }
        total = int(row[0])
        obesity_cnt = int(row[1] or 0)
        anemia_cnt = int(row[2] or 0)
        return {
            "total_registered_students": int(total_registered),
            "total_active_students": total,
            "obesity_risk_count": obesity_cnt,
            "anemia_risk_count": anemia_cnt,
            "obesity_risk_ratio": round(obesity_cnt * 100.0 / total, 1),
            "anemia_risk_ratio": round(anemia_cnt * 100.0 / total, 1)
        }
    except Exception:
        db.rollback()
        return {
            "total_registered_students": 0,
            "total_active_students": 0,
            "obesity_risk_count": 0,
            "anemia_risk_count": 0,
            "obesity_risk_ratio": 0.0,
            "anemia_risk_ratio": 0.0
        }


def _get_age_group_risks(db: Session) -> list[dict]:
    try:
        query = """
        with age_groups as (
            select 
                id as student_id,
                age,
                case 
                    when age between 18 and 21 then '18-21 Yaş'
                    when age between 22 and 25 then '22-25 Yaş'
                    when age between 26 and 30 then '26-30 Yaş'
                    when age between 31 and 35 then '31-35 Yaş'
                    else '36+ Yaş'
                end as age_group
            from students
        ),
        student_risks as (
            select 
                g.age_group,
                g.student_id,
                coalesce(f.severity, 'none') as severity
            from age_groups g
            left join student_health_flags f on f.student_id = g.student_id and f.is_active = true
        ),
        group_totals as (
            select age_group, count(distinct student_id) as total_students
            from student_risks
            group by age_group
        )
        select 
            r.age_group as name,
            sum(case when r.severity in ('none', 'low') then 1 else 0 end)::float * 100.0 / nullif(t.total_students, 0) as low_risk_ratio,
            sum(case when r.severity = 'medium' then 1 else 0 end)::float * 100.0 / nullif(t.total_students, 0) as medium_risk_ratio,
            sum(case when r.severity = 'high' then 1 else 0 end)::float * 100.0 / nullif(t.total_students, 0) as high_risk_ratio
        from student_risks r
        join group_totals t on t.age_group = r.age_group
        group by r.age_group, t.total_students
        order by r.age_group
        """
        rows = db.execute(text(query)).all()
        groups = {
            "18-21 Yaş": {"name": "18-21 Yaş", "Düşük Risk": 0.0, "Orta Risk": 0.0, "Yüksek Risk": 0.0},
            "22-25 Yaş": {"name": "22-25 Yaş", "Düşük Risk": 0.0, "Orta Risk": 0.0, "Yüksek Risk": 0.0},
            "26-30 Yaş": {"name": "26-30 Yaş", "Düşük Risk": 0.0, "Orta Risk": 0.0, "Yüksek Risk": 0.0},
            "31-35 Yaş": {"name": "31-35 Yaş", "Düşük Risk": 0.0, "Orta Risk": 0.0, "Yüksek Risk": 0.0},
            "36+ Yaş": {"name": "36+ Yaş", "Düşük Risk": 0.0, "Orta Risk": 0.0, "Yüksek Risk": 0.0}
        }
        for row in rows:
            m = row._mapping
            name = m["name"]
            if name in groups:
                groups[name] = {
                    "name": name,
                    "Düşük Risk": round(m["low_risk_ratio"] or 0, 1),
                    "Orta Risk": round(m["medium_risk_ratio"] or 0, 1),
                    "Yüksek Risk": round(m["high_risk_ratio"] or 0, 1)
                }
        return list(groups.values())
    except Exception as e:
        db.rollback()
        print(f"Error querying age group risks: {e}")
        return []


def _get_age_group_conditions(db: Session) -> list[dict]:
    try:
        query_flags = """
        with age_groups as (
            select 
                id as student_id,
                age,
                case 
                    when age between 18 and 21 then '18-21'
                    when age between 22 and 25 then '22-25'
                    when age between 26 and 30 then '26-30'
                    when age between 31 and 35 then '31-35'
                    else '36+'
                end as age_group
            from students
        ),
        student_counts as (
            select age_group, count(distinct student_id) as total_students
            from age_groups
            group by age_group
        )
        select 
            g.age_group,
            f.condition_type,
            count(f.id) as flag_count,
            c.total_students
        from age_groups g
        join student_counts c on c.age_group = g.age_group
        left join student_health_flags f on f.student_id = g.student_id and f.is_active = true
        group by g.age_group, f.condition_type, c.total_students
        """
        rows_flags = db.execute(text(query_flags)).all()
        
        query_consumption = """
        with student_stats as (
            select
                sm.student_id,
                avg(m.calories) as avg_cal,
                avg(m.protein) as avg_prot,
                avg(m.iron) as avg_iron
            from student_meals sm
            join meals m on m.id = sm.meal_id
            group by sm.student_id
        ),
        student_ages as (
            select 
                s.id as student_id,
                case 
                    when s.age between 18 and 21 then '18-21'
                    when s.age between 22 and 25 then '22-25'
                    when s.age between 26 and 30 then '26-30'
                    when s.age between 31 and 35 then '31-35'
                    else '36+'
                end as age_group
            from students s
        ),
        group_totals as (
            select age_group, count(distinct student_id) as total_students
            from student_ages
            group by age_group
        )
        select 
            a.age_group,
            t.total_students,
            sum(case when s.avg_cal > 900 or (s.avg_cal > 800 and s.avg_prot < 20) then 1 else 0 end) as obesity_count,
            sum(case when s.avg_iron < 5.0 then 1 else 0 end) as anemia_count
        from student_stats s
        join student_ages a on a.student_id = s.student_id
        join group_totals t on t.age_group = a.age_group
        group by a.age_group, t.total_students
        """
        rows_cons = db.execute(text(query_consumption)).all()
        
        groups = {
            "18-21": {"name": "18-21", "anemi": 0.0, "obezite": 0.0},
            "22-25": {"name": "22-25", "anemi": 0.0, "obezite": 0.0},
            "26-30": {"name": "26-30", "anemi": 0.0, "obezite": 0.0},
            "31-35": {"name": "31-35", "anemi": 0.0, "obezite": 0.0},
            "36+": {"name": "36+", "anemi": 0.0, "obezite": 0.0}
        }
        all_conditions = db.execute(text("SELECT DISTINCT condition_type FROM student_health_flags WHERE is_active = true")).scalars().all()
        for gname in groups:
            for cond in all_conditions:
                groups[gname][cond] = 0.0
        for row in rows_flags:
            m = row._mapping
            gname = m["age_group"]
            cond = m["condition_type"]
            count = m["flag_count"]
            total = m["total_students"] or 1
            if gname in groups and cond:
                groups[gname][cond] = round((count * 100.0) / total, 1)
        for row in rows_cons:
            m = row._mapping
            gname = m["age_group"]
            total = m["total_students"] or 1
            ob_cnt = m["obesity_count"] or 0
            an_cnt = m["anemia_count"] or 0
            if gname in groups:
                groups[gname]["anemi"] = round((an_cnt * 100.0) / total, 1)
                groups[gname]["obezite"] = round((ob_cnt * 100.0) / total, 1)
        return list(groups.values())
    except Exception as e:
        db.rollback()
        print(f"Error querying age group conditions: {e}")
        return []


def _get_student_scatter_points(db: Session) -> list[dict]:
    try:
        query = """
        with student_stats as (
            select
                sm.student_id,
                avg(m.calories) as avg_cal,
                avg(m.iron) as avg_iron
            from student_meals sm
            join meals m on m.id = sm.meal_id
            group by sm.student_id
        ),
        student_flags as (
            select 
                student_id,
                array_agg(distinct condition_type) as flags
            from student_health_flags
            where is_active = true
            group by student_id
        )
        select
            s.student_id,
            s.avg_cal as calories,
            s.avg_iron as iron,
            coalesce(f.flags, '{}') as flags
        from student_stats s
        left join student_flags f on f.student_id = s.student_id
        order by s.student_id
        """
        rows = db.execute(text(query)).all()
        points = []
        for r in rows:
            sid = r[0]
            cal = float(r[1] or 0)
            iron = float(r[2] or 0)
            flags = list(r[3] or [])
            
            if 0 < cal < 150: cal *= 18.0
            if 0 < iron < 2: iron *= 18.0
            if cal <= 0: cal = 650.0
            if iron <= 0: iron = 8.0
            
            # Add consumption-based flags matching backend rules
            if iron < 5.0 and "anemi" not in flags:
                flags.append("anemi")
            if cal > 900.0 and "obezite" not in flags:
                flags.append("obezite")
                
            points.append({
                "student_id": sid,
                "calories": round(cal, 1),
                "iron": round(iron, 1),
                "flags": flags
            })
        return points
    except Exception as e:
        db.rollback()
        print(f"Error querying student scatter points: {e}")
        return []


def get_latest_statistics(db: Session) -> dict:
    cache_key = "latest"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    stat = None
    try:
        if _statistics_table_exists(db):
            stat = _latest_from_statistics(db)
        if stat is None:
            stat = _from_menu_assignments(db)
    except SQLAlchemyError:
        db.rollback()
        raise

    if stat is None:
        today = date.today()
        stat = NutritionStatistic(id=f"EMPTY-{today:%Y%m%d}", report_date=today, university_id="ALL", analyzed_meals=0, avg_calorie=0, avg_protein=0, avg_iron=0, avg_fiber=0, healthy_menu_ratio=0, vegetable_ratio=0, dessert_ratio=0, high_calorie_ratio=0, iron_rich_ratio=0, protein_adequacy_ratio=0, fiber_adequacy_ratio=0, obesity_risk_ratio=0, anemia_risk_ratio=0)

    trend = get_history_statistics(db, 6)
    res = {
        "summary": stat, 
        "risk_indicators": _risk_indicators(stat), 
        "trend": trend, 
        "student_consumption_risks": _get_student_consumption_risks(db), 
        "active_health_flags": _get_active_health_flags(db), 
        "disclaimer": DISCLAIMER,
        "age_group_risks": _get_age_group_risks(db),
        "age_group_conditions": _get_age_group_conditions(db),
        "student_scatter_points": _get_student_scatter_points(db)
    }
    _set_cached(cache_key, res, ttl_seconds=10)
    return res


def get_monthly_statistics(db: Session, year: int, month: int) -> dict:
    cache_key = f"monthly_{year}_{month}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    target = date(year, month, 1) + relativedelta(day=15)
    stat = None
    if _statistics_table_exists(db):
        row = db.execute(text("""
            select
              'STAT-' || to_char(max(report_date), 'YYYYMM') as id,
              max(report_date) as report_date,
              null as university_id,
              sum(analyzed_meals) as analyzed_meals,
              sum(avg_calorie * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_calorie,
              sum(avg_protein * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_protein,
              sum(avg_iron * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_iron,
              sum(avg_fiber * analyzed_meals) / nullif(sum(analyzed_meals), 0) as avg_fiber,
              sum(healthy_menu_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as healthy_menu_ratio,
              sum(vegetable_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as vegetable_ratio,
              sum(dessert_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as dessert_ratio,
              sum(high_calorie_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as high_calorie_ratio,
              sum(iron_rich_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as iron_rich_ratio,
              sum(protein_adequacy_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as protein_adequacy_ratio,
              sum(fiber_adequacy_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as fiber_adequacy_ratio,
              sum(obesity_risk_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as obesity_risk_ratio,
              sum(anemia_risk_ratio * analyzed_meals) / nullif(sum(analyzed_meals), 0) as anemia_risk_ratio
            from nutrition_statistics
            where date_trunc('month', report_date)::date = :month_start
        """), {"month_start": _month_start(target)}).first()
        if row and row._mapping["report_date"] is not None:
            stat = _as_stat(row)
    if stat is None:
        stat = _from_menu_assignments(db, target)
    if stat is None:
        stat = NutritionStatistic(id=f"EMPTY-{year}{month:02d}", report_date=target, university_id="ALL", analyzed_meals=0, avg_calorie=0, avg_protein=0, avg_iron=0, avg_fiber=0, healthy_menu_ratio=0, vegetable_ratio=0, dessert_ratio=0, high_calorie_ratio=0, iron_rich_ratio=0, protein_adequacy_ratio=0, fiber_adequacy_ratio=0, obesity_risk_ratio=0, anemia_risk_ratio=0)
    res = {
        "summary": stat, 
        "risk_indicators": _risk_indicators(stat), 
        "trend": get_history_statistics(db, 6), 
        "student_consumption_risks": _get_student_consumption_risks(db), 
        "active_health_flags": _get_active_health_flags(db), 
        "disclaimer": DISCLAIMER,
        "age_group_risks": _get_age_group_risks(db),
        "age_group_conditions": _get_age_group_conditions(db),
        "student_scatter_points": _get_student_scatter_points(db)
    }
    _set_cached(cache_key, res)
    return res


def _get_monthly_health_flags_percentages(db: Session, period_str: str) -> dict[str, float]:
    try:
        dt = datetime.strptime(period_str, "%Y-%m").date()
        _, last_day = calendar.monthrange(dt.year, dt.month)
        month_end = date(dt.year, dt.month, last_day)
        
        total_students = db.execute(text("SELECT count(*) FROM students")).scalar() or 1
        
        rows = db.execute(text("""
            SELECT condition_type, count(*) as cnt 
            FROM student_health_flags 
            WHERE is_active = true AND created_at::date <= :month_end 
            GROUP BY condition_type
        """), {"month_end": month_end}).all()
        
        percentages = {}
        for row in rows:
            mapping = row._mapping
            percentages[mapping["condition_type"]] = round((mapping["cnt"] * 100.0) / total_students, 1)
        
        all_conditions = db.execute(text("SELECT DISTINCT condition_type FROM student_health_flags WHERE is_active = true")).scalars().all()
        for cond in all_conditions:
            if cond not in percentages:
                percentages[cond] = 0.0
                
        return percentages
    except Exception as e:
        db.rollback()
        print(f"Error calculating monthly health flags for {period_str}: {e}")
        return {}


def get_history_statistics(db: Session, months: int = 6) -> list[dict]:
    months = max(1, min(months, 12))
    history_points = []
    if _statistics_table_exists(db):
        history = _statistics_history(db, months)
        if history:
            history_points = [pt.model_dump() if hasattr(pt, "model_dump") else pt.dict() for pt in history]
            
    if not history_points:
        menu_hist = _menu_history(db, months)
        history_points = [pt.model_dump() if hasattr(pt, "model_dump") else pt.dict() for pt in menu_hist]
        
    enriched_points = []
    for pt in history_points:
        period = pt["period"]
        flags_pct = _get_monthly_health_flags_percentages(db, period)
        enriched_points.append({**pt, **flags_pct})
        
    return enriched_points
