from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.catering_management.auth import Principal, require_company_scope
from app.catering_management.core.database import get_db
from app.catering_management.models import License, Role, University, UserProfile
from app.catering_management.schemas import DashboardRead

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardRead)
def get_dashboard(
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> DashboardRead:
    company_id = principal.company_id
    university_filter = []
    user_filter = []

    if principal.role != Role.super_admin:
        university_filter.append(University.company_id == company_id)
        user_filter.append(UserProfile.company_id == company_id)

    if principal.role == Role.university_admin:
        university_filter.append(University.id == principal.university_id)
        user_filter.append(UserProfile.university_id == principal.university_id)

    total_universities = db.scalar(select(func.count(University.id)).where(*university_filter)) or 0
    total_users = db.scalar(select(func.count(UserProfile.id)).where(*user_filter)) or 0
    
    license_query = select(License)
    if principal.role != Role.super_admin:
        license_query = license_query.where(License.company_id == company_id)
    license_row = db.scalar(license_query.order_by(License.expire_date))

    today = date.today()
    active_license = bool(
        license_row and license_row.status and license_row.start_date <= today and license_row.expire_date >= today
    )
    days_left = (license_row.expire_date - today).days if license_row else None

    return DashboardRead(
        total_universities=total_universities,
        total_users=total_users,
        active_license=active_license,
        license_ends_at=license_row.expire_date if license_row else None,
        license_days_left=days_left,
    )

