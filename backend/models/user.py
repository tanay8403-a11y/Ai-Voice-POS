"""
User model:
Stores owner and staff accounts for the Voice AI POS system.
Supports Employee ID login, multi-store, permissions, and audit fields.
"""

from datetime import datetime
import enum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)

from sqlalchemy.orm import relationship

from backend.database.database import Base


# ==========================================================
# User Roles
# ==========================================================

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    CASHIER = "cashier"




# ==========================================================
# User Model
# ==========================================================

class User(Base):
    __tablename__ = "users"

    # ------------------------------------------------------
    # Primary Key
    # ------------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ------------------------------------------------------
    # Employee Details
    # ------------------------------------------------------

    employee_id = Column(
        String(20),
        unique=True,
        nullable=True,
        index=True,
    )

    store_id = Column(
        Integer,
        ForeignKey("stores.id"),
        nullable=True,
        index=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    # ------------------------------------------------------
    # Personal Details
    # ------------------------------------------------------

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    phone = Column(
        String(15),
        unique=True,
        nullable=False,
    )

    alternate_phone = Column(
        String(15),
        nullable=True,
    )

    

    date_of_birth = Column(
        Date,
        nullable=True,
    )

    # ------------------------------------------------------
    # Authentication
    # ------------------------------------------------------

    hashed_password = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        Enum(UserRole),
        default=UserRole.CASHIER,
        nullable=False,
    )   


    # ------------------------------------------------------
    # Preferences
    # ------------------------------------------------------

    preferred_language = Column(
        String(10),
        default="en",
        nullable=False,
    )

    # ------------------------------------------------------
    # Status
    # ------------------------------------------------------

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_verified = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    account_locked = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    failed_login_attempts = Column(
        Integer,
        default=0,
        nullable=False,
    )

    # ------------------------------------------------------
    # Preferences
    # ------------------------------------------------------

    preferred_language = Column(
        String(10),
        default="en",
        nullable=False,
    )

    # ------------------------------------------------------
    # Profile
    # ------------------------------------------------------

    profile_image = Column(
        String(255),
        nullable=True,
    )

    # ------------------------------------------------------
    # Login History
    # ------------------------------------------------------

    last_login = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    password_changed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_password_reset = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ------------------------------------------------------
    # Audit
    # ------------------------------------------------------

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


    # ------------------------------------------------------
    # Authentication (add alongside hashed_password/role)
    # ------------------------------------------------------

    must_set_pin = Column(
        "must_change_password",
        Boolean,
        default=True,
        nullable=False,
    )

    # ======================================================
    # Relationships
    # ======================================================

    invoices = relationship(
        "Invoice",
        back_populates="created_by_user",
    )

    store = relationship(
        "Store",
        foreign_keys=[store_id],
        back_populates="employees",
    )

    creator = relationship(
        "User",
        remote_side=[id],
    )


    owned_store = relationship(
        "Store",
        foreign_keys="Store.owner_id",
        back_populates="owner",
        uselist=False,
    )


    # ======================================================
    # Representation
    # ======================================================

    def __repr__(self):
        return (
            f"<User("
            f"id={self.id}, "
            f"employee_id='{self.employee_id}', "
            f"name='{self.name}', "
            f"role='{self.role.value}')>"
        )