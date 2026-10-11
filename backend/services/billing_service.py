"""
Core billing logic — the heart of the project. Invoices are built
incrementally: start a draft -> add/remove/update items one at a time ->
apply discount -> complete. This matches how both manual cashiers and
the voice AI naturally build a cart (one utterance at a time), rather
than requiring the whole cart upfront.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import uuid

from backend.models.invoice import Invoice, InvoiceItem, InvoiceStatus
from backend.models.product import Product
from backend.models.customer import Customer
from backend.services import inventory_service

_CENT = Decimal("0.01")


def _decimal(value) -> Decimal:
    return Decimal(str(value if value is not None else 0))


def _money(value: Decimal) -> Decimal:
    return value.quantize(_CENT, rounding=ROUND_HALF_UP)


def generate_invoice_number() -> str:
    date_part = datetime.utcnow().strftime("%Y%m%d")
    unique_part = uuid.uuid4().hex[:6].upper()
    return f"INV-{date_part}-{unique_part}"


def _recalculate_totals(invoice: Invoice) -> None:
    """Recomputes subtotal/tax/discount/total from current line items. Called after every mutation."""
    subtotal = Decimal("0")
    tax_total = Decimal("0")
    discount_total = Decimal("0")

    for item in invoice.items:
        gross = _decimal(item.unit_price) * _decimal(item.quantity)
        discount = _decimal(item.discount)
        after_discount = gross - discount
        tax = _money(after_discount * (_decimal(item.tax_percent) / Decimal("100")))

        subtotal += gross
        discount_total += discount
        tax_total += tax
        item.line_total = _money(after_discount + tax)

    invoice.subtotal = _money(subtotal)
    invoice.discount_amount = _money(discount_total)
    invoice.tax_amount = _money(tax_total)
    invoice.total_amount = _money(subtotal - discount_total + tax_total)


def start_billing(db: Session, created_by: int, customer_id: int | None = None) -> Invoice:
    """Creates an empty DRAFT invoice — the starting point for a new sale."""
    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

    invoice = Invoice(
        invoice_number=generate_invoice_number(),
        customer_id=customer_id,
        created_by=created_by,
        status=InvoiceStatus.DRAFT,
        subtotal=0.0, tax_amount=0.0, discount_amount=0.0, total_amount=0.0,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def _get_draft_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Invoice is {invoice.status}, not editable")
    return invoice


def add_item(db: Session, invoice_id: int, product_id: int, quantity: float) -> Invoice:
    invoice = _get_draft_invoice(db, invoice_id)

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found or inactive")

    if not inventory_service.check_stock_availability(db, product_id, quantity):
        raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'")

    # If the product is already in the cart, increase quantity instead of duplicating the row
    existing_item = next((i for i in invoice.items if i.product_id == product_id), None)
    if existing_item:
        existing_item.quantity += quantity
    else:
        invoice.items.append(InvoiceItem(
            product_id=product.id,
            quantity=quantity,
            unit_price=product.price,
            tax_percent=product.tax_percent,
            discount=0.0,
            line_total=0.0,  # recalculated below
        ))

    _recalculate_totals(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def remove_item(db: Session, invoice_id: int, product_id: int) -> Invoice:
    invoice = _get_draft_invoice(db, invoice_id)

    item = next((i for i in invoice.items if i.product_id == product_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    invoice.items.remove(item)
    db.delete(item)

    _recalculate_totals(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def remove_last_item(db: Session, invoice_id: int) -> Invoice:
    """Voice command: 'Cancel last item' — removes the most recently added line."""
    invoice = _get_draft_invoice(db, invoice_id)
    if not invoice.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    last_item = max(invoice.items, key=lambda i: i.id)
    invoice.items.remove(last_item)
    db.delete(last_item)

    _recalculate_totals(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def update_quantity(db: Session, invoice_id: int, product_id: int, quantity: float) -> Invoice:
    invoice = _get_draft_invoice(db, invoice_id)

    item = next((i for i in invoice.items if i.product_id == product_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    if not inventory_service.check_stock_availability(db, product_id, quantity):
        raise HTTPException(status_code=400, detail="Insufficient stock for the requested quantity")

    item.quantity = quantity
    _recalculate_totals(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def apply_discount(
    db: Session, invoice_id: int, discount_type: str, value: float, target_product_id: int | None = None
) -> Invoice:
    invoice = _get_draft_invoice(db, invoice_id)

    if target_product_id:
        # Discount on a single line item
        item = next((i for i in invoice.items if i.product_id == target_product_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Item not in cart")

        gross = _decimal(item.unit_price) * _decimal(item.quantity)
        discount_value = _decimal(value)
        item.discount = (
            _money(gross * (discount_value / Decimal("100")))
            if discount_type == "percent"
            else min(discount_value, gross)
        )
    else:
        # Discount applied proportionally across the whole cart
        if not invoice.items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        cart_gross = sum(
            (_decimal(item.unit_price) * _decimal(item.quantity) for item in invoice.items),
            Decimal("0"),
        )
        if cart_gross == 0:
            raise HTTPException(status_code=400, detail="Cart total is zero")

        discount_value = _decimal(value)
        total_discount = (
            cart_gross * (discount_value / Decimal("100"))
            if discount_type == "percent"
            else min(discount_value, cart_gross)
        )
        for item in invoice.items:
            item_gross = _decimal(item.unit_price) * _decimal(item.quantity)
            item.discount = _money(total_discount * (item_gross / cart_gross))

    _recalculate_totals(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def complete_billing(db: Session, invoice_id: int, payment_method: str | None = None) -> Invoice:
    """
    Finalizes the sale: deducts stock, marks PAID (or leaves DRAFT->PAID
    pending if no payment_method given, meaning payment happens separately
    via the Payment API/QR flow).
    """
    invoice = _get_draft_invoice(db, invoice_id)

    if not invoice.items:
        raise HTTPException(status_code=400, detail="Cannot complete an empty cart")

    for item in invoice.items:
        inventory_service.deduct_stock_for_sale(db, item.product_id, item.quantity)

    invoice.status = InvoiceStatus.PAID if payment_method else InvoiceStatus.DRAFT
    # Note: if payment_method is None, the caller is expected to complete
    # payment via the Payment API next (e.g. generate QR, wait for verify).

    if invoice.customer_id:
        customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
        if customer and invoice.status == InvoiceStatus.PAID:
            customer.total_spent += invoice.total_amount
            customer.loyalty_points += round(invoice.total_amount / 100.0, 2)

    db.commit()
    db.refresh(invoice)
    return invoice


def cancel_sale(db: Session, invoice_id: int) -> Invoice:
    """Voice command: 'Cancel sale' — discards the entire draft, no stock was ever deducted."""
    invoice = _get_draft_invoice(db, invoice_id)
    invoice.status = InvoiceStatus.CANCELLED
    db.commit()
    db.refresh(invoice)
    return invoice


def get_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice