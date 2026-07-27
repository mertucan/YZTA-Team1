from datetime import date, timedelta
import unittest

from bootstrap import *  # noqa: F401,F403
from fastapi import HTTPException

from app.catering_management.services import ensure_active_license


class FakeDb:
    def __init__(self, license_row):
        self.license_row = license_row

    def scalar(self, statement):
        return self.license_row


class LicenseRow:
    def __init__(self, *, status=True, start_offset=-1, expire_offset=1):
        today = date.today()
        self.status = status
        self.start_date = today + timedelta(days=start_offset)
        self.expire_date = today + timedelta(days=expire_offset)


class CateringServiceTests(unittest.TestCase):
    def test_ensure_active_license_returns_current_license(self):
        license_row = LicenseRow()

        self.assertIs(
            ensure_active_license(FakeDb(license_row), company_id=1),
            license_row,
        )

    def test_ensure_active_license_rejects_inactive_license(self):
        inactive_rows = [
            None,
            LicenseRow(status=False),
            LicenseRow(start_offset=1),
            LicenseRow(expire_offset=-1),
        ]

        for license_row in inactive_rows:
            with self.subTest(license_row=license_row):
                with self.assertRaises(HTTPException) as exc_info:
                    ensure_active_license(FakeDb(license_row), company_id=1)

                self.assertEqual(exc_info.exception.status_code, 402)
                self.assertEqual(
                    exc_info.exception.detail,
                    "Company license is not active",
                )
