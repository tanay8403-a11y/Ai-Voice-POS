import pymupdf
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.database.database import Base
from backend.models.inventory import Inventory
from backend.models.product import Product
from backend.services.inventory_service import (
    apply_restock_items,
    get_inventory_list,
    match_restock_product,
)
from backend.services.pdf_restock_service import (
    parse_restock_rows,
    parse_restock_words,
    extract_restock_rows,
)


def test_parse_restock_rows_with_line_totals_and_row_number():
    rows = parse_restock_rows(
        "Description Qty Rate Amount\n"
        "Rice 10 40.00 400.00\n"
        "1 Tea 5 12.50\n"
        "10 Sugar 15.00\n"
        "Subtotal 15 412.50 412.50\n"
    )

    assert [(row.product_name, row.quantity, row.cost_price) for row in rows] == [
        ("Rice", 10, 40),
        ("Tea", 5, 12.5),
        ("Sugar", 10, 15),
    ]


def test_parse_restock_text_rows_calculates_selling_price_from_profit():
    rows = parse_restock_rows(
        "Description Qty Purchase Profit\n"
        "Green Tea 5 12.50 7.50\n"
    )

    assert len(rows) == 1
    assert rows[0].cost_price == 12.5
    assert rows[0].profit_amount == 7.5
    assert rows[0].selling_price == 20


def test_parse_restock_columns_by_position_ignores_hsn_and_line_amount():
    words = [
        (40, 20, 100, 32, "Product"),
        (240, 20, 270, 32, "HSN"),
        (330, 20, 355, 32, "Qty"),
        (390, 20, 420, 32, "Rate"),
        (470, 20, 520, 32, "Amount"),
        (40, 45, 80, 57, "Brown"),
        (85, 45, 120, 57, "Rice"),
        (238, 45, 275, 57, "100630"),
        (335, 45, 350, 57, "10"),
        (395, 45, 415, 57, "40.00"),
        (475, 45, 510, 57, "400.00"),
        (40, 65, 82, 77, "Green"),
        (87, 65, 112, 77, "Tea"),
        (238, 65, 275, 77, "090210"),
        (335, 65, 350, 77, "5"),
        (395, 65, 415, 77, "12.50"),
        (475, 65, 510, 77, "62.50"),
        (40, 85, 95, 97, "Subtotal"),
        (335, 85, 350, 97, "15"),
        (395, 85, 415, 97, "52.50"),
        (475, 85, 510, 97, "462.50"),
    ]
    rows = parse_restock_words(words)

    assert [(row.product_name, row.quantity, row.cost_price) for row in rows] == [
        ("Brown Rice", 10, 40),
        ("Green Tea", 5, 12.5),
    ]


def test_parse_restock_columns_uses_line_amount_when_unit_rate_is_absent():
    words = [
        (40, 20, 100, 32, "Description"),
        (300, 20, 330, 32, "Quantity"),
        (450, 20, 490, 32, "Amount"),
        (40, 45, 70, 57, "Sugar"),
        (305, 45, 320, 57, "4"),
        (455, 45, 490, 57, "60.00"),
    ]

    rows = parse_restock_words(words)

    assert [(row.product_name, row.quantity, row.cost_price) for row in rows] == [
        ("Sugar", 4, 15),
    ]


def test_parse_restock_extracts_category_column_from_pdf():
    words = [
        (35, 20, 100, 32, "Description"),
        (180, 20, 230, 32, "Category"),
        (310, 20, 335, 32, "Qty"),
        (390, 20, 420, 32, "Rate"),
        (35, 45, 70, 57, "Green"),
        (75, 45, 95, 57, "Tea"),
        (180, 45, 220, 57, "Beverage"),
        (315, 45, 325, 57, "5"),
        (395, 45, 415, 57, "12.50"),
    ]

    rows = parse_restock_words(words)

    assert [(row.product_name, row.quantity, row.cost_price, row.category) for row in rows] == [
        ("Green Tea", 5, 12.5, "Beverage"),
    ]


