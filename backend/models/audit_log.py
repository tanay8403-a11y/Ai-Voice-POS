"""
Audit Log Model

Stores important activities performed by users or the system.
Useful for security, debugging, and tracking business operations.
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
)

from sqlalchemy.orm import relationship

from backend.database.database import Base


class AuditAction(str, enum.Enum):
    LOGIN = "login"
    LOGOUT = "logout"

    CREATE_PRODUCT = "create_product"
    UPDATE_PRODUCT = "update_product"
    DELETE_PRODUCT = "delete_product"

    STOCK_IN = "stock_in"
    STOCK_OUT = "stock_out"
    STOCK_ADJUSTMENT = "stock_adjustment"

    CREATE_CUSTOMER = "create_customer"
    UPDATE_CUSTOMER = "update_customer"

    CREATE_INVOICE = "create_invoice"
    UPDATE_INVOICE = "update_invoice"
    CANCEL_INVOICE = "cancel_invoice"

    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_REFUND = "payment_refund"

    VOICE_SESSION_START = "voice_session_start"
    VOICE_SESSION_END = "voice_session_end"

    SYSTEM = "system"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    action = Column(
        Enum(AuditAction),
        nullable=False,
        index=True,
    )

    entity = Column(
        String(50),
        nullable=False,
    )

    entity_id = Column(
        Integer,
        nullable=True,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    ip_address = Column(
        String(45),
        nullable=True,
    )

    device = Column(
        String(255),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # ---------------- Relationships ----------------

    user = relationship("User")

    def __repr__(self):
        return (
            f"<AuditLog("
            f"id={self.id}, "
            f"action='{self.action.value}', "
            f"user={self.user_id})>"
        )