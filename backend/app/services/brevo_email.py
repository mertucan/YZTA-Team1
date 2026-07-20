import base64
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings

BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"
UTF8_BOM = b"\xef\xbb\xbf"


class BrevoConfigurationError(RuntimeError):
    pass


class BrevoDeliveryError(RuntimeError):
    pass


def is_brevo_configured() -> bool:
    return bool(settings.brevo_api_key and settings.brevo_sender_email)


def send_export_email(
    recipient_email: str,
    recipient_name: str | None,
    filename: str,
    csv_content: bytes,
    metadata: dict[str, Any],
) -> str:
    return send_export_email_with_attachments(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        attachments=[{"filename": filename, "content": csv_content}],
        metadata=metadata,
    )


def send_export_email_with_attachments(
    recipient_email: str,
    recipient_name: str | None,
    attachments: list[dict[str, Any]],
    metadata: dict[str, Any],
) -> str:
    if not is_brevo_configured():
        raise BrevoConfigurationError("Brevo API key or sender email is missing.")

    brevo_attachments = []
    filenames = []
    for attachment in attachments:
        content = attachment["content"]
        if not content.startswith(UTF8_BOM):
            content = UTF8_BOM + content
        filename = attachment["filename"]
        filenames.append(filename)
        brevo_attachments.append(
            {
                "name": filename,
                "content": base64.b64encode(content).decode("ascii"),
            }
        )

    payload = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [{"email": recipient_email, "name": recipient_name or recipient_email}],
        "subject": "YemekhanAI Anonim Arastirma Verisi Export",
        "htmlContent": _build_html(metadata, filenames),
        "attachment": brevo_attachments,
    }

    request = Request(
        BREVO_TRANSACTIONAL_EMAIL_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": settings.brevo_api_key or "",
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise BrevoDeliveryError(f"Brevo rejected the email: {detail}") from exc
    except (URLError, TimeoutError) as exc:
        raise BrevoDeliveryError("Brevo email request failed.") from exc

    return data.get("messageId", "")


def _build_html(metadata: dict[str, Any], filenames: list[str]) -> str:
    table_rows = "".join(
        f"<li>{table.get('label')}: {table.get('record_count', 0)} kayit</li>"
        for table in metadata.get("tables", [])
    )
    file_rows = "".join(f"<li>{filename}</li>" for filename in filenames)
    return f"""
    <html>
      <body>
        <p>Merhaba,</p>
        <p>Talep ettiginiz anonimlestirilmis arastirma verisi CSV ekleriyle paylasilmistir.</p>
        <ul>
          <li>Dosya sayisi: {len(filenames)}</li>
          <li>Kayit sayisi: {metadata.get("record_count", 0)}</li>
          <li>Arastirma oznesi sayisi: {metadata.get("subject_count", 0)}</li>
          <li>Tarih araligi: {metadata.get("date_min") or "-"} / {metadata.get("date_max") or "-"}</li>
        </ul>
        <p>Ekler:</p>
        <ul>{file_rows}</ul>
        <p>Tablo ozeti:</p>
        <ul>{table_rows}</ul>
        <p>Dosyalarda ad, soyad, TC kimlik numarasi, e-posta, telefon veya dogrudan kullanici tanimlayici alanlari bulunmaz.</p>
      </body>
    </html>
    """