def test_parse_restock_reads_purchase_and_selling_price_columns_separately():
    words = [
        (35, 20, 100, 32, "Description"),
        (160, 20, 210, 32, "Category"),
        (275, 20, 305, 32, "Qty"),
        (335, 20, 385, 32, "Purchase"),
        (390, 20, 425, 32, "Price"),
        (445, 20, 480, 32, "Selling"),
        (485, 20, 520, 32, "Price"),
        (555, 20, 600, 32, "Amount"),
        (35, 45, 100, 57, "Green Tea"),
        (160, 45, 215, 57, "Beverage"),
        (280, 45, 295, 57, "5"),
        (390, 45, 410, 57, "12.50"),
        (485, 45, 510, 57, "20.00"),
        (560, 45, 590, 57, "62.50"),
    ]

    rows = parse_restock_words(words)

    assert [
        (row.product_name, row.quantity, row.cost_price, row.selling_price)
        for row in rows
    ] == [("Green Tea", 5, 12.5, 20)]


def test_parse_restock_uses_profit_amount_to_calculate_selling_price():
    words = [
        (35, 20, 100, 32, "Description"),
        (180, 20, 230, 32, "Category"),
        (300, 20, 330, 32, "Qty"),
        (370, 20, 420, 32, "Purchase"),
        (430, 20, 475, 32, "Profit"),
        (480, 20, 525, 32, "Amount"),
        (35, 45, 100, 57, "Green Tea"),
        (180, 45, 225, 57, "Beverage"),
        (305, 45, 320, 57, "5"),
        (380, 45, 410, 57, "12.50"),
        (440, 45, 460, 57, "7.50"),
    ]

    rows = parse_restock_words(words)

    assert [
        (
            row.product_name,
            row.quantity,
            row.cost_price,
            row.profit_amount,
            row.selling_price,
        )
        for row in rows
    ] == [("Green Tea", 5, 12.5, 7.5, 20)]


def test_extract_restock_rows_reads_actual_pdf_column_positions():
    document = pymupdf.open()
    page = document.new_page()
    columns = [
        (40, "Description"),
        (180, "Category"),
        (290, "Qty"),
        (380, "Rate"),
        (470, "Amount"),
    ]
    for x, text in columns:
        page.insert_text((x, 40), text)
    for y, values in [
        (65, [(40, "Brown Rice"), (180, "Grains"), (300, "10"), (390, "40.00"), (480, "400.00")]),
        (85, [(40, "Green Tea"), (180, "Beverages"), (300, "5"), (390, "12.50"), (480, "62.50")]),
    ]:
        for x, text in values:
            page.insert_text((x, y), text)
    pdf_bytes = document.tobytes()
    document.close()

    rows = extract_restock_rows(pdf_bytes)

    assert [(row.product_name, row.quantity, row.cost_price, row.category) for row in rows] == [
        ("Brown Rice", 10, 40, "Grains"),
        ("Green Tea", 5, 12.5, "Beverages"),
    ]


def test_restock_matching_uses_same_category_to_resolve_duplicate_product_names():
    from types import SimpleNamespace

    catalog = [
        SimpleNamespace(id=1, name="Tea", sku="TEA-DRY", category="Dry Goods"),
        SimpleNamespace(id=2, name="Tea", sku="TEA-BEV", category="Beverages"),
    ]
    row = SimpleNamespace(product_name="Tea", category="Beverages")

    assert match_restock_product(row, catalog) is catalog[1]


def test_apply_restock_updates_stock_and_purchase_cost_price():
    engine = create_engine("sqlite://")
    Product.__table__.create(engine)
    Inventory.__table__.create(engine)

    with Session(engine) as db:
        product = Product(
            name="Rice",
            sku="RICE-1",
            category="Staples",
            price=60,
            cost_price=40,
            is_active=True,
        )
        db.add(product)
        db.flush()
        db.add(Inventory(product_id=product.id, quantity=8, reorder_level=5))
        db.commit()

        result = apply_restock_items(
            db,
            [{
                "product_id": product.id,
                "quantity": 4,
                "cost_price": 45,
                "selling_price": 72,
                "category": "Imported Staples",
            }],
        )
        row = get_inventory_list(db)[0]

    assert result[0]["quantity"] == 12
    assert row["quantity"] == 12
    assert row["selling_price"] == 72
    assert row["cost_price"] == 45
    assert row["profit_margin"] == 37.5
    assert row["category"] == "Imported Staples"


