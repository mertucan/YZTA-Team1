from types import SimpleNamespace
import unittest
from uuid import uuid4

from bootstrap import *  # noqa: F401,F403
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.catering_management.auth import get_current_principal
from app.catering_management.models import Role
from app.catering_management.routers.auth import (
    has_missing_password_hash,
    hash_password,
    normalize_email,
    verify_password,
)


class FakeDb:
    def __init__(self, profile=None):
        self.profile = profile

    def scalar(self, statement):
        return self.profile


class AuthTests(unittest.TestCase):
    def test_password_hash_roundtrip_and_email_normalization(self):
        password_hash = hash_password("Sifre123!")

        self.assertEqual(normalize_email("  USER@Example.COM "), "user@example.com")
        self.assertNotEqual(password_hash, "Sifre123!")
        self.assertTrue(verify_password("Sifre123!", password_hash))
        self.assertFalse(verify_password("yanlis", password_hash))
        self.assertTrue(has_missing_password_hash(None))
        self.assertTrue(has_missing_password_hash("   "))

    def test_mock_token_resolves_active_profile(self):
        profile = SimpleNamespace(
            auth_user_id=uuid4(),
            email="admin@example.com",
            company_id=12,
            university_id=None,
            role=Role.catering_admin,
        )
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="mock-token-ADMIN@EXAMPLE.COM",
        )

        principal = get_current_principal(credentials=credentials, db=FakeDb(profile))

        self.assertEqual(principal.email, "admin@example.com")
        self.assertEqual(principal.auth_user_id, profile.auth_user_id)
        self.assertEqual(principal.company_id, 12)
        self.assertEqual(principal.role, Role.catering_admin)

    def test_missing_mock_profile_is_forbidden(self):
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="mock-token-missing@example.com",
        )

        with self.assertRaises(HTTPException) as exc_info:
            get_current_principal(credentials=credentials, db=FakeDb())

        self.assertEqual(exc_info.exception.status_code, 403)
        self.assertEqual(
            exc_info.exception.detail,
            "Mock user profile not found or inactive",
        )
