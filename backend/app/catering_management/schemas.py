import uuid
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field


class RoleRead(BaseModel):
    id: int
    role_name: str

    model_config = {"from_attributes": True}


class CompanyRead(BaseModel):
    id: int
    company_name: str
    tax_number: str | None
    email: str | None
    phone: str | None
    address: str | None
    status: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=150)
    tax_number: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = None
    plan_name: str = "Starter"
    max_users: int = Field(gt=0)
    max_universities: int = Field(gt=0)
    start_date: date
    expire_date: date


class CompanyUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=2, max_length=150)
    tax_number: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = None
    status: bool | None = None


class LicenseRead(BaseModel):
    id: int
    company_id: int
    plan_name: str
    max_universities: int
    max_users: int
    start_date: date
    expire_date: date
    status: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LicenseUpdate(BaseModel):
    plan_name: str | None = None
    max_universities: int | None = Field(default=None, gt=0)
    max_users: int | None = Field(default=None, gt=0)
    start_date: date | None = None
    expire_date: date | None = None
    status: bool | None = None


class UniversityCreate(BaseModel):
    university_name: str = Field(min_length=2, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    student_count: int | None = Field(default=None, ge=0)


class UniversityUpdate(BaseModel):
    university_name: str | None = Field(default=None, min_length=2, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    student_count: int | None = Field(default=None, ge=0)
    status: bool | None = None


class UniversityRead(BaseModel):
    id: int
    company_id: int
    university_name: str
    city: str | None
    student_count: int | None
    status: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    auth_user_id: uuid.UUID
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    role_name: str
    university_id: int | None = None
    phone: str | None = Field(default=None, max_length=20)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None
    university_id: int | None = None
    role_name: str | None = None


class UserRead(BaseModel):
    id: int
    auth_user_id: uuid.UUID | None
    company_id: int | None
    university_id: int | None
    email: EmailStr | None = None
    full_name: str
    phone: str | None
    role_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRegister(BaseModel):
    company_name: str = Field(min_length=2, max_length=150)
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    auth_user_id: uuid.UUID
    role_name: str = "CATERING_ADMIN"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead



class MenuAssignmentCreate(BaseModel):
    menu_id: uuid.UUID
    university_id: int
    start_date: date
    end_date: date
    status: str = "ACTIVE"
    is_published: bool = False


class MenuAssignmentUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    is_published: bool | None = None


class MenuAssignmentRead(BaseModel):
    id: int
    menu_id: uuid.UUID
    university_id: int
    company_id: int
    assigned_by: int
    start_date: date
    end_date: date
    status: str
    is_published: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardRead(BaseModel):
    total_universities: int
    total_users: int
    active_license: bool
    license_ends_at: date | None
    license_days_left: int | None

