"""
SMTP email sending — used for staff PIN onboarding. Kept as a plain
utility, no DB access.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from backend.config import settings

logger = logging.getLogger("utils.email")


def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
    """
    Sends an email via SMTP. Returns True on success, False on failure
    (logged, not raised) — a failed email shouldn't crash staff creation
    if the SMTP server is temporarily unavailable, since the account is
    already created either way.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP not configured — skipping email to {to_email}. Subject: {subject}")
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email

    if text_body:
        message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, message.as_string())
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_staff_welcome_email(to_email: str, name: str, employee_id: str, one_time_pin: str, store_name: str) -> bool:
    """Sends a staff member's one-time PIN for setting up their permanent PIN."""
    subject = f"Your {store_name} staff account is ready"

    html_body = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0B1E4A;">Welcome to {store_name}</h2>
      <p>Hi {name},</p>
      <p>An account has been created for you on the Voice AI POS system. Use the one-time setup PIN below to choose your personal 4-digit PIN:</p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Employee ID:</strong> {employee_id}</p>
        <p style="margin: 4px 0;"><strong>One-time setup PIN:</strong> {one_time_pin}</p>
      </div>
      <p>This setup PIN can only be used once and stops working after you set your personal PIN.</p>
      <p style="color: #64748b; font-size: 13px;">If you weren't expecting this account, you can ignore this email.</p>
    </div>
    """

    text_body = (
        f"Welcome to {store_name}\n\n"
        f"Employee ID: {employee_id}\n"
        f"One-time setup PIN: {one_time_pin}\n\n"
        f"Use it once to set your personal 4-digit PIN."
    )

    return send_email(to_email, subject, html_body, text_body)