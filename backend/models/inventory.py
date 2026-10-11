"""
Simplified inventory: just current quantity + reorder level, no movement
history. This project's differentiator is Voice AI Billing, not stock
tracking — the voice assistant only needs to say "5 left" and to block
overselling, both of which this minimal model supports.
"""

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.database.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)

    quantity = Column(Float, default=0.0)
    reorder_level = Column(Float, default=10.0)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="inventory")

    def __repr__(self):
        return f"<Inventory product_id={self.product_id} qty={self.quantity}>"