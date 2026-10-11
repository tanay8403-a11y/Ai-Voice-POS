"""
Product catalog CRUD endpoints — powers Products.jsx and is a dependency
for barcode/inventory lookups. Not in the original tree but required
since Product is a core model with no dedicated router.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from typing import Annotated

from backend.database.database import get_db
from backend.auth.roles import require_any_staff, require_manager_or_admin
from backend.models.product import Product
from backend.services import inventory_service
from backend.utils.helpers import generate_sku

router = APIRouter()


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    sku: Optional[str] = None  # auto-generated if not provided
    barcode: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    unit: str = "pcs"
    price: float = Field(..., ge=0)
    cost_price: float = Field(default=0.0, ge=0)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    initial_stock: float = Field(default=0.0, ge=0)
    reorder_level: float = Field(default=10.0, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    cost_price: Optional[float] = Field(default=None, ge=0)
    tax_percent: Optional[float] = Field(default=None, ge=0, le=100)
    category: Optional[str] = None
    brand: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    barcode: Optional[str]
    category: Optional[str]
    price: float
    cost_price: float
    tax_percent: float
    is_active: bool

    class Config:
        from_attributes = True
        
class BarcodeLookupRequest(BaseModel):
    barcode: str = Field(..., min_length=1)


class ProductBarcodeOut(ProductOut):
    pass

@router.post("", response_model=ProductOut, status_code=201, dependencies=[Depends(require_manager_or_admin)])
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    sku = payload.sku or generate_sku(payload.name, payload.category)

    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU '{sku}' already exists")

    if payload.barcode:
        barcode_clash = db.query(Product).filter(Product.barcode == payload.barcode).first()
        if barcode_clash:
            raise HTTPException(status_code=400, detail=f"Barcode '{payload.barcode}' already assigned")

    product = Product(
        name=payload.name, sku=sku, barcode=payload.barcode,
        category=payload.category, brand=payload.brand, unit=payload.unit,
        price=payload.price, cost_price=payload.cost_price, tax_percent=payload.tax_percent,
    )
    db.add(product)
    db.flush()

    inventory_service.create_inventory_for_product(
        db, product.id, initial_quantity=payload.initial_stock, reorder_level=payload.reorder_level
    )

    db.commit()
    db.refresh(product)
    return product


@router.get("", response_model=List[ProductOut], dependencies=[Depends(require_any_staff)])
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    active_only: bool = True,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.is_active == True)  # noqa: E712
    if category:
        query = query.filter(Product.category == category)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    return query.order_by(Product.name).offset(offset).limit(limit).all()


@router.get("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_any_staff)])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_manager_or_admin)])
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.post(
    "/barcode",
    response_model=ProductBarcodeOut,
    dependencies=[Depends(require_any_staff)],
)
def lookup_product_by_barcode(
    payload: BarcodeLookupRequest,
    db: Session = Depends(get_db),
):
    """
    Looks up a product by barcode or SKU.
    Used by the React barcode scanner.
    """

    barcode = payload.barcode.strip()

    product = (
        db.query(Product)
        .filter(
            (Product.barcode == barcode) |
            (Product.sku == barcode)
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product

@router.delete("/{product_id}", status_code=204, dependencies=[Depends(require_manager_or_admin)])
def deactivate_product(product_id: int, db: Session = Depends(get_db)):
    """Soft delete — deactivates rather than removes, to preserve invoice history integrity."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()