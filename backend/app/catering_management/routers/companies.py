from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.catering_management.auth import Principal, require_roles, require_company_scope
from app.catering_management.core.database import get_db
from app.catering_management.models import Company, License, Role
from app.catering_management.schemas import CompanyCreate, CompanyRead, CompanyUpdate, LicenseRead, LicenseUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyRead], dependencies=[Depends(require_roles(Role.super_admin))])
def list_companies(db: Session = Depends(get_db)) -> list[Company]:
    return list(
        db.scalars(
            select(Company)
            .options(joinedload(Company.license))
            .order_by(Company.company_name)
        ).all()
    )


@router.post(
    "",
    response_model=CompanyRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.super_admin))],
)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> Company:
    if payload.expire_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="License end date is invalid")

    company = Company(
        company_name=payload.company_name,
        tax_number=payload.tax_number,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
    )
    db.add(company)
    db.flush()
    db.add(
        License(
            company_id=company.id,
            plan_name=payload.plan_name,
            max_users=payload.max_users,
            max_universities=payload.max_universities,
            start_date=payload.start_date,
            expire_date=payload.expire_date,
        )
    )
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(
    company_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> Company:
    if principal.role != Role.super_admin and principal.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this company")

    company = db.scalar(
        select(Company)
        .options(joinedload(Company.license))
        .where(Company.id == company_id)
    )
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> Company:
    if principal.role != Role.super_admin and principal.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this company")

    company = db.scalar(select(Company).where(Company.id == company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if payload.company_name is not None:
        company.company_name = payload.company_name
    if payload.tax_number is not None:
        company.tax_number = payload.tax_number
    if payload.email is not None:
        company.email = payload.email
    if payload.phone is not None:
        company.phone = payload.phone
    if payload.address is not None:
        company.address = payload.address

    # Only SUPER_ADMIN can alter company active status
    if payload.status is not None:
        if principal.role != Role.super_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admin can modify status")
        company.status = payload.status

    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(Role.super_admin))])
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.scalar(select(Company).where(Company.id == company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    db.delete(company)
    db.commit()
    return None


@router.get("/{company_id}/license", response_model=LicenseRead)
def get_company_license(
    company_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> License:
    if principal.role != Role.super_admin and principal.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    lic = db.scalar(select(License).where(License.company_id == company_id))
    if lic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    return lic


@router.put("/{company_id}/license", response_model=LicenseRead, dependencies=[Depends(require_roles(Role.super_admin))])
def update_company_license(
    company_id: int,
    payload: LicenseUpdate,
    db: Session = Depends(get_db),
) -> License:
    lic = db.scalar(select(License).where(License.company_id == company_id))
    if lic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")

    if payload.plan_name is not None:
        lic.plan_name = payload.plan_name
    if payload.max_universities is not None:
        lic.max_universities = payload.max_universities
    if payload.max_users is not None:
        lic.max_users = payload.max_users
    if payload.start_date is not None:
        lic.start_date = payload.start_date
    if payload.expire_date is not None:
        lic.expire_date = payload.expire_date
    if payload.status is not None:
        lic.status = payload.status

    if lic.expire_date < lic.start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="License expire date cannot be before start date")

    db.add(lic)
    db.commit()
    db.refresh(lic)
    return lic

