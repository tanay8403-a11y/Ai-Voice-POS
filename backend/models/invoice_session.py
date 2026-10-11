"""
InvoiceSession model:
Stores every AI conversation between the cashier and the Voice AI assistant.
Used for conversation history, analytics, debugging and AI improvements.
"""

from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum,
    Boolean,
)

from sqlalchemy.orm import relationship

from backend.database.database import Base


class InvoiceSessionStatus(str, enum.Enum):
    STARTED = "started"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class InvoiceSession(Base):
    __tablename__ = "invoice_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    session_id = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=True,
        index=True,
    )

    language = Column(
        String(10),
        default="en",
        nullable=False,
    )

    status = Column(
        Enum(InvoiceSessionStatus),
        default=InvoiceSessionStatus.STARTED,
        nullable=False,
    )

    transcript = Column(
        Text,
        nullable=True,
    )

    ai_response = Column(
        Text,
        nullable=True,
    )

    intent = Column(
        String(100),
        nullable=True,
    )

    audio_file = Column(
        String(255),
        nullable=True,
    )

    confidence_score = Column(
        Integer,
        nullable=True,
    )

    is_completed = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    started_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True,
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

    user = relationship(
        "User",
    )

    invoice = relationship(
        "Invoice",
    )

    def __repr__(self):
        return (
            f"<InvoiceSession("
            f"session='{self.session_id}', "
            f"user={self.user_id}, "
            f"status='{self.status.value}')>"
        )


# Backwards-compatible alias for older imports
InInvoiceSession = InvoiceSession