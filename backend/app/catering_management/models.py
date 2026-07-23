import enum
import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.catering_management.core.database import Base


class Role(str, enum.Enum):
    super_admin = "SUPER_ADMIN"
    catering_admin = "CATERING_ADMIN"
    university_admin = "UNIVERSITY_ADMIN"
    dietitian = "DIETITIAN"
    chef = "CHEF"
    finance_manager = "FINANCE_MANAGER"
    operations_manager = "OPERATIONS_MANAGER"
    student = "STUDENT"
    warehouse_staff = "WAREHOUSE_STAFF"
    purchasing_staff = "PURCHASING_STAFF"
    researcher = "RESEARCHER"
    partner_company = "PARTNER_COMPANY"


class LicensePlan(str, enum.Enum):
    starter = "Starter"
    professional = "Professional"
    enterprise = "Enterprise"


class RoleModel(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    tax_number: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String)
    status: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    universities: Mapped[list["University"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    users: Mapped[list["UserProfile"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    license: Mapped["License"] = relationship(back_populates="company", uselist=False, cascade="all, delete-orphan")


class License(Base):
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), unique=True)
    plan_name: Mapped[str] = mapped_column(String(50), nullable=False)
    max_universities: Mapped[int] = mapped_column(Integer, nullable=False)
    max_users: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    expire_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped[Company] = relationship(back_populates="license")


class University(Base):
    __tablename__ = "universities"
    __table_args__ = (UniqueConstraint("company_id", "university_name", name="uq_university_company_name"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    university_name: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str | None] = mapped_column(String(100))
    student_count: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped[Company] = relationship(back_populates="universities")
    users: Mapped[list["UserProfile"]] = relationship(back_populates="university")


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = (UniqueConstraint("auth_user_id", name="uq_user_profiles_auth_user_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    auth_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    university_id: Mapped[int | None] = mapped_column(ForeignKey("universities.id", ondelete="SET NULL"), index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped[Company | None] = relationship(back_populates="users")
    university: Mapped[University | None] = relationship(back_populates="users")
    role_obj: Mapped[RoleModel] = relationship()

    @property
    def role(self) -> Role:
        return Role(self.role_obj.role_name)

    @property
    def role_name(self) -> str:
        return self.role_obj.role_name


class UniversityMenuAssignment(Base):
    __tablename__ = "university_menu_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    menu_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    university_id: Mapped[int] = mapped_column(ForeignKey("universities.id", ondelete="CASCADE"), index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    assigned_by: Mapped[int] = mapped_column(ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped[Company] = relationship()
    university: Mapped[University] = relationship()
    assigner: Mapped[UserProfile] = relationship()


class ResearchExportRequest(Base):
    __tablename__ = "research_export_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    requested_by: Mapped[int] = mapped_column(ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    recipient_name: Mapped[str | None] = mapped_column(String(120))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    record_count: Mapped[int] = mapped_column(Integer, default=0)
    subject_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="CREATED", index=True)
    delivery_message: Mapped[str | None] = mapped_column(String)
    brevo_message_id: Mapped[str | None] = mapped_column(String(120))
    download_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    download_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    requester: Mapped[UserProfile] = relationship()


class UniversityQualityExport(Base):
    __tablename__ = "university_quality_exports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    requested_by: Mapped[int] = mapped_column(ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True)
    university_id: Mapped[int | None] = mapped_column(ForeignKey("universities.id", ondelete="SET NULL"), index=True)
    organization_id: Mapped[str] = mapped_column(String(60), nullable=False)
    organization_name: Mapped[str] = mapped_column(String(160), nullable=False)
    export_format: Mapped[str] = mapped_column(String(10), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    nutrition_quality_score: Mapped[float] = mapped_column(Numeric, default=0)
    menu_count: Mapped[int] = mapped_column(Integer, default=0)
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="GENERATED", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    requester: Mapped[UserProfile] = relationship(foreign_keys=[requested_by])
    university: Mapped[University | None] = relationship()


class PartnerProductIntegration(Base):
    __tablename__ = "partner_product_integrations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"), index=True)
    submitted_by: Mapped[int] = mapped_column(ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("user_profiles.id", ondelete="SET NULL"), index=True)
    partner_company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    brand_name: Mapped[str] = mapped_column(String(120), nullable=False)
    product_name: Mapped[str] = mapped_column(String(160), nullable=False)
    product_category: Mapped[str] = mapped_column(String(80), nullable=False)
    suggested_menu_category: Mapped[str] = mapped_column(String(80), nullable=False)
    serving_size: Mapped[str | None] = mapped_column(String(80))
    calories: Mapped[float] = mapped_column(Numeric, default=0)
    protein: Mapped[float] = mapped_column(Numeric, default=0)
    sugar: Mapped[float] = mapped_column(Numeric, default=0)
    sodium: Mapped[float] = mapped_column(Numeric, default=0)
    target_segments: Mapped[str | None] = mapped_column(String(240))
    allergens: Mapped[str | None] = mapped_column(String(240))
    integration_note: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String(30), default="PENDING_REVIEW", index=True)
    review_note: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company: Mapped[Company | None] = relationship()
    submitter: Mapped[UserProfile] = relationship(foreign_keys=[submitted_by])
    reviewer: Mapped[UserProfile | None] = relationship(foreign_keys=[reviewed_by])

