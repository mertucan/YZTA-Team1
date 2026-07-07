def register_catering_routes(app):
    try:
        from app.catering_management.core.config import get_settings
        from app.catering_management.core.database import Base, SessionLocal, engine
        from app.catering_management.routers import (
            auth,
            companies,
            dashboard,
            menu_assignments,
            universities,
            users,
        )
    except Exception as exc:
        app.state.catering_management_error = str(exc)
        return False

    get_settings()

    routers = (
        auth.router,
        dashboard.router,
        companies.router,
        universities.router,
        users.router,
        menu_assignments.router,
    )
    for router in routers:
        app.include_router(router, prefix="/catering-management")
        app.include_router(router, prefix="/api/catering-management")

    @app.on_event("startup")
    def init_catering_management_tables():
        import uuid
        from datetime import date, timedelta

        from sqlalchemy import or_, select

        from app.catering_management.models import Company, License, Role, RoleModel, University, UserProfile

        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            existing_roles = set(db.scalars(select(RoleModel.role_name)).all())
            for role in Role:
                if role.value not in existing_roles:
                    db.add(RoleModel(role_name=role.value))
            db.commit()

            roles = {
                row.role_name: row.id
                for row in db.scalars(select(RoleModel)).all()
            }

            if not db.scalar(select(UserProfile).where(UserProfile.email == "superadmin@catering.com")):
                db.add(
                    UserProfile(
                        auth_user_id=uuid.uuid4(),
                        email="superadmin@catering.com",
                        full_name="Süper Admin Yetkilisi",
                        role_id=roles[Role.super_admin.value],
                        is_active=True,
                    )
                )
                db.commit()

            company = db.scalar(
                select(Company).where(
                    or_(
                        Company.company_name == "Lale Catering",
                        Company.tax_number == "1234567890",
                    )
                )
            )
            if not company:
                company = Company(
                    company_name="Lale Catering",
                    tax_number="1234567890",
                    email="info@lalecatering.com",
                    phone="212-555-1111",
                    address="İstanbul Merkez",
                    status=True,
                )
                db.add(company)
                db.flush()

            if not db.scalar(select(License).where(License.company_id == company.id)):
                db.add(
                    License(
                        company_id=company.id,
                        plan_name="Professional",
                        max_universities=5,
                        max_users=20,
                        start_date=date.today() - timedelta(days=5),
                        expire_date=date.today() + timedelta(days=360),
                        status=True,
                    )
                )

            if not db.scalar(select(UserProfile).where(UserProfile.email == "admin@companya.com")):
                db.add(
                    UserProfile(
                        auth_user_id=uuid.uuid4(),
                        company_id=company.id,
                        email="admin@companya.com",
                        full_name="Lale Catering Yöneticisi",
                        role_id=roles[Role.catering_admin.value],
                        is_active=True,
                    )
                )

            if not db.scalar(
                select(University).where(
                    University.company_id == company.id,
                    University.university_name == "Boğaziçi Üniversitesi",
                )
            ):
                db.add(
                    University(
                        company_id=company.id,
                        university_name="Boğaziçi Üniversitesi",
                        city="İstanbul",
                        student_count=15000,
                        status=True,
                    )
                )

            if not db.scalar(
                select(University).where(
                    University.company_id == company.id,
                    University.university_name == "Orta Doğu Teknik Üniversitesi",
                )
            ):
                db.add(
                    University(
                        company_id=company.id,
                        university_name="Orta Doğu Teknik Üniversitesi",
                        city="Ankara",
                        student_count=21000,
                        status=True,
                    )
                )

            db.commit()

    app.state.catering_management_enabled = True
    return True
