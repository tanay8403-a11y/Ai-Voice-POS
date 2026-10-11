"""
Payment logic centered on the QR flow described in the product spec:
Total -> Generate QR -> Customer Pays -> Payment verified -> Invoice completed.
Cash is handled as a same-request shortcut; Razorpay is the primary online path.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
import razorpay

from backend.config import settings
from backend.models.payment import Payment, PaymentMethod, PaymentStatus
from backend.models.invoice import Invoice, InvoiceStatus
from backend.services import billing_service
from backend.utils import qr as qr_util

_razorpay_client = None
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    _razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _get_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


def create_payment_order(db: Session, invoice_id: int, method: PaymentMethod) -> dict:
    """
    Step: 'Generate QR'. For cash, this just returns the amount due (no
    gateway order needed). For Razorpay/UPI, creates an order and a QR
    code image encoding the UPI payment link.
    """
    invoice = _get_invoice(db, invoice_id)
    if invoice.status not in (InvoiceStatus.DRAFT,):
        raise HTTPException(status_code=400, detail=f"Invoice is already {invoice.status}")
    if invoice.total_amount <= 0:
        raise HTTPException(status_code=400, detail="Invoice total must be greater than zero")

    if method == PaymentMethod.CASH:
        return {"method": "cash", "amount": invoice.total_amount, "invoice_number": invoice.invoice_number}

    if not _razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")

    order = _razorpay_client.order.create({
        "amount": int(invoice.total_amount * 100),  # paise
        "currency": "INR",
        "receipt": invoice.invoice_number,
        "payment_capture": 1,
    })

    qr_bytes = qr_util.generate_upi_payment_qr(
        upi_id=settings.STORE_UPI_ID if hasattr(settings, "STORE_UPI_ID") else "store@upi",
        payee_name=settings.APP_NAME,
        amount=invoice.total_amount,
        invoice_number=invoice.invoice_number,
    )
    import base64
    qr_base64 = base64.b64encode(qr_bytes).decode("utf-8")

    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "qr_image_base64": qr_base64,
    }


def verify_and_record_payment(
    db: Session,
    invoice_id: int,
    method: PaymentMethod,
    amount: float,
    transaction_ref: str | None = None,
    razorpay_order_id: str | None = None,
    razorpay_signature: str | None = None,
) -> Payment:
    """
    Step: 'Payment verified'. Verifies signature for online payments,
    records the Payment row, and — if it covers the full total — completes
    the invoice (deducts stock, marks PAID) via billing_service.
    """
    invoice = _get_invoice(db, invoice_id)

    if method == PaymentMethod.RAZORPAY:
        if not (razorpay_order_id and transaction_ref and razorpay_signature):
            raise HTTPException(status_code=400, detail="Missing Razorpay verification fields")
        try:
            _razorpay_client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": transaction_ref,
                "razorpay_signature": razorpay_signature,
            })
        except razorpay.errors.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Payment signature verification failed")

    payment = Payment(
        invoice_id=invoice.id,
        method=method,
        amount=amount,
        transaction_ref=transaction_ref,
        status=PaymentStatus.SUCCESS,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Step: 'Invoice completed'
    if amount >= invoice.total_amount and invoice.status == InvoiceStatus.DRAFT:
        billing_service.complete_billing(db, invoice.id, payment_method=method.value)

    return payment


def get_payments_for_invoice(db: Session, invoice_id: int) -> list[Payment]:
    return db.query(Payment).filter(Payment.invoice_id == invoice_id).all()


def refund_payment(db: Session, payment_id: int, reason: str | None = None) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != PaymentStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="Only successful payments can be refunded")

    if payment.method == PaymentMethod.RAZORPAY and payment.transaction_ref and _razorpay_client:
        _razorpay_client.payment.refund(payment.transaction_ref, {})

    payment.status = PaymentStatus.REFUNDED
    db.commit()
    db.refresh(payment)

    invoice = _get_invoice(db, payment.invoice_id)
    if invoice.status == InvoiceStatus.PAID:
        invoice.status = InvoiceStatus.REFUNDED
        db.commit()

    return payment