from datetime import datetime
from pydantic import BaseModel


class SalesSummary(BaseModel):
    total_revenue: float
    invoice_count: int
    average_bill_value: float
    total_tax_collected: float
    total_discounts_given: float
    start_date: datetime | None
    end_date: datetime | None


class TopProduct(BaseModel):
    product_id: int
    name: str
    total_quantity_sold: float
    total_revenue: float


class PaymentMethodBreakdown(BaseModel):
    method: str
    total_amount: float
    transaction_count: int


class DashboardStats(BaseModel):
    today_revenue: float
    today_invoice_count: float
    week_revenue: float
    month_revenue: float
    low_stock_count: int
    top_product_today: str | None
    most_used_payment_method: str | None
    top_cashier: str | None
    average_bill_value: float