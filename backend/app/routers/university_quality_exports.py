from datetime import date, datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.catering_management.auth import Principal, require_roles
from app.catering_management.core.database import get_db as get_catering_db
from app.catering_management.models import Role, UniversityQualityExport
from app.services.university_quality_integration import (
    build_ai_insights,
    build_quality_payload,
    get_ranking_organizations,
    payload_to_csv,
    payload_to_json,
)

router = APIRouter(prefix="/university-quality-exports", tags=["university-quality-exports"])

EXPORT_ROLES = (Role.university_admin, Role.super_admin)


class UniversityQualityExportRequest(BaseModel):
    organization_id: str = Field(default="qs", max_length=60)
    export_format: str = Field(default="csv", pattern="^(csv|json)$")
    start_date: date | None = None
    end_date: date | None = None


class UniversityQualityInsightRequest(BaseModel):
    organization_id: str = Field(default="qs", max_length=60)
    start_date: date | None = None
    end_date: date | None = None


class UniversityQualityExportHistoryItem(BaseModel):
    id: int
    university_id: int | None
    organization_id: str
    organization_name: str
    export_format: str
    start_date: date | None
    end_date: date | None
    nutrition_quality_score: float
    menu_count: int
    item_count: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/organizations")
def list_organizations(_: Principal = Depends(require_roles(*EXPORT_ROLES))):
    return get_ranking_organizations()


@router.get("/preview")
def preview_quality_export(
    organization_id: str = Query(default="qs"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    _: Principal = Depends(require_roles(*EXPORT_ROLES)),
):
    _validate_date_range(start_date, end_date)
    return build_quality_payload(organization_id, start_date=start_date, end_date=end_date)


@router.get("/history", response_model=list[UniversityQualityExportHistoryItem])
def list_quality_export_history(
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*EXPORT_ROLES)),
):
    query = select(UniversityQualityExport).order_by(desc(UniversityQualityExport.created_at)).limit(10)
    if principal.role != Role.super_admin:
        query = query.where(UniversityQualityExport.requested_by == principal.profile.id)
    return db.scalars(query).all()


@router.post("/ai-insights")
def generate_quality_ai_insights(
    payload: UniversityQualityInsightRequest,
    _: Principal = Depends(require_roles(*EXPORT_ROLES)),
):
    _validate_date_range(payload.start_date, payload.end_date)
    quality_payload = build_quality_payload(
        payload.organization_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    if not quality_payload["export_allowed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=quality_payload["suppression_reason"] or "AI analizi için yeterli veri yok.",
        )
    return build_ai_insights(quality_payload)


@router.post("/export")
def export_quality_metrics(
    payload: UniversityQualityExportRequest,
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*EXPORT_ROLES)),
):
    _validate_date_range(payload.start_date, payload.end_date)
    quality_payload = build_quality_payload(
        payload.organization_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    if not quality_payload["export_allowed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=quality_payload["suppression_reason"] or "Export icin yeterli veri yok.",
        )

    dataset = quality_payload["dataset"]
    export_log = UniversityQualityExport(
        requested_by=principal.profile.id,
        university_id=principal.university_id,
        organization_id=dataset["organization_id"],
        organization_name=dataset["organization_name"],
        export_format=payload.export_format,
        start_date=payload.start_date,
        end_date=payload.end_date,
        nutrition_quality_score=dataset["evidence_readiness_score"],
        menu_count=dataset["menu_count"],
        item_count=dataset["item_count"],
        status="GENERATED",
    )
    db.add(export_log)
    db.commit()
    db.refresh(export_log)

    if payload.export_format == "json":
        content = payload_to_json(quality_payload).encode("utf-8")
        media_type = "application/json"
        extension = "json"
    else:
        content = payload_to_csv(quality_payload).encode("cp1254", errors="replace")
        media_type = "text/csv; charset=utf-8"
        extension = "csv"

    filename = f"yemekhanai-quality-ranking-{export_log.id}.{extension}"
    return StreamingResponse(
        BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _validate_date_range(start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Baslangic tarihi bitis tarihinden sonra olamaz.")
