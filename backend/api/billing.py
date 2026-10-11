"""
Billing endpoints for the invoice lifecycle plus legacy report routes.
The frontend depends on the invoice CRUD surface here, while analytics
uses the dedicated reports router.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.database.database import get_db
from backend.auth.authentication import get_current_user
from backend.auth.roles import require_any_staff, require_manager_or_admin
from backend.models.user import User
from backend.models.invoice import Invoice, InvoiceItem, InvoiceStatus
from backend.models.customer import Customer
from backend.schemas.invoice import (
    BillingStartRequest,
    AddItemRequest,
    RemoveItemRequest,
    UpdateQuantityRequest,
    ApplyDiscountRequest,
    CompleteBillingRequest,
    InvoiceResponse,
)
from backend.schemas.reports import SalesSummary, TopProduct, PaymentMethodBreakdown, DashboardStats
from backend.services import billing_service, report_service
from backend.utils.invoice import generate_invoice_pdf

router = APIRouter()


def _serialize_invoice(invoice: Invoice) -> dict:
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "customer_id": invoice.customer_id,
        "subtotal": float(invoice.subtotal or 0),
        "tax_amount": float(invoice.tax_amount or 0),
        "discount_amount": float(invoice.discount_amount or 0),
        "total_amount": float(invoice.total_amount or 0),
        "status": invoice.status,
        "created_at": invoice.created_at,
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else f"Product #{item.product_id}",
                "quantity": item.quantity,
                "unit_price": float(item.unit_price or 0),
                "tax_percent": float(item.tax_percent or 0),
                "discount": float(item.discount or 0),
                "line_total": float(item.line_total or 0),
            }
            for item in invoice.items
        ],
    }


def _get_invoice_with_items(db: Session, invoice_id: int) -> Invoice:
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.items).joinedload(InvoiceItem.product))
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.get("/recent", dependencies=[Depends(require_manager_or_admin)])
def recent_invoices(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(
        default=None,
        pattern="^(draft|paid|partially_paid|cancelled|refunded)$",
    ),
    search: str | None = Query(default=None, max_length=150),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice)
    if status:
        query = query.filter(Invoice.status == InvoiceStatus(status))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(term),
                Invoice.customer.has(Customer.name.ilike(term)),
                Invoice.created_by_user.has(User.name.ilike(term)),
            )
        )

    total = query.count()
    invoices = (
        query.options(
            joinedload(Invoice.customer),
            joinedload(Invoice.created_by_user),
            joinedload(Invoice.items).joinedload(InvoiceItem.product),
        )
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "items": [
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "customer_name": invoice.customer.name if invoice.customer else "Walk-in customer",
                "cashier_name": invoice.created_by_user.name if invoice.created_by_user else "Unknown",
                "items": [
                    {
                        "product_name": item.product.name if item.product else f"Product #{item.product_id}",
                        "quantity": item.quantity,
                    }
                    for item in invoice.items
                ],
                "payment_method": invoice.payment_method,
                "total_amount": float(invoice.total_amount or 0),
                "status": invoice.status.value,
                "created_at": invoice.created_at,
            }
            for invoice in invoices
        ],
        "total": total,
    }


@router.post("/start", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def start_billing(payload: BillingStartRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = billing_service.start_billing(db, created_by=current_user.id, customer_id=payload.customer_id)
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.post("/add-item", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def add_item(payload: AddItemRequest, db: Session = Depends(get_db)):
    invoice = billing_service.add_item(db, payload.invoice_id, payload.product_id, payload.quantity)
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.post("/remove-item", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def remove_item(payload: RemoveItemRequest, db: Session = Depends(get_db)):
    invoice = billing_service.remove_item(db, payload.invoice_id, payload.product_id)
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.post("/remove-last-item/{invoice_id}", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def remove_last_item(invoice_id: int, db: Session = Depends(get_db)):
    invoice = billing_service.remove_last_item(db, invoice_id)
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.post("/update-qty", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def update_quantity(payload: UpdateQuantityRequest, db: Session = Depends(get_db)):
    invoice = billing_service.update_quantity(db, payload.invoice_id, payload.product_id, payload.quantity)
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.post("/apply-discount", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def apply_discount(payload: ApplyDiscountRequest, db: Session = Depends(get_db)):
    invoice = billing_service.apply_discount(
        db,
        payload.invoice_id,
        payload.discount_type,
        payload.value,
        payload.target_product_id,
    )
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.post("/complete", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def complete_billing(payload: CompleteBillingRequest, db: Session = Depends(get_db)):
    invoice = billing_service.complete_billing(db, payload.invoice_id, payment_method=payload.payment_method)
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.post("/cancel/{invoice_id}", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def cancel_sale(invoice_id: int, db: Session = Depends(get_db)):
    invoice = billing_service.cancel_sale(db, invoice_id)
    invoice = _get_invoice_with_items(db, invoice.id)
    return _serialize_invoice(invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse, dependencies=[Depends(require_any_staff)])
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = _get_invoice_with_items(db, invoice_id)
    return _serialize_invoice(invoice)


@router.get("/{invoice_id}/pdf", dependencies=[Depends(require_any_staff)])
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    invoice = _get_invoice_with_items(db, invoice_id)
    pdf_bytes = generate_invoice_pdf(invoice)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{invoice.invoice_number}.pdf"'},
    )


@router.get("/sales", response_model=SalesSummary, dependencies=[Depends(require_manager_or_admin)])
def sales_summary(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
):
    return report_service.sales_summary(db, start_date, end_date)


@router.get("/products", response_model=list[TopProduct], dependencies=[Depends(require_manager_or_admin)])
def top_products(
    limit: int = Query(default=10, le=50),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
):
    return report_service.top_products(db, limit, start_date, end_date)


@router.get("/payment", response_model=list[PaymentMethodBreakdown], dependencies=[Depends(require_manager_or_admin)])
def payment_breakdown(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
):
    return report_service.payment_method_breakdown(db, start_date, end_date)


@router.get("/dashboard", response_model=DashboardStats, dependencies=[Depends(require_manager_or_admin)])
def dashboard(db: Session = Depends(get_db)):
    """Powers the voice command 'Today's Sales' and the Dashboard page in one call."""
    return report_service.dashboard_stats(db)