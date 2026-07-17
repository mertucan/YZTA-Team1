import sys
import os
import random
import datetime
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal

first_names_male = ["Ahmet", "Mehmet", "Mustafa", "Can", "Burak", "Emre", "Oğuz", "Ali", "Hasan", "Mert", "Ege", "Kaan", "Cem", "Yiğit", "Kerem"]
first_names_female = ["Ayşe", "Fatma", "Zeynep", "Elif", "Merve", "Büşra", "Yağmur", "Derin", "Ece", "Selin", "Deniz", "Ceren", "Gamze", "Gizem", "İrem"]
last_names = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Öztürk", "Arslan", "Doğan", "Kılıç", "Güneş", "Özdemir", "Aydın", "Yıldırım", "Koç"]

conditions = ["diabetes", "celiac", "allergy", "hypertension", "obesity", "anemia", "other"]
condition_labels = {
    "diabetes": "Tip 1 Diyabet - Düşük şekerli diyet.",
    "celiac": "Çölyak - Kesinlikle glutensiz olmalı.",
    "allergy": "Gıda Alerjisi - Laktoz/Gluten/Kuruyemiş duyarlılığı.",
    "hypertension": "Hipertansiyon - Tuzsuz veya az tuzlu yemekhane tercihi.",
    "obesity": "Obezite - Kalori kısıtlamalı diyet.",
    "anemia": "Anemi - Demir ve C vitamini takviyeli beslenme.",
    "other": "Diğer Kronik Bulgular."
}

db = SessionLocal()
try:
    print("Fetching active meal IDs...")
    meal_ids = [row[0] for row in db.execute(text("SELECT id FROM meals")).all()]
    if not meal_ids:
        print("No meals found in database! Inserting fallback meals...")
        db.execute(text("""
            INSERT INTO meals (name, calories, category, portions, protein, iron) VALUES
            ('Mercimek Çorbası', 150, 'Soup', 1, 8.5, 3.2),
            ('Ezogelin Çorbası', 160, 'Soup', 1, 7.2, 2.8),
            ('Izgara Köfte', 420, 'Main', 1, 28.0, 4.5),
            ('Tavuk Sote', 350, 'Main', 1, 24.0, 2.1),
            ('Kuru Fasulye', 280, 'Main', 1, 14.0, 5.2),
            ('Nohut Yemeği', 270, 'Main', 1, 12.5, 4.8),
            ('Pirinç Pilavı', 320, 'Sides', 1, 4.2, 0.5),
            ('Bulgur Pilavı', 290, 'Sides', 1, 6.8, 1.8),
            ('Mevsim Salatası', 60, 'Sides', 1, 1.2, 0.8),
            ('Yoğurt', 120, 'Sides', 1, 5.0, 0.2),
            ('Sütlaç', 260, 'Dessert', 1, 6.0, 0.1),
            ('Baklava', 450, 'Dessert', 1, 4.5, 0.3)
        """))
        db.commit()
        meal_ids = [row[0] for row in db.execute(text("SELECT id FROM meals")).all()]
    print(f"Loaded {len(meal_ids)} meals.")

    # 1. Clean existing records for student tables ONLY
    print("Cleaning database student tables...")
    db.execute(text("DELETE FROM student_meals"))
    db.execute(text("DELETE FROM student_health_flags"))
    db.execute(text("DELETE FROM students"))
    db.commit()
    print("Cleanup completed.")

    # 2. Insert 150 students
    print("Inserting 150 students...")
    student_records = []
    for i in range(1, 151):
        gender = random.choice(["male", "female"])
        if gender == "male":
            first_name = random.choice(first_names_male)
        else:
            first_name = random.choice(first_names_female)
        last_name = random.choice(last_names)
        
        age_selector = random.random()
        if age_selector < 0.35: # 18-21
            age = random.randint(18, 21)
        elif age_selector < 0.65: # 22-25
            age = random.randint(22, 25)
        elif age_selector < 0.85: # 26-30
            age = random.randint(26, 30)
        elif age_selector < 0.95: # 31-35
            age = random.randint(31, 35)
        else: # 36+
            age = random.randint(36, 45)
            
        national_id = f"10000000{i:03d}"
        
        res = db.execute(text("""
            INSERT INTO students (first_name, last_name, national_id, age)
            VALUES (:first, :last, :nat, :age)
            RETURNING id
        """), {
            "first": first_name,
            "last": last_name,
            "nat": national_id,
            "age": age
        })
        student_id = res.scalar()
        student_records.append({"id": student_id, "age": age})
    db.commit()
    print(f"Successfully inserted {len(student_records)} students.")

    # 3. Insert health flags for ~35% of the students
    print("Inserting student health flags...")
    flag_count = 0
    for s in student_records:
        if random.random() < 0.35:
            cond = random.choice(conditions)
            severity = random.choice(["low", "medium", "high"])
            is_active = random.random() < 0.9  # 90% active
            
            days_ago = random.randint(1, 180)
            created_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago)
            
            db.execute(text("""
                INSERT INTO student_health_flags (student_id, condition_type, flag_label, severity, is_active, created_at)
                VALUES (:student_id, :condition_type, :flag_label, :severity, :is_active, :created_at)
            """), {
                "student_id": s["id"],
                "condition_type": cond,
                "flag_label": condition_labels[cond],
                "severity": severity,
                "is_active": is_active,
                "created_at": created_at
            })
            flag_count += 1
    db.commit()
    print(f"Successfully inserted {flag_count} health flags.")

    # 4. Insert student meals (exactly 100 records)
    print("Inserting exactly 100 student meal consumption records...")
    meals_count = 0
    start_date = datetime.date(2026, 2, 1)
    end_date = datetime.date(2026, 7, 14)
    total_days = (end_date - start_date).days
    
    meal_parameters = []
    for _ in range(100):
        s = random.choice(student_records)
        days_offset = random.randint(0, total_days)
        meal_date = start_date + datetime.timedelta(days=days_offset)
        
        meal_type = random.choice(["Kahvaltı", "Öğle", "Akşam"])
        if meal_type == "Kahvaltı":
            hour = random.randint(7, 9)
        elif meal_type == "Öğle":
            hour = random.randint(12, 13)
        else:
            hour = random.randint(18, 19)
            
        minute = random.randint(0, 59)
        consumed_at = datetime.datetime(
            meal_date.year, meal_date.month, meal_date.day,
            hour, minute, tzinfo=datetime.timezone.utc
        )
        
        meal_id = random.choice(meal_ids)
        meal_parameters.append({
            "student_id": s["id"],
            "meal_id": meal_id,
            "consumed_at": consumed_at
        })
        meals_count += 1
            
    if meal_parameters:
        chunk_size = 200
        for i in range(0, len(meal_parameters), chunk_size):
            chunk = meal_parameters[i:i+chunk_size]
            values_str = ", ".join(f"({m['student_id']}, {m['meal_id']}, '{m['consumed_at'].strftime('%Y-%m-%d %H:%M:%S')}+00')" for m in chunk)
            db.execute(text(f"INSERT INTO student_meals (student_id, meal_id, consumed_at) VALUES {values_str}"))
            db.commit()
            
    print(f"Successfully inserted {meals_count} student meal consumptions.")
    print("Seeding completed successfully!")

except Exception as e:
    db.rollback()
    print("Seeding failed with error:", e)
finally:
    db.close()
