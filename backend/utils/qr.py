"""
QR code generation utilities. Separate from barcode.py since QR codes
serve a different purpose here (encoding structured lookup payloads
and invoice/payment links) rather than product SKUs.
"""

import io
import qrcode
from qrcode.constants import ERROR_CORRECT_M


def generate_qr_image(data: str, box_size: int = 10, border: int = 2) -> bytes:
    """Generates a QR code PNG encoding arbitrary string data."""
    if not data:
        raise ValueError("Cannot generate a QR code for empty data")

    qr = qrcode.QRCode(
        version=None,  # auto-size based on data length
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def generate_upi_payment_qr(upi_id: str, payee_name: str, amount: float, invoice_number: str) -> bytes:
    """
    Generates a QR code encoding a standard UPI deep link, so customers can
    scan-to-pay directly from any UPI app (GPay, PhonePe, Paytm, etc.).
    """
    upi_url = (
        f"upi://pay?pa={upi_id}&pn={payee_name.replace(' ', '%20')}"
        f"&am={amount:.2f}&cu=INR&tn=Invoice%20{invoice_number}"
    )
    return generate_qr_image(upi_url)


def generate_invoice_lookup_qr(invoice_number: str) -> bytes:
    """QR encoding a simple lookup payload for the invoice (e.g. printed on receipts)."""
    payload = f"INVOICE|{invoice_number}"
    return generate_qr_image(payload)