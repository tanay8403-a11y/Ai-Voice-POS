"""
Customer model: Stores customer details for billing, purchase history,
loyalty programs, and future AI recommendations.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    Numeric,
    String,
)

from sqlalchemy.orm import relationship

from backend.database.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(150),
        nullable=False,
        index=True,
    )

    phone = Column(
        String(20),
        unique=True,
        nullable=True,
        index=True,
    )

    email = Column(
        String(150),
        unique=True,
        nullable=True,
    )

    address = Column(
        String(255),
        nullable=True,
    )

    gst_number = Column(
        String(30),
        nullable=True,
    )

    loyalty_points = Column(
        Integer,
        default=0,
        nullable=False,
    )

    total_spent = Column(
        Numeric(12, 2),
        default=0.00,
        nullable=False,
    )

    preferred_language = Column(
        String(10),
        default="en",
    )

    notes = Column(
        String(500),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        default=True,
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

    invoices = relationship(
        "Invoice",
        back_populates="customer",
    )

    def __repr__(self):
        return (
            f"<Customer("
            f"id={self.id}, "
            f"name='{self.name}', "
            f"phone='{self.phone}')>"
        )