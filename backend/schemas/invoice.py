from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


# ---------- Billing flow (start -> add-item -> ... -> complete) ----------

class BillingStartRequest(BaseModel):
    customer_id: int | None = None


class AddItemRequest(BaseModel):
    invoice_id: int
    product_id: int
    quantity: float = Field(default=1.0, gt=0)


class RemoveItemRequest(BaseModel):
    invoice_id: int
    product_id: int


class UpdateQuantityRequest(BaseModel):
    invoice_id: int
    product_id: int
    quantity: float = Field(gt=0)


class ApplyDiscountRequest(BaseModel):
    invoice_id: int
    discount_type: str = Field(pattern="^(percent|flat)$")
    value: float = Field(gt=0)
    target_product_id: int | None = None  # None = applies to whole cart


class CompleteBillingRequest(BaseModel):
    invoice_id: int
    payment_method: str | None = None  # "cash" | "card" | "upi" | None (pay later)


# ---------- Response models ----------

class InvoiceItemResponse(BaseModel):
    product_id: int
    product_name: str
    quantity: float
    unit_price: float
    tax_percent: float
    discount: float
    line_total: float

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: int | None
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    status: InvoiceStatus
    created_at: datetime
    items: list[InvoiceItemResponse]

    class Config:
        from_attributes = True


class InvoiceSummary(BaseModel):
    """Lightweight version for list views (invoice history, dashboard)."""
    id: int
    invoice_number: str
    total_amount: float
    status: InvoiceStatus
    created_at: datetime

    class Config:
        from_attributes = True