"""
Deliberately minimal — this project's differentiator is Voice AI Billing,
not inventory/ERP management. No stock movement history, no purchase
orders. Just current quantity + an optional reorder threshold so the
voice assistant can say things like "only 5 left."
"""

from pydantic import BaseModel, Field


class InventoryResponse(BaseModel):
    product_id: int
    product_name: str
    quantity: float
    reorder_level: float

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    """Direct quantity correction — e.g. after a manual stock count."""
    quantity: float = Field(ge=0)
    reorder_level: float | None = Field(default=None, ge=0)


class LowStockItem(BaseModel):
    product_id: int
    product_name: str
    quantity: float
    reorder_level: float