"""
Minimal inventory logic: read stock, deduct on sale, restore on refund,
direct quantity correction, and low-stock lookup. No movement history.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List

from backend.models.inventory import Inventory
from backend.models.product import Product
from backend.utils.helpers import generate_sku


def calculate_profit_margin(cost_price: float, selling_price: float) -> float | None:
    if selling_price <= 0:
        return None
    return round((selling_price - cost_price) / selling_price * 100, 2)


def match_restock_product(row, products: list[Product]) -> Product | None:
    """Match a PDF row to the catalog, using its category to disambiguate names."""
    normalize = lambda value: " ".join((value or "").casefold().split())
    sku_match = next(
        (product for product in products if normalize(product.sku) == normalize(row.product_name)),
        None,
    )
    if sku_match:
        return sku_match

    name_matches = [
        product for product in products
        if normalize(product.name) == normalize(row.product_name)
    ]
    if row.category:
        category_matches = [
            product for product in name_matches
            if normalize(product.category) == normalize(row.category)
        ]
        if len(category_matches) == 1:
            return category_matches[0]
    return name_matches[0] if len(name_matches) == 1 else None


def get_inventory_by_product(db: Session, product_id: int) -> Inventory:
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail=f"No inventory record for product_id={product_id}")
    return inventory


def get_inventory_list(db: Session) -> List[dict]:
    rows = (
        db.query(Product, Inventory)
        .outerjoin(Inventory, Inventory.product_id == Product.id)
        .filter(Product.is_active == True)  # noqa: E712
        .order_by(Product.name)
        .all()
    )
    return [
        {
            "product_id": product.id,
            "product_name": product.name,
            "sku": product.sku,
            "category": product.category or "Uncategorized",
            "unit": product.unit or "pcs",
            "selling_price": float(product.price),
            "cost_price": float(product.cost_price),
            "profit_margin": calculate_profit_margin(
                float(product.cost_price), float(product.price)
            ),
            "quantity": inventory.quantity if inventory else 0.0,
            "reorder_level": inventory.reorder_level if inventory else 10.0,
        }
        for product, inventory in rows
    ]


def apply_restock_items(db: Session, items: list[dict]) -> list[dict]:
    """Apply reviewed PDF rows, creating catalog products when no match exists."""
    product_ids = [item["product_id"] for item in items if item.get("product_id") is not None]
    if len(product_ids) != len(set(product_ids)):
        raise ValueError("Each product can only appear once in a restock.")

    new_product_names = [
        " ".join(item["product_name"].casefold().split())
        for item in items
        if item.get("product_id") is None
    ]
    if len(new_product_names) != len(set(new_product_names)):
        raise ValueError("Duplicate unmatched product names found. Combine duplicate PDF rows before applying.")

    products = db.query(Product).filter(
        Product.id.in_(product_ids), Product.is_active == True  # noqa: E712
    ).all() if product_ids else []
    products_by_id = {product.id: product for product in products}
    missing_ids = set(product_ids) - products_by_id.keys()
    if missing_ids:
        raise ValueError(f"Unknown or inactive product IDs: {sorted(missing_ids)}")

    result = []
    for item in items:
        product_id = item.get("product_id")
        category = (item.get("category") or "").strip() or None
        selling_price = item.get("selling_price")
        if selling_price is None and item.get("profit_amount") is not None:
            selling_price = float(item["cost_price"]) + float(item["profit_amount"])
        if product_id is None:
            product_name = item["product_name"].strip()
            product = Product(
                name=product_name,
                sku=generate_sku(product_name, category),
                category=category,
                unit="pcs",
                price=selling_price if selling_price is not None else 0,
                cost_price=item["cost_price"],
                tax_percent=0,
                is_active=True,
            )
            db.add(product)
            db.flush()
            product_id = product.id
            created = True
        else:
            product = products_by_id[product_id]
            created = False

        product.cost_price = item["cost_price"]
        if selling_price is not None:
            product.price = selling_price
        if category and category.strip():
            product.category = category.strip()
        inventory = add_stock_quantity(db, product.id, item["quantity"])
        result.append({
            "product_id": product.id,
            "product_name": product.name,
            "quantity_added": item["quantity"],
            "quantity": inventory.quantity,
            "cost_price": float(product.cost_price),
            "selling_price": float(product.price),
            "profit_margin": calculate_profit_margin(
                float(product.cost_price), float(product.price)
            ),
            "category": product.category,
            "sku": product.sku,
            "created": created,
        })

    db.commit()
    return result


def create_inventory_for_product(
    db: Session, product_id: int, initial_quantity: float = 0.0, reorder_level: float = 10.0
) -> Inventory:
    existing = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if existing:
        return existing

    inventory = Inventory(product_id=product_id, quantity=initial_quantity, reorder_level=reorder_level)
    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    return inventory


def check_stock_availability(db: Session, product_id: int, quantity_needed: float) -> bool:
    inventory = get_inventory_by_product(db, product_id)
    return inventory.quantity >= quantity_needed


def deduct_stock_for_sale(db: Session, product_id: int, quantity: float) -> Inventory:
    inventory = get_inventory_by_product(db, product_id)
    if inventory.quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock: available={inventory.quantity}, requested={quantity}",
        )
    inventory.quantity -= quantity
    db.commit()
    db.refresh(inventory)
    return inventory


def restore_stock_for_refund(db: Session, product_id: int, quantity: float) -> Inventory:
    inventory = get_inventory_by_product(db, product_id)
    inventory.quantity += quantity
    db.commit()
    db.refresh(inventory)
    return inventory


def add_stock_quantity(db: Session, product_id: int, quantity: float) -> Inventory:
    """Add delivered stock to a product without replacing its current quantity."""
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        inventory = Inventory(product_id=product_id, quantity=0.0, reorder_level=10.0)
        db.add(inventory)

    inventory.quantity += quantity
    db.flush()
    return inventory


def set_stock_quantity(db: Session, product_id: int, quantity: float, reorder_level: float | None = None) -> Inventory:
    """Direct correction — e.g. after a manual physical stock count."""
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        inventory = Inventory(
            product_id=product_id,
            quantity=quantity,
            reorder_level=reorder_level if reorder_level is not None else 10.0,
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        return inventory

    inventory.quantity = quantity
    if reorder_level is not None:
        inventory.reorder_level = reorder_level
    db.commit()
    db.refresh(inventory)
    return inventory


def get_low_stock_products(db: Session) -> List[dict]:
    rows = (
        db.query(Inventory, Product)
        .join(Product, Product.id == Inventory.product_id)
        .filter(Inventory.quantity <= Inventory.reorder_level)
        .filter(Product.is_active == True)  # noqa: E712
        .all()
    )
    return [
        {
            "product_id": product.id,
            "product_name": product.name,
            "quantity": inventory.quantity,
            "reorder_level": inventory.reorder_level,
        }
        for inventory, product in rows
    ]