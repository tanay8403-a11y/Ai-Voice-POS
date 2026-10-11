"""
Store model
Stores business information for the Voice AI POS System.
Supports one owner and multiple employees.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from sqlalchemy.orm import relationship

from backend.database.database import Base


class Store(Base):
    __tablename__ = "stores"

    # =====================================================
    # Primary Key
    # =====================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # =====================================================
    # Owner
    # =====================================================

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        unique=True,
    )

    # =====================================================
    # Store Information
    # =====================================================

    store_name = Column(
        String(150),
        nullable=False,
    )

    business_type = Column(
        String(100),
        nullable=False,
    )

    store_code = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )

    # =====================================================
    # GST
    # =====================================================

    gst_registered = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    gst_number = Column(
        String(20),
        unique=True,
        nullable=True,
    )

    pan_number = Column(
        String(20),
        nullable=True,
    )

    # =====================================================
    # Contact
    # =====================================================

    phone = Column(
        String(15),
        nullable=False,
    )

    alternate_phone = Column(
        String(15),
        nullable=True,
    )

    email = Column(
        String(150),
        nullable=False,
    )

    website = Column(
        String(255),
        nullable=True,
    )

    # =====================================================
    # Address
    # =====================================================

    address = Column(
        Text,
        nullable=False,
    )

    city = Column(
        String(100),
        nullable=False,
    )

    state = Column(
        String(100),
        nullable=False,
    )

    country = Column(
        String(100),
        default="India",
        nullable=False,
    )

    pincode = Column(
        String(10),
        nullable=False,
    )

    # =====================================================
    # Invoice
    # =====================================================

    invoice_prefix = Column(
        String(10),
        default="INV",
        nullable=False,
    )

    invoice_suffix = Column(
        String(10),
        nullable=True,
    )

    invoice_start_number = Column(
        Integer,
        default=1,
        nullable=False,
    )

    current_invoice_number = Column(
        Integer,
        default=1,
        nullable=False,
    )

    financial_year = Column(
        String(20),
        default="2026-27",
        nullable=False,
    )

    # =====================================================
    # Tax
    # =====================================================

    default_tax = Column(
        Integer,
        default=18,
        nullable=False,
    )

    # =====================================================
    # Payment
    # =====================================================

    currency = Column(
        String(10),
        default="INR",
        nullable=False,
    )

    timezone = Column(
        String(50),
        default="Asia/Kolkata",
        nullable=False,
    )

    upi_id = Column(
        String(100),
        nullable=True,
    )

    qr_code_path = Column(
        String(255),
        nullable=True,
    )

    # =====================================================
    # Bank
    # =====================================================

    bank_name = Column(
        String(100),
        nullable=True,
    )

    account_holder = Column(
        String(100),
        nullable=True,
    )

    account_number = Column(
        String(50),
        nullable=True,
    )

    ifsc_code = Column(
        String(20),
        nullable=True,
    )

    # =====================================================
    # Branding
    # =====================================================

    logo_url = Column(
        String(255),
        nullable=True,
    )

    receipt_header = Column(
        Text,
        nullable=True,
    )

    receipt_footer = Column(
        Text,
        nullable=True,
    )

    # =====================================================
    # Status
    # =====================================================

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    # =====================================================
    # Audit
    # =====================================================

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
    
    # =====================================================
    # Relationships
    # =====================================================

    owner = relationship(
        "User",
        foreign_keys=[owner_id],
        back_populates="owned_store",
    )

    employees = relationship(
        "User",
        foreign_keys="User.store_id",
        back_populates="store",
        cascade="all, delete-orphan",
    )
    # =====================================================
    # Representation
    # =====================================================

    def __repr__(self):
        return (
            f"<Store(id={self.id}, "
            f"name='{self.store_name}', "
            f"code='{self.store_code}')>"
        )