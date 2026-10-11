"""
Reporting logic — sales summary, top products, payment breakdown, and a
consolidated dashboard view. Matches the spec's Analytics feature:
today's sales, best-selling product, most-used payment method, top
cashier, average bill.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from backend.models.invoice import Invoice, InvoiceItem, InvoiceStatus
from backend.models.product import Product
from backend.models.payment import Payment, PaymentStatus
from backend.models.user import User
from backend.services import inventory_service


def _date_filter(query, model, start_date, end_date):
    if start_date:
        query = query.filter(model.created_at >= start_date)
    if end_date:
        query = query.filter(model.created_at <= end_date)
    return query


def sales_summary(db: Session, start_date: datetime | None = None, end_date: datetime | None = None) -> dict:
    query = db.query(Invoice).filter(Invoice.status == InvoiceStatus.PAID)
    query = _date_filter(query, Invoice, start_date, end_date)
    invoices = query.all()

    total_revenue = round(sum(inv.total_amount for inv in invoices), 2)
    invoice_count = len(invoices)

    return {
        "total_revenue": total_revenue,
        "invoice_count": invoice_count,
        "average_bill_value": round(total_revenue / invoice_count, 2) if invoice_count else 0.0,
        "total_tax_collected": round(sum(inv.tax_amount for inv in invoices), 2),
        "total_discounts_given": round(sum(inv.discount_amount for inv in invoices), 2),
        "start_date": start_date,
        "end_date": end_date,
    }


def top_products(db: Session, limit: int = 10, start_date: datetime | None = None, end_date: datetime | None = None) -> list:
    query = (
        db.query(
            Product.id, Product.name,
            func.sum(InvoiceItem.quantity).label("total_quantity"),
            func.sum(InvoiceItem.line_total).label("total_revenue"),
        )
        .join(InvoiceItem, InvoiceItem.product_id == Product.id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .filter(Invoice.status == InvoiceStatus.PAID)
    )
    query = _date_filter(query, Invoice, start_date, end_date)
    rows = (
        query.group_by(Product.id, Product.name)
        .order_by(func.sum(InvoiceItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [
        {"product_id": r.id, "name": r.name, "total_quantity_sold": float(r.total_quantity), "total_revenue": round(float(r.total_revenue), 2)}
        for r in rows
    ]


def payment_method_breakdown(db: Session, start_date: datetime | None = None, end_date: datetime | None = None) -> list:
    query = db.query(
        Payment.method, func.sum(Payment.amount).label("total"), func.count(Payment.id).label("count"),
    ).filter(Payment.status == PaymentStatus.SUCCESS)
    query = _date_filter(query, Payment, start_date, end_date)
    rows = query.group_by(Payment.method).all()
    return [{"method": r.method, "total_amount": round(float(r.total), 2), "transaction_count": r.count} for r in rows]


def dashboard_stats(db: Session) -> dict:
    """Consolidated view for the dashboard: today/week/month revenue, top product, payment method, top cashier."""
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    today_invoices = (
        db.query(Invoice)
        .filter(Invoice.status == InvoiceStatus.PAID, Invoice.created_at >= today_start)
        .all()
    )
    today_revenue = round(sum(i.total_amount for i in today_invoices), 2)
    today_count = len(today_invoices)

    week_revenue = round(
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0.0))
        .filter(Invoice.status == InvoiceStatus.PAID, Invoice.created_at >= week_start)
        .scalar(), 2
    )
    month_revenue = round(
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0.0))
        .filter(Invoice.status == InvoiceStatus.PAID, Invoice.created_at >= month_start)
        .scalar(), 2
    )

    low_stock_count = len(inventory_service.get_low_stock_products(db))

    top_product_row = (
        db.query(Product.name, func.sum(InvoiceItem.quantity).label("qty"))
        .join(InvoiceItem, InvoiceItem.product_id == Product.id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .filter(Invoice.status == InvoiceStatus.PAID, Invoice.created_at >= today_start)
        .group_by(Product.name)
        .order_by(func.sum(InvoiceItem.quantity).desc())
        .first()
    )
    top_product_today = top_product_row.name if top_product_row else None

    payment_row = (
        db.query(Payment.method, func.count(Payment.id).label("cnt"))
        .filter(Payment.status == PaymentStatus.SUCCESS, Payment.created_at >= today_start)
        .group_by(Payment.method)
        .order_by(func.count(Payment.id).desc())
        .first()
    )
    most_used_payment_method = payment_row.method if payment_row else None

    top_cashier_row = (
        db.query(User.name, func.count(Invoice.id).label("cnt"))
        .join(Invoice, Invoice.created_by == User.id)
        .filter(Invoice.status == InvoiceStatus.PAID, Invoice.created_at >= today_start)
        .group_by(User.name)
        .order_by(func.count(Invoice.id).desc())
        .first()
    )
    top_cashier = top_cashier_row.name if top_cashier_row else None

    return {
        "today_revenue": today_revenue,
        "today_invoice_count": today_count,
        "week_revenue": week_revenue,
        "month_revenue": month_revenue,
        "low_stock_count": low_stock_count,
        "top_product_today": top_product_today,
        "most_used_payment_method": most_used_payment_method,
        "top_cashier": top_cashier,
        "average_bill_value": round(today_revenue / today_count, 2) if today_count else 0.0,
    }


def revenue_over_time(db: Session, days: int = 30) -> list[dict]:
    """Return paid invoice revenue grouped by day, including zero-sale days."""
    today = datetime.utcnow().date()
    start_day = today - timedelta(days=days - 1)
    start_at = datetime.combine(start_day, datetime.min.time())
    end_at = datetime.combine(today + timedelta(days=1), datetime.min.time())

    rows = (
        db.query(
            func.date(Invoice.created_at).label("day"),
            func.coalesce(func.sum(Invoice.total_amount), 0.0).label("revenue"),
        )
        .filter(
            Invoice.status == InvoiceStatus.PAID,
            Invoice.created_at >= start_at,
            Invoice.created_at < end_at,
        )
        .group_by(func.date(Invoice.created_at))
        .all()
    )
    revenue_by_day = {
        row.day.isoformat() if hasattr(row.day, "isoformat") else str(row.day): round(float(row.revenue), 2)
        for row in rows
    }

    return [
        {
            "date": (start_day + timedelta(days=offset)).isoformat(),
            "revenue": revenue_by_day.get((start_day + timedelta(days=offset)).isoformat(), 0.0),
        }
        for offset in range(days)
    ]




from backend.models.invoice_session import (
    InvoiceSession,
    InvoiceSessionStatus,
)

def voice_analytics_summary(db: Session, start_date: datetime | None = None, end_date: datetime | None = None) -> dict:
    """
    Real analytics derived from InvoiceSession rows — session outcomes,
    average duration, and intent frequency. No synthetic data.
    """
    query = db.query(InvoiceSession)
    if start_date:
        query = query.filter(InvoiceSession.started_at >= start_date)
    if end_date:
        query = query.filter(InvoiceSession.started_at <= end_date)

    sessions = query.all()
    total = len(sessions)

    completed = sum(1 for s in sessions if s.status == InvoiceSessionStatus.COMPLETED)
    cancelled = sum(1 for s in sessions if s.status == InvoiceSessionStatus.CANCELLED)
    failed = sum(1 for s in sessions if s.status == InvoiceSessionStatus.FAILED)

    durations = [
        (s.ended_at - s.started_at).total_seconds()
        for s in sessions
        if s.ended_at and s.started_at
    ]
    avg_duration = round(sum(durations) / len(durations), 1) if durations else None

    intent_counts: dict[str, int] = {}
    for s in sessions:
        if s.intent:
            intent_counts[s.intent] = intent_counts.get(s.intent, 0) + 1

    intent_breakdown = [
        {"intent": intent, "count": count}
        for intent, count in sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "total_sessions": total,
        "completed_sessions": completed,
        "cancelled_sessions": cancelled,
        "failed_sessions": failed,
        "completion_rate": round((completed / total) * 100, 1) if total else 0.0,
        "average_session_duration_seconds": avg_duration,
        "intent_breakdown": intent_breakdown,
        "top_unresolved_note": None,  # requires storing unresolved items separately to populate meaningfully
    }    