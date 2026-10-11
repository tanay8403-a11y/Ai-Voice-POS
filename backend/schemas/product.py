from datetime import datetime
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    sku: str | None = None  # auto-generated if not provided
    barcode: str | None = None
    category: str | None = None
    brand: str | None = None
    unit: str = "pcs"
    price: float = Field(gt=0)
    cost_price: float = Field(default=0.0, ge=0)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    initial_stock: float = Field(default=0.0, ge=0)
    reorder_level: float = Field(default=10.0, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = None
    barcode: str | None = None
    category: str | None = None
    brand: str | None = None
    price: float | None = Field(default=None, gt=0)
    cost_price: float | None = Field(default=None, ge=0)
    tax_percent: float | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    barcode: str | None
    category: str | None
    brand: str | None
    unit: str
    price: float
    cost_price: float
    tax_percent: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProductSearchResult(BaseModel):
    """Used by voice AI's smart product search when a spoken name matches multiple products."""
    id: int
    name: str
    sku: str
    price: float

    class Config:
        from_attributes = True