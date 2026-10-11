from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from backend.database.database import Base


class Product(Base):
    __tablename__ = "products"

    __table_args__ = (
        Index("idx_product_name", "name"),
        Index("idx_product_barcode", "barcode"),
        Index("idx_product_sku", "sku"),
    )

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(150), nullable=False)
    sku = Column(String(50), unique=True, nullable=False)
    barcode = Column(String(100), unique=True, nullable=True)

    category = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    image_url = Column(String(255), nullable=True)

    unit = Column(String(20), default="pcs")

    price = Column(Numeric(10, 2), nullable=False, default=0.00)
    cost_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    tax_percent = Column(Numeric(5, 2), nullable=False, default=0.00)

    is_active = Column(Boolean, default=True)

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

    inventory = relationship(
        "Inventory",
        back_populates="product",
        uselist=False,
    )

    invoice_items = relationship(
        "InvoiceItem",
        back_populates="product",
    )

    @property
    def in_stock(self):
        return (
            self.inventory is not None
            and self.inventory.quantity > 0
        )

    def __repr__(self):
        return (
            f"<Product(id={self.id}, "
            f"name='{self.name}', "
            f"sku='{self.sku}')>"
        )