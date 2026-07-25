# -*- coding: utf-8 -*-
"""Gerçekçi yemekhane verisi üretir (tekrar çalıştırılabilir / idempotent):

1) Hatalı girişleri düzeltir (ör. 2000 kg mercimek → 150 kg)
2) 3 tedarikçi (kategorili: sebze-meyve / et-tavuk / kuru gıda)
3) Şubat–Haziran 2026 malzeme alım geçmişi (tükenmiş partiler: initial_quantity dolu,
   quantity=0 → stok bozulmaz ama aylık malzeme gideri geçmişi oluşur)
4) Şubat–Temmuz 2026 işletme giderleri (personel maaşları, faturalar, bakım...)
5) Son 10 günün servis tüketim logları (AI tükeniş tahmininin veri kaynağı)

Çalıştırma:  .venv/Scripts/python.exe seed_realism.py   (kökteki .env'den DATABASE_URL okur)
"""
import json
import random
import re
import sys
from datetime import date
from pathlib import Path

import psycopg

random.seed(42)  # tekrar üretilebilir veri

ROOT = Path(__file__).resolve().parents[1]
env = (ROOT / ".env").read_text(encoding="utf-8")
URL = re.search(r"^DATABASE_URL\s*=\s*[\"']?([^\"'\r\n]+)", env, re.M).group(1).strip()

MONTHS = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]

# Aylık malzeme alımları: (malzeme adı ilike, aylık ~miktar, birim fiyat TL) — ay içinde 3 tarihe bölünür.
# Toplam ~130-155k/ay hedefi (≈150 kişi/gün ölçeğindeki bir yemekhane ile uyumlu).
MATERIAL_PLAN = [
    ("Pirinç",        300, 62),
    ("Makarna",       220, 38),
    ("Tavuk Göğsü",   240, 155),
    ("Tavuk But",     150, 120),
    ("Yeşil Mercimek", 90, 36),
    ("Kırmızı Mercimek", 80, 46),
    ("Nohut",         100, 55),
    ("Domates",       260, 42),
    ("Soğan",         200, 18),
    ("Patates",       260, 22),
    ("Ayçiçek Yağı",  120, 78),
    ("Yoğurt",        240, 48),
    ("Un",            160, 26),
    ("Tereyağı",       40, 260),
]

# İşletme giderleri: (kategori, açıklama, taban tutar, aylık çarpanlar Şub..Tem)
# Doğalgaz/elektrik mevsimsel; maaşlara Temmuz'da zam.
EXPENSE_PLAN = [
    ("Personel", "Aşçıbaşı maaşı",          58000, [1, 1, 1, 1, 1, 1.15]),
    ("Personel", "Aşçı maaşı",              45000, [1, 1, 1, 1, 1, 1.15]),
    ("Personel", "Aşçı yardımcısı maaşı",   38000, [1, 1, 1, 1, 1, 1.15]),
    ("Personel", "Bulaşıkçı maaşı (2 kişi)", 64000, [1, 1, 1, 1, 1, 1.15]),
    ("Personel", "Temizlik görevlisi maaşı", 30000, [1, 1, 1, 1, 1, 1.15]),
    ("Elektrik", "Elektrik faturası",        26000, [1, 0.92, 0.85, 0.80, 0.76, 0.73]),
    ("Doğalgaz", "Doğalgaz faturası",        22000, [1, 0.80, 0.55, 0.35, 0.28, 0.25]),
    ("Su",       "Su faturası",               8200, [1, 1.02, 0.98, 1.05, 1.08, 1.1]),
    ("Temizlik", "Temizlik/hijyen malzemeleri", 6200, [1, 0.95, 1.05, 1, 1.08, 1.02]),
]
# Tek seferlik giderler: (ay, kategori, açıklama, tutar, gün)
ONE_OFF = [
    ("2026-03", "Tamir-Bakım", "Sanayi fırını termostat değişimi",  4500, 14),
    ("2026-04", "Diğer",       "Haşere ilaçlama (dönemsel)",        3500, 9),
    ("2026-05", "Tamir-Bakım", "Soğuk oda kompresör onarımı",      12500, 21),
    ("2026-06", "Diğer",       "Davlumbaz/baca temizliği",          2800, 12),
    ("2026-07", "Tamir-Bakım", "Bulaşık makinesi rezistans değişimi", 2600, 18),
]

# Son 10 günün günlük servis tüketimi: (malzeme ilike, günlük ~miktar)
DAILY_USE = [
    ("Pirinç", 12), ("Makarna", 8), ("Tavuk Göğsü", 13), ("Domates", 9),
    ("Soğan", 6), ("Patates", 11), ("Ayçiçek Yağı", 4), ("Yoğurt", 10),
    ("Kırmızı Mercimek", 4), ("Un", 5),
]


