import hashlib
import secrets
from datetime import date, datetime, timedelta, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.catering_management.auth import Principal, require_roles
from app.catering_management.core.database import get_db as get_catering_db
from app.catering_management.models import ResearchExportRequest, Role
from app.config import settings
from app.services.brevo_email import (
    BrevoConfigurationError,
    BrevoDeliveryError,
    is_brevo_configured,
    send_export_email,
)
from app.services.research_export import (
    build_export_preview,
    fetch_anonymized_nutrition_rows,
    rows_to_csv_bytes,
)

router = APIRouter(prefix="/research-exports", tags=["research-exports"])

EXPORT_ROLES = (Role.researcher, Role.university_admin, Role.super_admin)


class ResearchExportEmailRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: str | None = Field(default=None, max_length=120)
    start_date: date | None = None
    end_date: date | None = None


class ResearchExportHistoryItem(BaseModel):
    id: int
    recipient_email: EmailStr
    start_date: date | None
    end_date: date | None
    record_count: int
    subject_count: int
    status: str
    delivery_message: str | None
    brevo_message_id: str | None
    download_expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/preview")
def preview_research_export(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    _: Principal = Depends(require_roles(*EXPORT_ROLES)),
):
    _validate_date_range(start_date, end_date)
    rows = fetch_anonymized_nutrition_rows(start_date=start_date, end_date=end_date)
    return {
        **build_export_preview(rows),
        "brevo_configured": is_brevo_configured(),
    }


@router.get("/history", response_model=list[ResearchExportHistoryItem])
def list_research_export_history(
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*EXPORT_ROLES)),
):
    query = select(ResearchExportRequest).order_by(desc(ResearchExportRequest.created_at)).limit(10)
    if principal.role != Role.super_admin:
        query = query.where(ResearchExportRequest.requested_by == principal.profile.id)
    return db.scalars(query).all()


@router.post("/email")
def email_research_export(
    payload: ResearchExportEmailRequest,
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*EXPORT_ROLES)),
):
    _validate_date_range(payload.start_date, payload.end_date)
    rows = fetch_anonymized_nutrition_rows(
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

    preview = build_export_preview(rows)
    if not preview["export_allowed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=preview["suppression_reason"] or "Export anonimlik kurallarına uygun değil.",
        )

    filename = f"yemekhanai-research-export-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.csv"
    csv_content = rows_to_csv_bytes(rows)
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.research_export_link_ttl_hours)

    export_request = ResearchExportRequest(
        requested_by=principal.profile.id,
        recipient_email=str(payload.recipient_email),
        recipient_name=payload.recipient_name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        record_count=preview["record_count"],
        subject_count=preview["subject_count"],
        status="CREATED",
        download_token_hash=_hash_token(raw_token),
        download_expires_at=expires_at,
    )
    db.add(export_request)
    db.flush()

    try:
        message_id = send_export_email(
            recipient_email=str(payload.recipient_email),
            recipient_name=payload.recipient_name,
            filename=filename,
            csv_content=csv_content,
            metadata=preview,
        )
        export_request.status = "SENT"
        export_request.brevo_message_id = message_id
        export_request.delivery_message = "Mail gönderildi. CSV dosyası ek olarak iletildi."
    except BrevoConfigurationError as exc:
        export_request.status = "EMAIL_NOT_CONFIGURED"
        export_request.delivery_message = str(exc)
        message_id = None
    except BrevoDeliveryError as exc:
        export_request.status = "DELIVERY_FAILED"
        export_request.delivery_message = str(exc)
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    db.commit()
    db.refresh(export_request)

    return {
        **preview,
        "export_id": export_request.id,
        "filename": filename,
        "delivery_status": export_request.status,
        "delivery_message": export_request.delivery_message,
        "email_sent": export_request.status == "SENT",
        "message_id": message_id,
    }


@router.get("/{export_id}/download", name="download_research_export")
def download_research_export(
    export_id: int,
    token: str = Query(min_length=16),
    db: Session = Depends(get_catering_db),
):
    export_request = db.get(ResearchExportRequest, export_id)
    if export_request is None:
        raise HTTPException(status_code=404, detail="Export kaydı bulunamadı.")
    if not secrets.compare_digest(export_request.download_token_hash, _hash_token(token)):
        raise HTTPException(status_code=403, detail="İndirme bağlantısı geçersiz.")
    if _is_expired(export_request.download_expires_at):
        raise HTTPException(status_code=410, detail="İndirme bağlantısının süresi doldu.")

    rows = fetch_anonymized_nutrition_rows(
        start_date=export_request.start_date,
        end_date=export_request.end_date,
    )
    preview = build_export_preview(rows)
    if not preview["export_allowed"]:
        raise HTTPException(status_code=400, detail="Export artık anonimlik kurallarına uygun değil.")

    csv_content = rows_to_csv_bytes(rows)
    filename = f"yemekhanai-research-export-{export_request.id}.csv"
    return StreamingResponse(
        BytesIO(csv_content),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _is_expired(expires_at: datetime) -> bool:
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= now


def _validate_date_range(start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Başlangıç tarihi bitiş tarihinden sonra olamaz.")
