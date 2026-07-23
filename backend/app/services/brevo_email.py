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
        "subject": "TabloDot Anonim Arastirma Verisi Export",
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


def send_welcome_email(recipient_email: str, recipient_name: str | None) -> str:
    if not is_brevo_configured():
        raise BrevoConfigurationError("Brevo API key or sender email is missing.")

    payload = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [{"email": recipient_email, "name": recipient_name or recipient_email}],
        "subject": "TabloDot'a hoş geldiniz",
        "htmlContent": _build_welcome_html(recipient_name),
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


def send_password_reset_code_email(
    recipient_email: str,
    recipient_name: str | None,
    code: str,
) -> str:
    if not is_brevo_configured():
        raise BrevoConfigurationError("Brevo API key or sender email is missing.")

    payload = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [{"email": recipient_email, "name": recipient_name or recipient_email}],
        "subject": "TabloDot şifre sıfırlama kodu",
        "htmlContent": _build_password_reset_html(recipient_name, code),
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


def _build_welcome_html(recipient_name: str | None) -> str:
    name = recipient_name or "TabloDot kullanıcısı"
    return f"""
    <html>
      <body style="margin:0;padding:0;background:#f7f3ec;font-family:Arial,sans-serif;color:#222321;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ec;padding:28px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfce;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="background:#181818;padding:22px 26px;text-align:center;">
                    <div style="font-family:Georgia,serif;font-size:32px;line-height:1;color:#ffffff;letter-spacing:.2px;">TabloDot</div>
                    <div style="font-size:12px;color:#fdfd30;margin-top:8px;">Akıllı yemekhane ve catering yönetimi</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 30px;">
                    <h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.15;margin:0 0 12px;color:#222321;">Hoş geldiniz, {name}</h1>
                    <p style="font-size:15px;line-height:1.65;margin:0 0 18px;color:#4b4f49;">
                      TabloDot hesabınız oluşturuldu. Artık firma, üniversite, menü ve stok süreçlerinizi tek panelden yönetmeye başlayabilirsiniz.
                    </p>
                    <p style="font-size:14px;line-height:1.6;margin:0;color:#6b6f68;">
                      Güvenliğiniz için hesabınıza giriş yaparken kayıt sırasında belirlediğiniz e-posta ve şifreyi kullanın.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 30px;background:#fff7ec;color:#8a5a16;font-size:12px;line-height:1.5;">
                    Bu e-posta TabloDot hesap kaydınız sonrasında otomatik olarak gönderilmiştir.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def _build_password_reset_html(recipient_name: str | None, code: str) -> str:
    name = recipient_name or "TabloDot kullanıcısı"
    return f"""
    <html>
      <body style="margin:0;padding:0;background:#f7f3ec;font-family:Arial,sans-serif;color:#222321;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ec;padding:28px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfce;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="background:#181818;padding:22px 26px;text-align:center;">
                    <div style="font-family:Georgia,serif;font-size:32px;line-height:1;color:#ffffff;letter-spacing:.2px;">TabloDot</div>
                    <div style="font-size:12px;color:#fdfd30;margin-top:8px;">Şifre sıfırlama isteği</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 30px;">
                    <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.15;margin:0 0 12px;color:#222321;">Merhaba, {name}</h1>
                    <p style="font-size:15px;line-height:1.65;margin:0 0 18px;color:#4b4f49;">
                      TabloDot hesabınız için şifre sıfırlama kodunuz aşağıdadır.
                    </p>
                    <div style="font-size:30px;letter-spacing:8px;font-weight:800;text-align:center;background:#fff7ec;border:1px solid #f1c681;border-radius:12px;color:#e88000;padding:18px 12px;margin:18px 0;">
                      {code}
                    </div>
                    <p style="font-size:14px;line-height:1.6;margin:0;color:#6b6f68;">
                      Bu kodu şifre sıfırlama ekranına yazdıktan sonra yeni şifrenizi belirleyebilirsiniz. Bu işlemi siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
