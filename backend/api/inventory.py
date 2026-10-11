"""
Inventory endpoints: stock lookups, manual adjustments/restocking,
low-stock alerts, and barcode-based product lookup for the scanner.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional

from backend.database.database import get_db
from backend.auth.authentication import get_current_user
from backend.auth.roles import require_any_staff, require_manager_or_admin
from backend.models.user import User
from backend.models.product import Product
from backend.services import inventory_service, barcode_service, pdf_restock_service

router = APIRouter()


# ---------- Schemas ----------

class StockAdjustmentRequest(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)
    movement_type: str = Field(pattern="^(in|out|adjustment|return)$")
    reason: Optional[str] = None


class InventoryOut(BaseModel):
    product_id: int
    quantity: float
    reorder_level: float

    class Config:
        from_attributes = True


class InventoryListOut(InventoryOut):
    product_name: str
    sku: str
    category: str
    unit: str
    selling_price: float
    cost_price: float
    profit_margin: float | None


class RestockItemRequest(BaseModel):
    product_id: int | None = None
    product_name: str = Field(..., min_length=1, max_length=150)
    quantity: float = Field(gt=0)
    cost_price: float = Field(ge=0)
    selling_price: float | None = Field(default=None, ge=0)
    profit_amount: float | None = None
    category: Optional[str] = Field(default=None, max_length=100)


class ApplyPDFRestockRequest(BaseModel):
    items: List[RestockItemRequest] = Field(min_length=1, max_length=200)


# ---------- Routes ----------

@router.get("", response_model=List[InventoryListOut], dependencies=[Depends(require_any_staff)])
def list_inventory(db: Session = Depends(get_db)):
    return inventory_service.get_inventory_list(db)


@router.post("/restock/pdf/preview", dependencies=[Depends(require_manager_or_admin)])
async def preview_pdf_restock(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Upload a PDF file.")
    pdf_bytes = await file.read(pdf_restock_service.MAX_PDF_SIZE_BYTES + 1)
    try:
        parsed_rows = pdf_restock_service.extract_restock_rows(pdf_bytes)
    except pdf_restock_service.PDFRestockError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    products = db.query(Product).filter(Product.is_active == True).all()  # noqa: E712
    rows = []
    for row in parsed_rows:
        match = inventory_service.match_restock_product(row, products)
        selling_price = row.selling_price
        if selling_price is None and row.profit_amount is not None:
            selling_price = row.cost_price + row.profit_amount
        if selling_price is None and match:
            selling_price = float(match.price)
        profit_amount = row.profit_amount
        if profit_amount is None and selling_price is not None:
            profit_amount = selling_price - row.cost_price
        rows.append({
            "product_name": row.product_name,
            "quantity": row.quantity,
            "cost_price": row.cost_price,
            "selling_price": selling_price,
            "profit_amount": profit_amount,
            "profit_margin": (
                inventory_service.calculate_profit_margin(row.cost_price, selling_price)
                if selling_price is not None
                else None
            ),
            "category": row.category,
            "matched_product_id": match.id if match else None,
            "matched_selling_price": float(match.price) if match else None,
        })
    return {"items": rows}


@router.post("/restock/pdf/apply", dependencies=[Depends(require_manager_or_admin)])
def apply_pdf_restock(
    payload: ApplyPDFRestockRequest,
    db: Session = Depends(get_db),
):
    try:
        results = inventory_service.apply_restock_items(
            db, [item.model_dump() for item in payload.items]
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"items": results}


@router.get("/alerts/low-stock", dependencies=[Depends(require_any_staff)])
def low_stock_alerts(db: Session = Depends(get_db)):
    return inventory_service.get_low_stock_products(db)


@router.get("/{product_id}", response_model=InventoryOut, dependencies=[Depends(require_any_staff)])
def get_inventory(product_id: int, db: Session = Depends(get_db)):
    return inventory_service.get_inventory_by_product(db, product_id)


@router.post("/adjust", dependencies=[Depends(require_manager_or_admin)])
def adjust_stock(payload: StockAdjustmentRequest, db: Session = Depends(get_db)):
    if payload.movement_type in ("in", "return"):
        inventory = inventory_service.add_stock_quantity(
            db, payload.product_id, payload.quantity
        )
        db.commit()
        db.refresh(inventory)
    elif payload.movement_type == "out":
        inventory = inventory_service.deduct_stock_for_sale(
            db, payload.product_id, payload.quantity
        )
    else:
        inventory = inventory_service.set_stock_quantity(
            db, payload.product_id, payload.quantity
        )
    return {"status": "ok", "new_quantity": inventory.quantity}


@router.get("/lookup/barcode/{barcode_value}", dependencies=[Depends(require_any_staff)])
def lookup_by_barcode(barcode_value: str, db: Session = Depends(get_db)):
    product = barcode_service.lookup_product_by_barcode(db, barcode_value)
    return {
        "product_id": product.id,
        "name": product.name,
        "sku": product.sku,
        "price": product.price,
        "tax_percent": product.tax_percent,
    }



@router.get("/{product_id}/barcode-image", dependencies=[Depends(require_any_staff)])
def get_barcode_image(product_id: int, db: Session = Depends(get_db)):
    png_bytes = barcode_service.generate_barcode_for_product(db, product_id)
    return Response(content=png_bytes, media_type="image/png")


@router.get("/{product_id}/qr-image", dependencies=[Depends(require_any_staff)])
def get_qr_image(product_id: int, db: Session = Depends(get_db)):
    png_bytes = barcode_service.generate_qr_for_product(db, product_id)
    return Response(content=png_bytes, media_type="image/png")