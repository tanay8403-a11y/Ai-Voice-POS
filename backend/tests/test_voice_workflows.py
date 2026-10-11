from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.ai.parser import ParsedCommand, ParsedItem, parse_llm_response
from backend.ai.prompt import build_system_prompt
from backend.models.inventory import Inventory
from backend.models.invoice_session import InvoiceSessionStatus
from backend.models.product import Product
from backend.models.user import UserRole
from backend.services import billing_service, inventory_service, voice_service


def test_add_item_parser_does_not_invent_quantity_or_price():
    command = parse_llm_response(
        '{"intent":"add_item","items":[{"product_name":"Rice","quantity":null}]}'
    )

    assert command.items[0].quantity is None
    assert command.items[0].unit_price is None


def test_add_item_parser_accepts_spoken_unit_and_unit_price():
    command = parse_llm_response(
        '{"intent":"add_item","items":[{"product_name":"Rice",'
        '"quantity":2,"unit":"kg","unit_price":60}]}'
    )

    assert command.items[0].quantity == 2
    assert command.items[0].unit == "kg"
    assert command.items[0].unit_price == 60


def test_voice_prompt_uses_relevant_catalog_matches_and_short_forms():
    system_prompt = build_system_prompt(
        "en",
        "- name: Dairy Milk; brand: Cadbury; SKU: DM-1",
    )

    assert "ordinary conversational requests" in system_prompt
    assert "abbreviations, and short forms" in system_prompt
    assert "Dairy Milk" in system_prompt


@pytest.mark.parametrize("quantity", [0, -1])
def test_item_parser_rejects_non_positive_quantity(quantity):
    with pytest.raises(ValidationError):
        ParsedItem(product_name="Rice", quantity=quantity)


def test_voice_wake_phrase_starts_a_bill_naturally():
    assert voice_service.is_start_billing_command("Create a new bill")


def test_voice_session_accepts_a_product_command_without_wake_phrase():
    voice_session = SimpleNamespace(
        status=InvoiceSessionStatus.STARTED,
        language="en",
        intent=None,
        session_id="test-session",
        invoice_id=12,
    )
    expected = {"intent": "add_item", "matched_items": []}
    db = SimpleNamespace(commit=lambda: None)

    with (
        patch.object(voice_service, "_get_active_session", return_value=voice_session),
        patch.object(voice_service, "is_add_inventory_command", return_value=False),
        patch.object(voice_service.memory, "get_history", return_value=[]),
        patch.object(voice_service, "_catalog_prompt_context", return_value=""),
        patch.object(voice_service.llm, "chat_completion", return_value='{"intent":"add_item","items":[]}'),
        patch.object(voice_service, "_apply", return_value=expected) as apply_command,
        patch.object(voice_service.memory, "append_turn"),
        patch.object(voice_service, "_log_turn"),
    ):
        result = voice_service.process_command(db, "test-session", "add two rice")

    assert result == expected
    assert voice_session.status == InvoiceSessionStatus.ACTIVE
    apply_command.assert_called_once()


def test_invoice_recalculation_uses_decimal_money_rounding():
    item = SimpleNamespace(
        unit_price=Decimal("0.10"),
        quantity=Decimal("3"),
        discount=Decimal("0"),
        tax_percent=Decimal("5"),
        line_total=Decimal("0"),
    )
    invoice = SimpleNamespace(items=[item])

    billing_service._recalculate_totals(invoice)

    assert invoice.subtotal == Decimal("0.30")
    assert invoice.tax_amount == Decimal("0.02")
    assert invoice.discount_amount == Decimal("0.00")
    assert invoice.total_amount == Decimal("0.32")
    assert item.line_total == Decimal("0.32")


def test_spoken_price_mismatch_does_not_mutate_invoice():
    product = SimpleNamespace(id=3, name="Rice", price=Decimal("65.00"), unit="kg")
    voice_session = SimpleNamespace(session_id="test-session", invoice_id=12, user=SimpleNamespace(role=UserRole.CASHIER))
    command = ParsedCommand(
        intent="add_item",
        items=[ParsedItem(product_name="Rice", quantity=2, unit="kg", unit_price=60)],
    )
    invoice = SimpleNamespace(subtotal=0, discount_amount=0, tax_amount=0, total_amount=0)
    db = object()

    with (
        patch.object(voice_service, "_resolve_product_candidates", return_value=[product]),
        patch.object(billing_service, "get_invoice", return_value=invoice),
        patch.object(billing_service, "add_item") as add_item,
    ):
        result = voice_service._apply(db, voice_session, command, "en")

    add_item.assert_not_called()
    assert result["clarification_required"] == "catalog_price"
    assert result["catalog_price"] == 65.0
    assert "₹65.00" in result["spoken_response"]


