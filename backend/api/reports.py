"""
Reporting endpoints powering the Dashboard/Reports pages. Read-only,
restricted to manager/admin roles since this exposes revenue data.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from backend.database.database import get_db
from backend.auth.roles import require_manager_or_admin
from backend.services import report_service
from backend.schemas.reports import VoiceAnalyticsSummary
from backend.schemas.reports import SalesSummary, TopProduct, PaymentMethodBreakdown, DashboardStats


router = APIRouter()


@router.get("/voice-analytics", response_model=VoiceAnalyticsSummary, dependencies=[Depends(require_manager_or_admin)])
def voice_analytics(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
):
    return report_service.voice_analytics_summary(db, start_date, end_date)



@router.get("/sales-summary", dependencies=[Depends(require_manager_or_admin)])
def sales_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    return report_service.sales_summary(db, start_date, end_date)

@router.get("/top-products", response_model=list[TopProduct], dependencies=[Depends(require_manager_or_admin)])
def top_products(
    limit: int = Query(default=10, le=50),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
):
    return report_service.top_products(db, limit, start_date, end_date)   


@router.get("/revenue-trend", dependencies=[Depends(require_manager_or_admin)])
def revenue_trend(days: int = Query(default=30, ge=1, le=365), db: Session = Depends(get_db)):
    return report_service.revenue_over_time(db, days)


@router.get("/payment-breakdown", dependencies=[Depends(require_manager_or_admin)])
def payment_breakdown(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    return report_service.payment_method_breakdown(db, start_date, end_date)


@router.get("/inventory-valuation", dependencies=[Depends(require_manager_or_admin)])
def inventory_valuation(db: Session = Depends(get_db)):
    return report_service.inventory_valuation(db)