def main() -> None:
    with psycopg.connect(URL) as conn, conn.cursor() as cur:
        cur.execute("select id, name, unit from ingredients")
        ings = cur.fetchall()

        def find(name: str):
            for iid, n, unit in ings:
                if name.lower() in n.lower():
                    return iid, n, unit
            return None

        # ── 1) Hatalı giriş düzeltmesi: 2000 kg Yeşil Mercimek → 150 kg ──
        cur.execute("""update ingredient_batches set quantity=150, initial_quantity=150
                       where quantity > 1000 returning id""")
        fixed = cur.fetchall()
        for (bid,) in fixed:
            cur.execute("""update ingredients set stock=(select coalesce(sum(quantity),0)
                           from ingredient_batches where ingredient_id=ingredients.id)
                           where id=(select ingredient_id from ingredient_batches where id=%s)""", (bid,))
        print(f"duzeltilen anormal parti: {len(fixed)}")

        # ── 2) Tedarikçiler ──
        cur.execute("select count(*) from suppliers")
        if cur.fetchone()[0] == 0:
            for name, contact, email, phone, cats in [
                ("Anadolu Sebze Meyve Hali", "Hasan Demir", "satis@anadoluhal.com.tr", "0312 555 0134", "sebze, meyve"),
                ("Başkent Et ve Tavukçuluk", "Ayşe Kaya", "siparis@baskentet.com.tr", "0312 555 0287", "et, tavuk, şarküteri"),
                ("Ege Gıda Toptan", "Mehmet Yılmaz", "toptan@egegida.com.tr", "0232 555 0419", "bakliyat, kuru gıda, süt ürünleri, yağ"),
            ]:
                cur.execute("""insert into suppliers(name, contact_name, email, phone, categories)
                               values (%s,%s,%s,%s,%s)""", (name, contact, email, phone, cats))
            print("3 tedarikci eklendi")

        # ── 3) Geçmiş malzeme alımları (tükenmiş partiler) ──
        cur.execute("select count(*) from ingredient_batches where quantity=0 and initial_quantity>0")
        if cur.fetchone()[0] == 0:
            n = 0
            for mi, month in enumerate(MONTHS):
                for name, qty, price in MATERIAL_PLAN:
                    hit = find(name)
                    if not hit:
                        continue
                    iid, _, _ = hit
                    q = round(qty * random.uniform(0.85, 1.15), 1)
                    p = round(price * (1 + 0.02 * mi) * random.uniform(0.96, 1.04), 2)  # hafif enflasyon
                    day = random.choice([3, 11, 19, 25])
                    cur.execute("""insert into ingredient_batches
                                   (ingredient_id, quantity, initial_quantity, unit_price, purchase_date)
                                   values (%s, 0, %s, %s, %s)""", (iid, q, p, f"{month}-{day:02d}"))
                    n += 1
            print(f"gecmis alim partisi: {n}")

        # ── 4) İşletme giderleri (Şubat–Temmuz) ──
        cur.execute("select count(*) from expenses")
        if cur.fetchone()[0] == 0:
            all_months = MONTHS + ["2026-07"]
            n = 0
            for mi, month in enumerate(all_months):
                for cat, desc, base, mult in EXPENSE_PLAN:
                    amount = round(base * mult[mi] * random.uniform(0.985, 1.015), 2)
                    day = 1 if cat == "Personel" else random.choice([8, 15, 22])
                    cur.execute("""insert into expenses(category, description, amount, expense_date)
                                   values (%s,%s,%s,%s)""", (cat, desc, amount, f"{month}-{day:02d}"))
                    n += 1
            for month, cat, desc, amount, day in ONE_OFF:
                cur.execute("""insert into expenses(category, description, amount, expense_date)
                               values (%s,%s,%s,%s)""", (cat, desc, amount, f"{month}-{day:02d}"))
                n += 1
            print(f"isletme gideri kaydi: {n}")

        # ── 5) Son 10 günün servis tüketim logları ──
        cur.execute("select count(*) from consumption_logs")
        if cur.fetchone()[0] == 0:
            n = 0
            days_tr = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
            for offset in range(10, 0, -1):  # 2026-07-15 .. 2026-07-24
                d = date(2026, 7, 25).toordinal() - offset
                sd = date.fromordinal(d)
                details = []
                for name, daily in DAILY_USE:
                    hit = find(name)
                    if not hit:
                        continue
                    iid, full, unit = hit
                    used = round(daily * random.uniform(0.8, 1.2), 1)
                    details.append({"ingredient_id": iid, "name": full, "unit": unit,
                                    "required": used, "consumed": used, "shortfall": 0})
                cur.execute("""insert into consumption_logs
                               (service_date, day_of_week, total_portions, details)
                               values (%s,%s,%s,%s) on conflict (service_date) do nothing""",
                            (sd.isoformat(), days_tr[sd.weekday()],
                             random.randint(135, 165), json.dumps(details)))
                n += 1
            print(f"tuketim logu: {n} gun")

        conn.commit()
        print("seed tamam")


if __name__ == "__main__":
    sys.exit(main())