def test_product_matching_ranks_best_catalog_match_first():
    best = SimpleNamespace(id=1, name="Rice")
    weaker = SimpleNamespace(id=2, name="Rice Flour")

    ranked = voice_service._rank_product_matches("ricee", [weaker, best])

    assert ranked[0][0] is best
    assert ranked[0][1] > ranked[1][1]


def test_product_matching_uses_catalog_category_and_brand():
    product = SimpleNamespace(
        id=1,
        name="Dark Chocolate",
        category="Confectionery",
        brand="Cocoa House",
        description="Premium bar",
        sku="CHOCO-1",
        barcode=None,
    )

    ranked = voice_service._rank_product_matches("Cocoa House", [product])

    assert ranked[0][0] is product
    assert ranked[0][1] >= 0.78


def test_product_matching_extracts_keywords_after_command_filler():
    product = SimpleNamespace(
        id=1,
        name="Dark Chocolate",
        category="Confectionery",
        brand="Cocoa House",
        description="Premium bar",
        sku="CHOCO-1",
        barcode=None,
    )

    ranked = voice_service._rank_product_matches(
        "please put two dark chocolate bars in my cart",
        [product],
    )

    assert ranked[0][0] is product
    assert ranked[0][1] == 1.0


def test_product_matching_recognizes_initials_as_short_form():
    product = SimpleNamespace(
        id=1,
        name="Dairy Milk",
        category="Chocolate",
        brand="Cadbury",
        description=None,
        sku="DM-1",
        barcode=None,
    )

    ranked = voice_service._rank_product_matches("DM", [product])

    assert ranked[0][0] is product
    assert ranked[0][1] == 0.76


def test_voice_add_item_accepts_a_clear_match_at_sixty_eight_percent():
    product = SimpleNamespace(
        id=3,
        name="Chocolate Bar",
        price=Decimal("25.00"),
        tax_percent=0,
        unit="pcs",
    )
    voice_session = SimpleNamespace(
        session_id="test-session",
        invoice_id=12,
        user=SimpleNamespace(role=UserRole.CASHIER),
    )
    command = ParsedCommand(
        intent="add_item",
        items=[ParsedItem(product_name="choc bar", quantity=1)],
    )
    invoice = SimpleNamespace(items=[], subtotal=0, discount_amount=0, tax_amount=0, total_amount=0)
    db = object()

    with (
        patch.object(voice_service, "_resolve_product_candidates", return_value=[product]),
        patch.object(voice_service, "_rank_product_matches", return_value=[(product, 0.68)]),
        patch.object(billing_service, "get_invoice", return_value=invoice),
        patch.object(
            inventory_service,
            "get_inventory_by_product",
            return_value=SimpleNamespace(quantity=5),
        ),
        patch.object(
            billing_service,
            "add_item",
            return_value=SimpleNamespace(
                items=[SimpleNamespace(product_id=3, line_total=Decimal("25.00"))],
                subtotal=25,
                discount_amount=0,
                tax_amount=0,
                total_amount=25,
            ),
        ) as add_item,
    ):
        result = voice_service._apply(db, voice_session, command, "en")

    add_item.assert_called_once_with(db, 12, 3, 1)
    assert result["matched_items"][0]["product_name"] == "Chocolate Bar"


