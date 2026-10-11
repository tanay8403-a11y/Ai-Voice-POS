"""
Barcode/QR business logic: generates barcode images for products and
decodes scanned barcode images back into a product lookup.
Wraps utils/barcode.py + utils/qr.py (low-level generation) with
DB lookups so the API layer stays thin.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
import io

from backend.models.product import Product
from backend.utils import barcode as barcode_util
from backend.utils import qr as qr_util


def generate_barcode_for_product(db: Session, product_id: int) -> bytes:
    """Returns PNG bytes of a Code128 barcode encoding the product's SKU."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    code_value = product.barcode or product.sku
    return barcode_util.generate_barcode_image(code_value)


def generate_qr_for_product(db: Session, product_id: int) -> bytes:
    """Returns PNG bytes of a QR code encoding product id + SKU (for quick lookup scanning)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    payload = f"PRODUCT|{product.id}|{product.sku}"
    return qr_util.generate_qr_image(payload)


def lookup_product_by_barcode(db: Session, barcode_value: str) -> Product:
    """Used by the frontend scanner (BarcodeScanner.jsx) after decoding a scanned code."""
    product = (
        db.query(Product)
        .filter((Product.barcode == barcode_value) | (Product.sku == barcode_value))
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No product found for barcode '{barcode_value}'",
        )
    return product


def assign_barcode_to_product(db: Session, product_id: int, barcode_value: str) -> Product:
    """Manually assign/override a barcode value on a product (e.g. relabeling)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(Product).filter(Product.barcode == barcode_value, Product.id != product_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Barcode '{barcode_value}' is already assigned to product '{existing.name}'",
        )

    product.barcode = barcode_value
    db.commit()
    db.refresh(product)
    return product