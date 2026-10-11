"""
PDF invoice/receipt generation using reportlab.
Pure rendering logic — takes an Invoice ORM object (already loaded with
items/customer/etc.) and produces PDF bytes. No DB writes happen here.
"""

import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_invoice_pdf(invoice, shop_name: str = "My Store", shop_address: str = "") -> bytes:
    """
    Renders a printable A4 invoice PDF for the given Invoice ORM instance.
    Expects invoice.items to be pre-loaded (each with .product relationship).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=15 * mm, bottomMargin=15 * mm,
        leftMargin=15 * mm, rightMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleStyle", parent=styles["Title"], fontSize=18, spaceAfter=4)
    normal = styles["Normal"]

    elements = []

    # Header
    elements.append(Paragraph(shop_name, title_style))
    if shop_address:
        elements.append(Paragraph(shop_address, normal))
    elements.append(Spacer(1, 8 * mm))

    # Invoice meta
    meta_data = [
        ["Invoice #:", invoice.invoice_number, "Date:", invoice.created_at.strftime("%d-%b-%Y %H:%M")],
        ["Status:", invoice.status.value.upper(), "", ""],
    ]
    if invoice.customer:
        meta_data.append(["Customer:", invoice.customer.name, "Phone:", invoice.customer.phone or "-"])

    meta_table = Table(meta_data, colWidths=[25 * mm, 60 * mm, 20 * mm, 55 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8 * mm))

    # Line items table
    table_data = [["#", "Item", "Qty", "Unit Price", "Discount", "Tax %", "Total"]]
    for idx, item in enumerate(invoice.items, start=1):
        table_data.append([
            str(idx),
            item.product.name if item.product else f"Product #{item.product_id}",
            f"{item.quantity:g}",
            f"₹{item.unit_price:.2f}",
            f"₹{item.discount:.2f}",
            f"{item.tax_percent:g}%",
            f"₹{item.line_total:.2f}",
        ])

    items_table = Table(
        table_data,
        colWidths=[8 * mm, 55 * mm, 15 * mm, 25 * mm, 22 * mm, 15 * mm, 25 * mm],
        repeatRows=1,
    )
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d3748")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 6 * mm))

    # Totals
    totals_data = [
        ["Subtotal:", f"₹{invoice.subtotal:.2f}"],
        ["Discount:", f"-₹{invoice.discount_amount:.2f}"],
        ["Tax:", f"+₹{invoice.tax_amount:.2f}"],
        ["Total:", f"₹{invoice.total_amount:.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[140 * mm, 25 * mm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.black),
        ("TOPPADDING", (0, -1), (-1, -1), 6),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 10 * mm))

    elements.append(Paragraph("Thank you for your business!", normal))
    elements.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%d-%b-%Y %H:%M UTC')}", styles["Italic"]))

    doc.build(elements)
    return buffer.getvalue()


def save_invoice_pdf(invoice, invoice_dir: str, shop_name: str = "My Store", shop_address: str = "") -> str:
    """Generates and saves the invoice PDF to disk, returning the file path."""
    import os
    os.makedirs(invoice_dir, exist_ok=True)

    pdf_bytes = generate_invoice_pdf(invoice, shop_name, shop_address)
    file_path