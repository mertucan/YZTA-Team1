from bootstrap import *  # noqa: F401,F403

import unittest

from app.catering_management.models import Role
from app.catering_management.routers.auth import PUBLIC_REGISTER_ROLES


class RegisterPolicyTests(unittest.TestCase):
    def test_only_external_entry_roles_are_publicly_registerable(self):
        self.assertEqual(
            PUBLIC_REGISTER_ROLES,
            {
                Role.catering_admin.value,
                Role.university_admin.value,
                Role.student.value,
                Role.researcher.value,
                Role.partner_company.value,
            },
        )

    def test_internal_and_system_roles_are_not_publicly_registerable(self):
        self.assertNotIn(Role.super_admin.value, PUBLIC_REGISTER_ROLES)
        self.assertNotIn(Role.dietitian.value, PUBLIC_REGISTER_ROLES)
        self.assertNotIn(Role.chef.value, PUBLIC_REGISTER_ROLES)
        self.assertNotIn(Role.finance_manager.value, PUBLIC_REGISTER_ROLES)
        self.assertNotIn(Role.operations_manager.value, PUBLIC_REGISTER_ROLES)
        self.assertNotIn(Role.warehouse_staff.value, PUBLIC_REGISTER_ROLES)
        self.assertNotIn(Role.purchasing_staff.value, PUBLIC_REGISTER_ROLES)
