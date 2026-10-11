"""
Payment model: Stores payment transactions for invoices.
Supports Cash, UPI, QR, Cards, Wallets, Bank Transfer and Refunds.
"""

from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    DateTime,
    ForeignKey,
    Enum,
    Boolean,
)

from sqlalchemy.orm import relationship

from backend.database.database import Base


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    UPI = "upi"
    QR = "qr"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    WALLET = "wallet"
    RAZORPAY = "razorpay"
    STRIPE = "stripe"
    BANK_TRANSFER = "bank_transfer"
    SPLIT = "split"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False,
        index=True,
    )

    method = Column(
        Enum(PaymentMethod),
        nullable=False,
    )

    status = Column(
        Enum(PaymentStatus),
        default=PaymentStatus.PENDING,
        nullable=False,
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    currency = Column(
        String(10),
        default="INR",
        nullable=False,
    )

    gateway_name = Column(
        String(50),
        nullable=True,
    )

    gateway_order_id = Column(
        String(150),
        nullable=True,
    )

    gateway_payment_id = Column(
        String(150),
        nullable=True,
        unique=True,
        index=True,
    )

    transaction_ref = Column(
        String(150),
        nullable=True,
        index=True,
    )

    is_refund = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    refund_reason = Column(
        String(255),
        nullable=True,
    )

    notes = Column(
        String(255),
        nullable=True,
    )

    paid_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # ---------------- Relationships ----------------

    invoice = relationship(
        "Invoice",
        back_populates="payments",
    )

    def __repr__(self):
        return (
            f"<Payment("
            f"id={self.id}, "
            f"invoice_id={self.invoice_id}, "
            f"method='{self.method.value}', "
            f"status='{self.status.value}', "
            f"amount={self.amount})>"
        )