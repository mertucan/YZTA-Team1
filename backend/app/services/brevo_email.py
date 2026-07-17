import base64
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings

BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"

# Excel gibi programların CSV içeriğini UTF-8 olarak tanıyabilmesi için BOM
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
    if not is_brevo_configured():
        raise BrevoConfigurationError("Brevo API key or sender email is missing.")

    # Excel (özellikle Windows/Türkçe yerel ayarlarda) BOM olmadan dosyayı
    # UTF-8 yerine sistem kod sayfasıyla (ör. Windows-1254) açabiliyor ve
    # bu da Türkçe karakterlerin bozulmasına yol açıyor. BOM ekleyerek
    # dosyanın UTF-8 olarak tanınmasını garanti ediyoruz.
    if not csv_content.startswith(UTF8_BOM):
        csv_content = UTF8_BOM + csv_content

    payload = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [{"email": recipient_email, "name": recipient_name or recipient_email}],
        "subject": "YemekhanAI Anonim Beslenme Verisi Export",
        "htmlContent": _build_html(metadata, filename),
        "attachment": [
            {
                "name": filename,
                "content": base64.b64encode(csv_content).decode("ascii"),
            }
        ],
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


def _build_html(metadata: dict[str, Any], filename: str) -> str:
    return f"""
    <html>
      <body>
        <p>Merhaba,</p>
        <p>Talep ettiğiniz anonimleştirilmiş beslenme verisi CSV ekiyle paylaşılmıştır.</p>
        <ul>
          <li>Dosya: {filename}</li>
          <li>Kayıt sayısı: {metadata.get("record_count", 0)}</li>
          <li>Araştırma öznesi sayısı: {metadata.get("subject_count", 0)}</li>
          <li>Tarih aralığı: {metadata.get("date_min") or "-"} / {metadata.get("date_max") or "-"}</li>
        </ul>
        <p>Dosyada ad, soyad, TC kimlik numarası veya doğrudan tanımlayıcı alan bulunmaz.</p>
      </body>
    </html>
    """