def test_voice_add_item_uses_best_match_and_returns_match_for_screen():
    product = SimpleNamespace(
        id=3,
        name="Rice",
        price=Decimal("60.00"),
        tax_percent=0,
        unit="kg",
    )
    voice_session = SimpleNamespace(
        session_id="test-session",
        invoice_id=12,
        user=SimpleNamespace(role=UserRole.CASHIER),
    )
    command = ParsedCommand(
        intent="add_item",
        items=[ParsedItem(product_name="ricee", quantity=2)],
    )
    updated_invoice = SimpleNamespace(
        items=[SimpleNamespace(product_id=3, line_total=Decimal("120.00"))],
        subtotal=Decimal("120.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("120.00"),
    )
    db = object()

    with (
        patch.object(
            voice_service,
            "_resolve_product_candidates",
            return_value=[product],
        ),
        patch.object(
            billing_service, "add_item", return_value=updated_invoice
        ) as add_item,
        patch.object(billing_service, "get_invoice", return_value=updated_invoice),
        patch.object(
            inventory_service,
            "get_inventory_by_product",
            return_value=SimpleNamespace(quantity=10),
        ),
    ):
        result = voice_service._apply(
            db, voice_session, command, "en"
        )

    add_item.assert_called_once_with(db, 12, 3, 2)
    assert result["matched_items"][0]["product_name"] == "Rice"
    assert result["matched_items"][0]["recognized_name"] == "ricee"
    assert result["matched_items"][0]["match_score"] >= 0.78
    assert result["matched_items"][0]["line_total"] == 120.0


def test_voice_add_item_checks_stock_before_mutating_invoice():
    rice = SimpleNamespace(id=3, name="Rice", price=Decimal("60.00"))
    voice_session = SimpleNamespace(
        session_id="test-session",
        invoice_id=12,
        user=SimpleNamespace(role=UserRole.CASHIER),
    )
    command = ParsedCommand(
        intent="add_item",
        items=[ParsedItem(product_name="Rice", quantity=5)],
    )
    invoice = SimpleNamespace(
        items=[],
        subtotal=0,
        discount_amount=0,
        tax_amount=0,
        total_amount=0,
    )

    with (
        patch.object(
            voice_service, "_resolve_product_candidates", return_value=[rice]
        ),
        patch.object(billing_service, "get_invoice", return_value=invoice),
        patch.object(
            inventory_service,
            "get_inventory_by_product",
            return_value=SimpleNamespace(quantity=2),
        ),
        patch.object(billing_service, "add_item") as add_item,
    ):
        result = voice_service._apply(
            object(), voice_session, command, "en"
        )

    add_item.assert_not_called()
    assert result["matched_items"] == []
    assert result["out_of_stock_items"] == [
        {
            "product_id": 3,
            "product_name": "Rice",
            "requested": 5.0,
            "available": 2.0,
        }
    ]
    assert "Nothing was added" in result["spoken_response"]


def test_voice_add_item_stock_check_includes_quantity_already_in_cart():
    rice = SimpleNamespace(id=3, name="Rice", price=Decimal("60.00"))
    voice_session = SimpleNamespace(
        session_id="test-session",
        invoice_id=12,
        user=SimpleNamespace(role=UserRole.CASHIER),
    )
    command = ParsedCommand(
        intent="add_item",
        items=[ParsedItem(product_name="Rice", quantity=3)],
    )
    invoice = SimpleNamespace(
        items=[SimpleNamespace(product_id=3, quantity=4)],
        subtotal=0,
        discount_amount=0,
        tax_amount=0,
        total_amount=0,
    )

    with (
        patch.object(
            voice_service, "_resolve_product_candidates", return_value=[rice]
        ),
        patch.object(billing_service, "get_invoice", return_value=invoice),
        patch.object(
            inventory_service,
            "get_inventory_by_product",
            return_value=SimpleNamespace(quantity=6),
        ),
        patch.object(billing_service, "add_item") as add_item,
    ):
        result = voice_service._apply(
            object(), voice_session, command, "en"
        )

    add_item.assert_not_called()
    assert result["out_of_stock_items"][0]["available"] == 2.0


def test_close_product_matches_are_returned_for_screen_confirmation():
    rice = SimpleNamespace(
        id=1, name="Rice", price=Decimal("60.00"), unit="kg"
    )
    rice_flour = SimpleNamespace(
        id=2, name="Rice Flour", price=Decimal("75.00"), unit="kg"
    )
    voice_session = SimpleNamespace(
        session_id="test-session",
        invoice_id=12,
        user=SimpleNamespace(role=UserRole.CASHIER),
    )
    command = ParsedCommand(
        intent="add_item",
        items=[ParsedItem(product_name="ric", quantity=2)],
    )
    invoice = SimpleNamespace(
        subtotal=0, discount_amount=0, tax_amount=0, total_amount=0
    )

    with (
        patch.object(
            voice_service,
            "_resolve_product_candidates",
            return_value=[rice, rice_flour],
        ),
        patch.object(billing_service, "get_invoice", return_value=invoice),
        patch.object(billing_service, "add_item") as add_item,
    ):
        result = voice_service._apply(
            object(), voice_session, command, "en"
        )

    add_item.assert_not_called()
    suggestions = result["ambiguous_items"]["ric"]
    assert {candidate["name"] for candidate in suggestions} == {
        "Rice",
        "Rice Flour",
    }
    assert all(candidate["quantity"] == 2 for candidate in suggestions)


def test_bill_total_speech_uses_persisted_invoice_totals():
    invoice = SimpleNamespace(
        subtotal=Decimal("180.00"),
        discount_amount=Decimal("18.00"),
        tax_amount=Decimal("8.10"),
        total_amount=Decimal("170.10"),
    )
    voice_session = SimpleNamespace(session_id="test-session", invoice_id=12)

    with patch.object(billing_service, "get_invoice", return_value=invoice):
        result = voice_service._apply(
            object(),
            voice_session,
            ParsedCommand(intent="get_bill_total"),
            "en",
        )

    assert result["cart_total"] == Decimal("170.10")
    assert "₹170.10" in result["spoken_response"]


def test_voice_inventory_adds_multiple_products_in_one_command():
    rice = SimpleNamespace(id=1, name="Rice")
    tea = SimpleNamespace(id=2, name="Tea")
    voice_session = SimpleNamespace(
        session_id="test-session",
        invoice_id=12,
        user=SimpleNamespace(role=UserRole.MANAGER),
    )
    command = ParsedCommand(
        intent="add_inventory",
        items=[
            ParsedItem(product_name="Rice", quantity=10),
            ParsedItem(product_name="Tea", quantity=5),
        ],
    )
    invoice = SimpleNamespace(
        subtotal=0, discount_amount=0, tax_amount=0, total_amount=0
    )
    db = object()

    with (
        patch.object(
            voice_service,
            "_resolve_product_candidates",
            side_effect=[[rice], [tea]],
        ),
        patch.object(billing_service, "get_invoice", return_value=invoice),
        patch.object(
            voice_service.inventory_service,
            "add_stock_quantity",
            side_effect=[
                SimpleNamespace(quantity=30),
                SimpleNamespace(quantity=12),
            ],
        ) as add_stock,
    ):
        result = voice_service._apply(db, voice_session, command, "en")

    assert result["intent"] == "add_inventory"
    assert result["inventory_updates"] == [
        {"product_name": "Rice", "quantity": 10, "inventory_quantity": 30},
        {"product_name": "Tea", "quantity": 5, "inventory_quantity": 12},
    ]
    assert add_stock.call_count == 2
    assert "10 Rice, 5 Tea" in result["spoken_response"]


def test_voice_inventory_batch_does_not_partially_apply_when_product_is_missing():
    rice = SimpleNamespace(id=1, name="Rice")
    voice_session = SimpleNamespace(
        session_id="test-session",
        invoice_id=12,
        user=SimpleNamespace(role=UserRole.MANAGER),
    )
    command = ParsedCommand(
        intent="add_inventory",
        items=[
            ParsedItem(product_name="Rice", quantity=10),
            ParsedItem(product_name="Unknown", quantity=5),
        ],
    )
    invoice = SimpleNamespace(
        subtotal=0, discount_amount=0, tax_amount=0, total_amount=0
    )

    with (
        patch.object(
            voice_service,
            "_resolve_product_candidates",
            side_effect=[[rice], []],
        ),
        patch.object(billing_service, "get_invoice", return_value=invoice),
        patch.object(
            voice_service.inventory_service, "add_stock_quantity"
        ) as add_stock,
    ):
        result = voice_service._apply(
            object(), voice_session, command, "en"
        )

    add_stock.assert_not_called()
    assert result["unresolved_items"] == ["Unknown"]
    assert result["inventory_updates"] == []
    assert "No inventory was changed" in result["spoken_response"]


def test_inventory_list_reflects_committed_voice_restock_for_existing_and_new_stock_rows():
    engine = create_engine("sqlite://")
    Product.__table__.create(engine)
    Inventory.__table__.create(engine)

    with Session(engine) as db:
        rice = Product(
            name="Rice",
            sku="RICE-1",
            unit="kg",
            price=60,
            cost_price=40,
            tax_percent=0,
            is_active=True,
        )
        tea = Product(
            name="Tea",
            sku="TEA-1",
            unit="packet",
            price=20,
            cost_price=12,
            tax_percent=0,
            is_active=True,
        )
        db.add_all([rice, tea])
        db.flush()
        db.add(Inventory(product_id=rice.id, quantity=8, reorder_level=5))
        db.commit()

        inventory_service.add_stock_quantity(db, rice.id, 4)
        inventory_service.add_stock_quantity(db, tea.id, 3)
        db.commit()

        rows = {
            row["product_name"]: row
            for row in inventory_service.get_inventory_list(db)
        }

    assert rows["Rice"]["quantity"] == 12
    assert rows["Rice"]["reorder_level"] == 5
    assert rows["Tea"]["quantity"] == 3
    assert rows["Tea"]["unit"] == "packet"
