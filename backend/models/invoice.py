"""
Invoice + InvoiceItem models: Represents customer bills in the Voice AI POS.
Each Invoice contains one or more InvoiceItems.
"""

from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Numeric,
    DateTime,
    ForeignKey,
    Enum,
)

from sqlalchemy.orm import relationship

from backend.database.database import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    invoice_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=True,
        index=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    subtotal = Column(
        Numeric(12, 2),
        nullable=False,
        default=0.00,
    )

    tax_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0.00,
    )

    discount_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0.00,
    )

    total_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0.00,
    )

    payment_method = Column(
        String(30),
        nullable=True,
    )

    status = Column(
        Enum(InvoiceStatus),
        default=InvoiceStatus.DRAFT,
        nullable=False,
    )

    notes = Column(
        String(255),
        nullable=True,
    )

    voice_session_id = Column(
        String(100),
        nullable=True,
        index=True,
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

    customer = relationship(
        "Customer",
        back_populates="invoices",
    )

    created_by_user = relationship(
        "User",
        back_populates="invoices",
    )

    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
    )

    payments = relationship(
        "Payment",
        back_populates="invoice",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return (
            f"<Invoice("
            f"id={self.id}, "
            f"number='{self.invoice_number}', "
            f"status='{self.status.value}', "
            f"total={self.total_amount})>"
        )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

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

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    quantity = Column(
        Float,
        nullable=False,
        default=1.0,
    )

    unit_price = Column(
        Numeric(12, 2),
        nullable=False,
    )

    tax_percent = Column(
        Float,
        default=0.0,
    )

    discount = Column(
        Numeric(12, 2),
        default=0.00,
        nullable=False,
    )

    line_total = Column(
        Numeric(12, 2),
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
        back_populates="items",
    )

    product = relationship(
        "Product",
        back_populates="invoice_items",
    )

    def __repr__(self):
        return (
            f"<InvoiceItem("
            f"id={self.id}, "
            f"invoice_id={self.invoice_id}, "
            f"product_id={self.product_id}, "
            f"qty={self.quantity})>"
        )