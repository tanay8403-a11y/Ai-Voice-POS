"""
UPDATED: stripe_webhook now verifies the signature using the webhook
signing secret before trusting any payload. Add STRIPE_WEBHOOK_SECRET
to config.py and .env.
"""

import logging

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.database import get_db
from backend.models.payment import PaymentMethod
from backend.services import payment_services as payment_service
"""
Payment endpoints matching the QR flow: create order/QR -> verify -> refund.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.auth.roles import require_any_staff
from backend.schemas.payment import (
    PaymentCreateRequest, PaymentVerifyRequest, RefundRequest,
    PaymentResponse, QrGenerateRequest, QrGenerateResponse,
)
from backend.services import payment_services

router = APIRouter()


@router.post("/create", dependencies=[Depends(require_any_staff)])
def create_payment_order(payload: PaymentCreateRequest, db: Session = Depends(get_db)):
    """Generates the QR (or cash-due amount) for the invoice total — the 'Generate QR' step."""
    return payment_service.create_payment_order(db, payload.invoice_id, payload.method)


@router.post("/verify", response_model=PaymentResponse, dependencies=[Depends(require_any_staff)])
def verify_payment(payload: PaymentVerifyRequest, db: Session = Depends(get_db)):
    """The 'Payment verified' step — also triggers invoice completion if fully paid."""
    from backend.services import billing_service
    invoice = billing_service.get_invoice(db, payload.invoice_id)

    from backend.models.payment import PaymentMethod
    return payment_service.verify_and_record_payment(
        db,
        invoice_id=payload.invoice_id,
        method=PaymentMethod.RAZORPAY,
        amount=invoice.total_amount,
        transaction_ref=payload.razorpay_payment_id,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_signature=payload.razorpay_signature,
    )


@router.post("/cash", response_model=PaymentResponse, dependencies=[Depends(require_any_staff)])
def record_cash_payment(payload: PaymentCreateRequest, db: Session = Depends(get_db)):
    """Direct cash payment — no gateway verification needed."""
    from backend.models.payment import PaymentMethod
    return payment_service.verify_and_record_payment(
        db, invoice_id=payload.invoice_id, method=PaymentMethod.CASH, amount=payload.amount,
    )


@router.get("/{invoice_id}", response_model=list[PaymentResponse], dependencies=[Depends(require_any_staff)])
def get_payments(invoice_id: int, db: Session = Depends(get_db)):
    return payment_service.get_payments_for_invoice(db, invoice_id)


@router.post("/refund", response_model=PaymentResponse, dependencies=[Depends(require_any_staff)])
def refund_payment(payload: RefundRequest, db: Session = Depends(get_db)):
    return payment_service.refund_payment(db, payload.payment_id, payload.reason)
router = APIRouter()
logger = logging.getLogger("api.payment")


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    """
    Verifies the request actually came from Stripe using the signing secret
    before processing. Without this, anyone could POST a fake
    'payment succeeded' event and get free invoices marked paid.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured — rejecting webhook")
        raise HTTPException(status_code=500, detail="Webhook not configured")

    payload_bytes = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload_bytes, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        invoice_number = intent.get("metadata", {}).get("invoice_number")
        amount = intent.get("amount", 0) / 100.0

        from backend.models.invoice import Invoice
        invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
        if invoice:
            # Idempotency guard: skip if this payment_intent was already recorded
            from backend.models.payment import Payment
            already_recorded = (
                db.query(Payment).filter(Payment.transaction_ref == intent["id"]).first()
            )
            if not already_recorded:
                payment_service.record_payment(
                    db, invoice_id=invoice.id, method=PaymentMethod.STRIPE,
                    amount=amount, transaction_ref=intent["id"],
                )
        else:
            logger.warning(f"Stripe webhook: no invoice found for {invoice_number}")

    return {"received": True}