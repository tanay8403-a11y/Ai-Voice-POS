"""
Orchestrates the full voice-command pipeline:
  audio -> transcribe -> LLM intent parse -> validate -> resolve products
  -> apply to cart state -> generate spoken response.
This is the single entry point the /voice API route calls into — it owns
no HTTP concerns, only business/AI orchestration, so it's independently testable.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from difflib import get_close_matches

from backend.ai import llm, prompt, parser, memory
from backend.models.product import Product
from backend.services import billing_service

logger = logging.getLogger("ai.command_processor")


class CommandProcessingError(Exception):
    pass


def _resolve_product(db: Session, spoken_name: str) -> Optional[Product]:
    """
    Fuzzy-matches a spoken product name against the catalog. Voice transcription
    is imperfect (accents, background noise), so exact matching alone would
    fail too often in a live retail environment.
    """
    spoken_name = spoken_name.strip().lower()

    # 1. Exact name or SKU match
    exact = (
        db.query(Product)
        .filter(Product.is_active == True)  # noqa: E712
        .filter((Product.name.ilike(spoken_name)) | (Product.sku.ilike(spoken_name)))
        .first()
    )
    if exact:
        return exact

    # 2. Partial substring match
    partial = (
        db.query(Product)
        .filter(Product.is_active == True)  # noqa: E712
        .filter(Product.name.ilike(f"%{spoken_name}%"))
        .first()
    )
    if partial:
        return partial

    # 3. Fuzzy match against all active product names (handles STT typos)
    all_products = db.query(Product).filter(Product.is_active == True).all()  # noqa: E712
    name_map = {p.name.lower(): p for p in all_products}
    close = get_close_matches(spoken_name, name_map.keys(), n=1, cutoff=0.72)
    if close:
        return name_map[close[0]]

    return None


def process_voice_command(
    db: Session,
    session_id: str,
    audio_file_path: str,
    language: str = "en",
) -> dict:
    """
    Main pipeline entry point. Returns a dict with:
      { transcript, intent, cart, spoken_response, requires_confirmation, unresolved_items }
    """
    # 1. Speech to text
    transcript = llm.transcribe_audio_openai(audio_file_path, language=language)
    if not transcript.strip():
        raise CommandProcessingError("Empty transcript — please try speaking again.")

    logger.info(f"[{session_id}] Transcript: {transcript}")

    # 2. LLM intent parsing (with rolling conversation memory for context)
    history = memory.get_history(session_id)
    system_prompt = prompt.build_system_prompt(language=language)

    raw_response = llm.chat_completion(
        system_prompt=system_prompt,
        user_message=transcript,
        conversation_history=history,
    )

    memory.append_turn(session_id, "user", transcript)
    memory.append_turn(session_id, "assistant", raw_response)

    # 3. Validate structured output
    try:
        command = parser.parse_llm_response(raw_response)
    except parser.CommandParseError as e:
        logger.warning(f"[{session_id}] Failed to parse command: {e}")
        return {
            "transcript": transcript,
            "intent": "unknown",
            "cart": memory.get_cart_state(session_id) or {},
            "spoken_response": prompt.get_voice_response("item_not_found", language, item=transcript),
            "requires_confirmation": False,
            "unresolved_items": [],
        }

    # 4. Apply the intent to cart state
    return _apply_command(db, session_id, command, language)


def _apply_command(db: Session, session_id: str, command: parser.ParsedCommand, language: str) -> dict:
    cart = memory.get_cart_state(session_id) or {"items": {}, "discount": None}
    unresolved_items = []

    if command.intent == "add_item":
        for item in command.items:
            product = _resolve_product(db, item.product_name)
            if not product:
                unresolved_items.append(item.product_name)
                continue
            key = str(product.id)
            existing_qty = cart["items"].get(key, {}).get("quantity", 0)
            cart["items"][key] = {
                "product_id": product.id,
                "product_name": product.name,
                "quantity": existing_qty + item.quantity,
                "unit_price": product.price,
            }
        memory.save_cart_state(session_id, cart)

        spoken = ""
        if command.items and not unresolved_items:
            first = command.items[0]
            spoken = prompt.get_voice_response("item_added", language, quantity=first.quantity, item=first.product_name)
        elif unresolved_items:
            spoken = prompt.get_voice_response("item_not_found", language, item=", ".join(unresolved_items))

        return {
            "transcript": None, "intent": command.intent, "cart": cart,
            "spoken_response": spoken, "requires_confirmation": False,
            "unresolved_items": unresolved_items,
        }

    elif command.intent == "remove_item":
        for item in command.items:
            product = _resolve_product(db, item.product_name)
            if product and str(product.id) in cart["items"]:
                del cart["items"][str(product.id)]
        memory.save_cart_state(session_id, cart)
        return {
            "transcript": None, "intent": command.intent, "cart": cart,
            "spoken_response": "Item removed." if language == "en" else "",
            "requires_confirmation": False, "unresolved_items": [],
        }

    elif command.intent == "update_quantity":
        for item in command.items:
            product = _resolve_product(db, item.product_name)
            if product and str(product.id) in cart["items"]:
                cart["items"][str(product.id)]["quantity"] = item.quantity
        memory.save_cart_state(session_id, cart)
        return {
            "transcript": None, "intent": command.intent, "cart": cart,
            "spoken_response": "Quantity updated." if language == "en" else "",
            "requires_confirmation": False, "unresolved_items": [],
        }

    elif command.intent == "apply_discount":
        cart["discount"] = {"type": command.discount_type, "value": command.value, "target": command.target}
        memory.save_cart_state(session_id, cart)
        return {
            "transcript": None, "intent": command.intent, "cart": cart,
            "spoken_response": "Discount applied." if language == "en" else "",
            "requires_confirmation": False, "unresolved_items": [],
        }

    elif command.intent == "checkout":
        # Checkout is a sensitive, money-moving action — the API layer must
        # get explicit confirmation before calling billing_service, not the AI layer.
        return {
            "transcript": None, "intent": command.intent, "cart": cart,
            "spoken_response": "Please confirm to complete checkout." if language == "en" else "",
            "requires_confirmation": True, "unresolved_items": [],
        }

    elif command.intent == "cancel_sale":
        memory.clear_cart_state(session_id)
        memory.clear_session(session_id)
        return {
            "transcript": None, "intent": command.intent, "cart": {"items": {}, "discount": None},
            "spoken_response": "Sale cancelled." if language == "en" else "",
            "requires_confirmation": False, "unresolved_items": [],
        }

    elif command.intent in ("lookup_price", "check_stock"):
        results = []
        for item in command.items:
            product = _resolve_product(db, item.product_name)
            if product:
                results.append({"name": product.name, "price": product.price})
            else:
                unresolved_items.append(item.product_name)
        return {
            "transcript": None, "intent": command.intent, "cart": cart,
            "spoken_response": "", "requires_confirmation": False,
            "unresolved_items": unresolved_items, "lookup_results": results,
        }

    # Unknown / unsupported intent
    return {
        "transcript": None, "intent": "unknown", "cart": cart,
        "spoken_response": command.note or "Sorry, I didn't understand that.",
        "requires_confirmation": False, "unresolved_items": [],
    }


def confirm_checkout(db: Session, session_id: str, created_by: int, customer_id: Optional[int] = None) -> dict:
    """
    Called by the API layer only after explicit user/cashier confirmation.
    Converts the Redis cart state into a real Invoice via billing_service.
    """
    cart = memory.get_cart_state(session_id)
    if not cart or not cart.get("items"):
        raise CommandProcessingError("Cart is empty — nothing to checkout.")

    cart_items = [
        {"product_id": data["product_id"], "quantity": data["quantity"]}
        for data in cart["items"].values()
    ]

    invoice = billing_service.create_invoice(db, created_by=created_by, cart_items=cart_items, customer_id=customer_id)

    memory.clear_cart_state(session_id)
    memory.clear_session(session_id)

    return {"invoice_id": invoice.id, "invoice_number": invoice.invoice_number, "total_amount": invoice.total_amount}