from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.catering_management.core.config import get_settings
from app.catering_management.routers import companies, dashboard, universities, users, menu_assignments, auth

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (auth.router, dashboard.router, companies.router, universities.router, users.router, menu_assignments.router):
    app.include_router(router, prefix="/catering-management")
    app.include_router(router, prefix="/api/catering-management")



@app.on_event("startup")
def on_startup():
    from app.catering_management.core.database import Base, engine, SessionLocal
    from app.catering_management.models import RoleModel, Role, Company, License, UserProfile, University
    from sqlalchemy import inspect, or_, select, text
    from datetime import date, timedelta
    import bcrypt
    import uuid
    
    # Create tables if they do not exist
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    user_profile_columns = {
        column["name"] for column in inspector.get_columns("user_profiles")
    }
    if "password_hash" not in user_profile_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN password_hash VARCHAR(255)"))

    def default_password_hash() -> str:
        return bcrypt.hashpw("123456".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    
    db = SessionLocal()
    try:
        # 1. Seed Roles
        existing_roles = db.scalars(select(RoleModel)).all()
        if not existing_roles:
            for r in Role:
                db.add(RoleModel(role_name=r.value))
            db.commit()

        # 2. Seed Super Admin
        super_admin = db.scalar(select(UserProfile).where(UserProfile.email == "superadmin@catering.com"))
        if not super_admin:
            super_admin = UserProfile(
                auth_user_id=uuid.uuid4(),
                email="superadmin@catering.com",
                full_name="Süper Admin Yetkilisi",
                role_id=1,  # SUPER_ADMIN
                password_hash=default_password_hash(),
                is_active=True
            )
            db.add(super_admin)
            db.commit()
        elif not super_admin.password_hash:
            super_admin.password_hash = default_password_hash()
            db.commit()
            
        # 3. Seed Company A
        comp_a = db.scalar(select(Company).where(Company.company_name == "Lale Catering"))
        if not comp_a and not db.scalars(select(Company)).first():
            comp_a = Company(
                company_name="Lale Catering",
                tax_number="1234567890",
                email="info@lalecatering.com",
                phone="212-555-1111",
                address="Istanbul Merkez",
                status=True
            )
            db.add(comp_a)
            db.flush()
            db.add(
                License(
                    company_id=comp_a.id,
                    plan_name="Professional",
                    max_universities=2,
                    max_users=3,
                    start_date=date.today() - timedelta(days=5),
                    expire_date=date.today() + timedelta(days=360),
                    status=True
                )
            )
            db.commit()
            
            # Seed Company A Admin
            db.add(
                UserProfile(
                    auth_user_id=uuid.uuid4(),
                    company_id=comp_a.id,
                    email="admin@companya.com",
                    full_name="Lale Catering Yöneticisi",
                    role_id=2,  # CATERING_ADMIN
                    password_hash=default_password_hash(),
                    is_active=True
                )
            )
            # Seed Company A Dietitian
            db.add(
                UserProfile(
                    auth_user_id=uuid.uuid4(),
                    company_id=comp_a.id,
                    email="dietitian@companya.com",
                    full_name="Diyetisyen Canan",
                    role_id=4,  # DIETITIAN
                    password_hash=default_password_hash(),
                    is_active=True
                )
            )
            db.commit()
            
        # 4. Seed Company B
        comp_b = db.scalar(select(Company).where(Company.company_name == "Gül Catering"))
        if not comp_b and not db.scalars(select(Company)).first():
            comp_b = Company(
                company_name="Gül Catering",
                tax_number="0987654321",
                email="info@gulcatering.com",
                phone="216-555-2222",
                address="Kadikoy Istanbul",
                status=True
            )
            db.add(comp_b)
            db.flush()
            db.add(
                License(
                    company_id=comp_b.id,
                    plan_name="Starter",
                    max_universities=1,
                    max_users=1,
                    start_date=date.today() - timedelta(days=5),
                    expire_date=date.today() + timedelta(days=30),
                    status=True
                )
            )
            db.commit()
            
            # Seed Company B Admin
            db.add(
                UserProfile(
                    auth_user_id=uuid.uuid4(),
                    company_id=comp_b.id,
                    email="admin@companyb.com",
                    full_name="Gül Catering Yöneticisi",
                    role_id=2,  # CATERING_ADMIN
                    password_hash=default_password_hash(),
                    is_active=True
                )
            )
            db.commit()

        users_without_password = db.scalars(
            select(UserProfile).where(
                UserProfile.is_active.is_(True),
                or_(
                    UserProfile.password_hash.is_(None),
                    UserProfile.password_hash == "",
                ),
            )
        ).all()
        for legacy_user in users_without_password:
            legacy_user.password_hash = default_password_hash()
        db.commit()

        # 5. Seed Universities (if empty)
        existing_univs = db.scalars(select(University)).all()
        if not existing_univs:
            lale_comp = db.scalar(select(Company).where(Company.company_name == "Lale Catering"))
            gul_comp = db.scalar(select(Company).where(Company.company_name == "Gül Catering"))
            
            if lale_comp:
                db.add(
                    University(
                        company_id=lale_comp.id,
                        university_name="Boğaziçi Üniversitesi",
                        city="İstanbul",
                        student_count=15000,
                        status=True
                    )
                )
                db.add(
                    University(
                        company_id=lale_comp.id,
                        university_name="Orta Doğu Teknik Üniversitesi",
                        city="Ankara",
                        student_count=21000,
                        status=True
                    )
                )
            if gul_comp:
                db.add(
                    University(
                        company_id=gul_comp.id,
                        university_name="İstanbul Teknik Üniversitesi",
                        city="İstanbul",
                        student_count=22000,
                        status=True
                    )
                )
            db.commit()
            
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

