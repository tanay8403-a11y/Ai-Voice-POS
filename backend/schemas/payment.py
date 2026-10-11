from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    UPI = "upi"
    RAZORPAY = "razorpay"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentCreateRequest(BaseModel):
    invoice_id: int
    method: PaymentMethod
    amount: float = Field(gt=0)


class PaymentVerifyRequest(BaseModel):
    """For Razorpay QR/checkout flow verification."""
    invoice_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class QrGenerateRequest(BaseModel):
    invoice_id: int


class QrGenerateResponse(BaseModel):
    order_id: str
    amount: int  # paise
    currency: str = "INR"
    qr_image_base64: str | None = None  # optional embedded QR for display


class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    method: PaymentMethod
    status: PaymentStatus
    amount: float
    transaction_ref: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class RefundRequest(BaseModel):
    payment_id: int
    reason: str | None = None