def test_apply_restock_creates_catalog_product_for_unmatched_pdf_row():
    engine = create_engine("sqlite://")
    Product.__table__.create(engine)
    Inventory.__table__.create(engine)

    with Session(engine) as db:
        result = apply_restock_items(
            db,
            [{
                "product_id": None,
                "product_name": "Organic Lentils",
                "quantity": 6,
                "cost_price": 82.5,
                "category": "Pulses",
            }],
        )
        product = db.query(Product).filter(Product.name == "Organic Lentils").one()
        inventory = db.query(Inventory).filter(Inventory.product_id == product.id).one()

    assert result[0]["created"] is True
    assert result[0]["product_id"] == product.id
    assert product.sku.startswith("PUL-ORGANIC-LENTILS-")
    assert product.category == "Pulses"
    assert product.cost_price == 82.5
    assert product.price == 0
    assert inventory.quantity == 6


def test_apply_restock_sets_selling_amount_for_new_product_from_pdf():
    engine = create_engine("sqlite://")
    Product.__table__.create(engine)
    Inventory.__table__.create(engine)

    with Session(engine) as db:
        apply_restock_items(
            db,
            [{
                "product_id": None,
                "product_name": "Green Tea",
                "quantity": 5,
                "cost_price": 12.5,
                "selling_price": 20,
                "category": "Beverage",
            }],
        )
        row = get_inventory_list(db)[0]

    assert row["cost_price"] == 12.5
    assert row["selling_price"] == 20


def test_apply_restock_calculates_selling_price_from_profit_amount():
    engine = create_engine("sqlite://")
    Product.__table__.create(engine)
    Inventory.__table__.create(engine)

    with Session(engine) as db:
        apply_restock_items(
            db,
            [{
                "product_id": None,
                "product_name": "Green Tea",
                "quantity": 5,
                "cost_price": 12.5,
                "profit_amount": 7.5,
                "category": "Beverage",
            }],
        )
        row = get_inventory_list(db)[0]

    assert row["cost_price"] == 12.5
    assert row["selling_price"] == 20
    assert row["profit_margin"] == 37.5


def test_apply_restock_rejects_duplicate_unmatched_names_before_creating_products():
    engine = create_engine("sqlite://")
    Product.__table__.create(engine)
    Inventory.__table__.create(engine)

    with Session(engine) as db:
        try:
            apply_restock_items(
                db,
                [
                    {
                        "product_id": None,
                        "product_name": "Organic Lentils",
                        "quantity": 6,
                        "cost_price": 82.5,
                        "category": "Pulses",
                    },
                    {
                        "product_id": None,
                        "product_name": " organic   lentils ",
                        "quantity": 2,
                        "cost_price": 82.5,
                        "category": "Pulses",
                    },
                ],
            )
        except ValueError as exc:
            assert "Duplicate unmatched product names" in str(exc)
        else:
            raise AssertionError("Expected duplicate unmatched products to be rejected")

        assert db.query(Product).count() == 0
        assert db.query(Inventory).count() == 0


def test_apply_restock_rejects_duplicate_products_without_mutating_stock():
    engine = create_engine("sqlite://")
    Product.__table__.create(engine)
    Inventory.__table__.create(engine)

    with Session(engine) as db:
        product = Product(name="Rice", sku="RICE-1", price=60, cost_price=40)
        db.add(product)
        db.flush()
        db.add(Inventory(product_id=product.id, quantity=8, reorder_level=5))
        db.commit()

        try:
            apply_restock_items(
                db,
                [
                    {"product_id": product.id, "quantity": 4, "cost_price": 45},
                    {"product_id": product.id, "quantity": 2, "cost_price": 45},
                ],
            )
        except ValueError as exc:
            assert "only appear once" in str(exc)
        else:
            raise AssertionError("Expected duplicate products to be rejected")

        assert get_inventory_list(db)[0]["quantity"] == 8
        assert get_inventory_list(db)[0]["cost_price"] == 40
