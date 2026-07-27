from datetime import date, timedelta
import unittest
from unittest.mock import patch
from uuid import uuid4

from bootstrap import *  # noqa: F401,F403
from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker

from app.catering_management.core.database import Base
from app.catering_management.models import (
    Company,
    License,
    Role,
    RoleModel,
    Student,
    University,
    UserProfile,
)
from app.catering_management.routers.auth import register
from app.catering_management.schemas import UserRegister


class RegisterFlowTests(unittest.TestCase):
    def setUp(self):
        self._id_counters = {}
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self.db = self.Session()
        self._id_models = (
            Company,
            License,
            University,
            UserProfile,
            Student,
        )
        for model in self._id_models:
            event.listen(model, "before_insert", self.assign_bigint_id)

        for role in Role:
            self.db.add(RoleModel(role_name=role.value))
        self.company = Company(company_name="Test Catering", status=True)
        self.db.add(self.company)
        self.db.flush()
        self.db.add(
            License(
                company_id=self.company.id,
                plan_name="Starter",
                max_universities=2,
                max_users=5,
                start_date=date.today() - timedelta(days=1),
                expire_date=date.today() + timedelta(days=30),
                status=True,
            )
        )
        self.university = University(
            company_id=self.company.id,
            university_name="Test University",
            city="Istanbul",
            status=True,
        )
        self.db.add(self.university)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        for model in self._id_models:
            event.remove(model, "before_insert", self.assign_bigint_id)
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def assign_bigint_id(self, mapper, connection, target):
        if getattr(target, "id", None) is not None:
            return
        model = type(target)
        self._id_counters[model] = self._id_counters.get(model, 0) + 1
        target.id = self._id_counters[model]

    def make_payload(self, **overrides):
        data = {
            "email": f"user-{uuid4()}@example.com",
            "password": "Sifre123!",
            "auth_user_id": uuid4(),
            "role_name": Role.student.value,
            "phone": "05555555555",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "national_id": "10000000001",
            "age": 21,
            "university_id": self.university.id,
        }
        data.update(overrides)
        return UserRegister(**data)

    @patch("app.catering_management.routers.auth.send_welcome_email")
    def test_student_register_links_existing_unclaimed_student(self, _send_welcome):
        existing_student = Student(
            first_name="Ada",
            last_name="Lovelace",
            national_id="10000000001",
            age=20,
        )
        self.db.add(existing_student)
        self.db.commit()

        response = register(self.make_payload(), db=self.db)

        student = self.db.scalar(select(Student).where(Student.national_id == "10000000001"))
        user = self.db.scalar(select(UserProfile).where(UserProfile.email == response.user.email))
        self.assertEqual(student.user_profile_id, user.id)
        self.assertEqual(user.company_id, self.company.id)
        self.assertEqual(user.university_id, self.university.id)
        self.assertTrue(response.access_token.startswith("mock-token-"))

    @patch("app.catering_management.routers.auth.send_welcome_email")
    def test_student_register_rejects_claimed_student(self, _send_welcome):
        role_row = self.db.scalar(select(RoleModel).where(RoleModel.role_name == Role.student.value))
        claimed_user = UserProfile(
            auth_user_id=uuid4(),
            company_id=self.company.id,
            university_id=self.university.id,
            role_id=role_row.id,
            email="claimed@example.com",
            full_name="Claimed Student",
            password_hash="hash",
            is_active=True,
        )
        self.db.add(claimed_user)
        self.db.flush()
        self.db.add(
            Student(
                first_name="Ada",
                last_name="Lovelace",
                national_id="10000000001",
                age=20,
                user_profile_id=claimed_user.id,
            )
        )
        self.db.commit()

        with self.assertRaises(HTTPException) as exc_info:
            register(self.make_payload(), db=self.db)

        self.assertEqual(exc_info.exception.status_code, 400)
        self.assertIn("zaten bir kullanici hesabina bagli", exc_info.exception.detail)

    @patch("app.catering_management.routers.auth.send_welcome_email")
    def test_researcher_register_stores_public_account_without_extra_table(self, _send_welcome):
        response = register(
            self.make_payload(
                role_name=Role.researcher.value,
                full_name="Research User",
                first_name=None,
                last_name=None,
                national_id=None,
                age=None,
                university_id=None,
                organization_name="ITU",
            ),
            db=self.db,
        )

        user = self.db.scalar(select(UserProfile).where(UserProfile.id == response.user.id))
        self.assertEqual(user.role_name, Role.researcher.value)
        self.assertEqual(user.full_name, "Research User")
        self.assertIsNone(user.company_id)

    def test_national_id_is_student_only(self):
        with self.assertRaises(HTTPException) as exc_info:
            register(
                self.make_payload(
                    role_name=Role.researcher.value,
                    full_name="Research User",
                    first_name=None,
                    last_name=None,
                    age=None,
                    organization_name="ITU",
                ),
                db=self.db,
            )

        self.assertEqual(exc_info.exception.status_code, 400)
        self.assertIn("yalnizca ogrenci", exc_info.exception.detail)
