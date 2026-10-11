"""
Orchestrates voice billing and inventory restocking commands.
The voice pipeline transcribes, parses intents, resolves products, applies
commands to the invoice or inventory, and responds.
Each turn's transcript/AI response/intent is appended onto the InvoiceSession
row itself for conversation history, analytics, and debugging — in addition
to short-term Redis memory used for LLM context.
"""

import logging
import uuid
import re
from datetime import datetime
from difflib import SequenceMatcher, get_close_matches
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.ai import llm, prompt, parser, memory
from backend.ai.prompt import get_voice_response
from backend.models.inventory import Inventory
from backend.models.product import Product
from backend.models.invoice_session import InvoiceSession, InvoiceSessionStatus
from backend.models.user import UserRole
from backend.services import billing_service, inventory_service, payment_services
from backend.models.payment import PaymentMethod

logger = logging.getLogger("services.voice")

WAKE_PHRASES = {
    "en": (
        "start billing",
        "start bill",
        "begin billing",
        "create a new bill",
        "create new bill",
        "create bill",
        "new bill",
        "start building",
        "start the billing",
        "start the bill",
        "start billing now",
        "please start billing",
    ),
    "hi": (
        "start billing",
        "नया बिल बनाओ",
        "नया बिल शुरू करो",
        "बिलिंग शुरू करो",
        "बिल शुरू करो",
    ),
}

INVENTORY_WAKE_PHRASES = {
    "en": (
        "add to inventory",
        "add item to stock",
        "add an item to inventory",
        "add inventory",
        "start inventory",
        "restock ",
        "please add to inventory",
    ),
    "hi": (
        "add to inventory",
        "add item to inventory",
        "restock inventory",
        "इन्वेंटरी जोड़ो",
        "स्टॉक जोड़ो",
        "इन्वेंटरी शुरू करो",
    ),
}

INVENTORY_MODE_INTENT = "_inventory_mode"


def _normalize_phrase(text: str) -> str:
    text = re.sub(r"[^\w\s]", " ", text.lower(), flags=re.UNICODE)
    return " ".join(text.split())


def is_start_billing_command(
    transcript: str,
    language: str = "en",
) -> bool:
    text = _normalize_phrase(transcript or "")
    phrases = tuple(
        _normalize_phrase(phrase)
        for phrase in WAKE_PHRASES.get(language, WAKE_PHRASES["en"])
    )

    # Exact phrase or recognized variant
    if any(f" {phrase} " in f" {text} " for phrase in phrases):
        return True

    # Allow small speech-recognition errors
    words = text.split()

    for size in range(2, min(5, len(words) + 1)):
        for start in range(len(words) - size + 1):
            phrase = " ".join(words[start:start + size])

            if get_close_matches(
                phrase,
                phrases,
                n=1,
                cutoff=0.78,
            ):
                return True

    return False


def is_add_inventory_command(transcript: str, language: str = "en") -> bool:
    text = _normalize_phrase(transcript or "")
    phrases = tuple(
        _normalize_phrase(phrase)
        for phrase in INVENTORY_WAKE_PHRASES.get(language, INVENTORY_WAKE_PHRASES["en"])
    )
    return text in phrases


def _normalize_language(language: str | None) -> str:
    language = (language or "en").strip().lower()

    if language in ("hi", "hin", "hindi"):
        return "hi"

    return "en"


def _normalize_unit(unit: str) -> str:
    unit = _normalize_phrase(unit).rstrip("s")
    aliases = {
        "kilogram": "kg",
        "kilo": "kg",
        "gram": "g",
        "liter": "l",
        "litre": "l",
        "piece": "pcs",
        "packet": "packet",
        "pack": "packet",
    }
    return aliases.get(unit, unit)


class VoiceServiceError(Exception):
    pass


class VoicePermissionError(VoiceServiceError):
    pass


# ---------- Session lifecycle ----------

def start_session(db: Session, user_id: int, language: str = "en", customer_id: int | None = None) -> dict:
    invoice = billing_service.start_billing(db, created_by=user_id, customer_id=customer_id)

    session_id = str(uuid.uuid4())
    voice_session = InvoiceSession(
        session_id=session_id,
        user_id=user_id,
        invoice_id=invoice.id,
        language=language,
        status=InvoiceSessionStatus.STARTED,  # waits for the wake phrase before accepting commands
        started_at=datetime.utcnow(),
    )
    db.add(voice_session)
    db.commit()

    return {
        "session_id": session_id,
        "invoice_id": invoice.id,
        "greeting": get_voice_response("waiting_for_start", language),
    }


def end_session(db: Session, session_id: str, complete: bool = False) -> dict:
    voice_session = _get_active_session(db, session_id)

    try:
        if complete:
            billing_service.complete_billing(db, voice_session.invoice_id, payment_method=None)
            voice_session.status = InvoiceSessionStatus.COMPLETED
            voice_session.is_completed = True
        else:
            billing_service.cancel_sale(db, voice_session.invoice_id)
            voice_session.status = InvoiceSessionStatus.CANCELLED
            voice_session.is_completed = False
    except Exception:
        voice_session.status = InvoiceSessionStatus.FAILED
        db.commit()
        raise

    voice_session.ended_at = datetime.utcnow()
    db.commit()
    memory.clear_session(session_id)

    return {
        "session_id": session_id,
        "invoice_id": voice_session.invoice_id if complete else None,
        "status": voice_session.status.value,
    }


def _get_active_session(db: Session, session_id: str) -> InvoiceSession:
    voice_session = db.query(InvoiceSession).filter(InvoiceSession.session_id == session_id).first()
    if not voice_session:
        raise VoiceServiceError("Voice session not found")
    if voice_session.status not in (InvoiceSessionStatus.STARTED, InvoiceSessionStatus.ACTIVE):
        raise VoiceServiceError(f"Voice session is {voice_session.status.value}, not active")
    return voice_session


def _log_turn(voice_session: InvoiceSession, transcript: str | None, ai_response: str | None, intent: str | None) -> None:
    if transcript:
        voice_session.transcript = (
            f"{voice_session.transcript}\n{transcript}" if voice_session.transcript else transcript
        )
    if ai_response:
        voice_session.ai_response = (
            f"{voice_session.ai_response}\n{ai_response}" if voice_session.ai_response else ai_response
        )
    if intent:
        voice_session.intent = intent


# ---------- Transcription ----------

def transcribe(db: Session, session_id: str, audio_file_path: str, language: str = "en") -> str:
    voice_session = _get_active_session(db, session_id)

    try:
        text = llm.transcribe_audio_openai(audio_file_path, language=voice_session.language)  # Vosk under the hood
    except llm.LLMError as exc:
        logger.warning(
            "Speech recognition failed for voice session %s: %s",
            session_id,
            exc,
        )
        raise

    if not text.strip():
        raise VoiceServiceError("Could not understand audio — please try again")

    return text.strip()


# ---------- Product resolution ----------

def _resolve_product_candidates(db: Session, spoken_name: str, limit: int = 5) -> list[Product]:
    spoken_terms = _product_search_terms(spoken_name)
    if not spoken_terms:
        return []

    all_products = db.query(Product).filter(Product.is_active == True).all()  # noqa: E712
    ranked = _rank_product_matches(" ".join(spoken_terms), all_products)
    return [product for product, score in ranked if score >= 0.58][:limit]


_PRODUCT_FILLER_WORDS = {
    "a", "an", "and", "add", "please", "put", "place", "give", "get", "bring",
    "want", "need", "me", "some", "the", "to", "into", "in", "my", "cart",
    "bill", "billing", "item", "items", "product", "products", "of", "for",
    "sell", "buy", "pack", "packet", "packets", "piece", "pieces", "unit",
    "units", "quantity", "qty", "number", "no",
    "bar", "bars", "bottle", "bottles", "can", "cans", "box", "boxes", "jar", "jars",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "एक", "दो", "तीन", "चार", "पाँच", "पांच", "छह", "सात", "आठ", "नौ", "दस",
}


def _product_search_terms(text: str) -> list[str]:
    return [
        token
        for token in _normalize_phrase(text).split()
        if token not in _PRODUCT_FILLER_WORDS and not token.isdecimal()
    ]


def _product_match_score(spoken_name: str, product: Product) -> float:
    spoken_tokens = _product_search_terms(spoken_name)
    if not spoken_tokens:
        return 0.0
    normalized_spoken = " ".join(spoken_tokens)

    catalog_fields = [
        _normalize_phrase(getattr(product, field, None) or "")
        for field in ("name", "category", "brand", "description", "sku", "barcode")
    ]
    catalog_fields = [value for value in catalog_fields if value]
    normalized_name = _normalize_phrase(product.name or "")
    if normalized_name == normalized_spoken:
        return 1.0

    name_tokens = set(normalized_name.split())
    if len(spoken_tokens) == 1 and len(spoken_tokens[0]) >= 2:
        initials = "".join(token[0] for token in normalized_name.split() if token)
        if spoken_tokens[0] == initials:
            return 0.76

    def token_similarity(query: str, candidates: set[str]) -> tuple[float, str | None]:
        best, matched = 0.0, None
        for candidate in candidates:
            if query == candidate:
                return 1.0, candidate
            if min(len(query), len(candidate)) < 3:
                continue
            score = SequenceMatcher(None, query, candidate).ratio()
            if query.startswith(candidate) or candidate.startswith(query):
                score = max(score, 0.88)
            if score > best:
                best, matched = score, candidate
        return (best, matched) if best >= 0.58 else (0.0, None)

    name_scores = [
        token_similarity(token, name_tokens)
        for token in spoken_tokens
    ]
    name_coverage = sum(score for score, _ in name_scores) / len(spoken_tokens)
    matched_name_tokens = {
        token for _, token in name_scores if token is not None
    }
    name_precision = len(matched_name_tokens) / len(name_tokens) if name_tokens else 0.0
    name_score = max(
        SequenceMatcher(None, normalized_spoken, normalized_name).ratio(),
        name_coverage * 0.9 * name_precision,
        0.66 if matched_name_tokens else 0.0,
    )

    metadata_fields = catalog_fields[1:]
    metadata_tokens = {
        token for field in metadata_fields for token in field.split()
    }
    metadata_coverage = sum(
        token_similarity(token, metadata_tokens)[0]
        for token in spoken_tokens
    ) / len(spoken_tokens)
    metadata_score = max(
        (
            SequenceMatcher(None, normalized_spoken, field).ratio() * 0.82
            for field in metadata_fields
        ),
        default=0.0,
    )
    return max(name_score, metadata_coverage * 0.9, metadata_score)


def _rank_product_matches(spoken_name: str, products: list[Product]) -> list[tuple[Product, float]]:
    ranked = [
        (product, _product_match_score(spoken_name, product))
        for product in products
    ]
    return sorted(ranked, key=lambda match: match[1], reverse=True)


def _catalog_prompt_context(db: Session, transcript: str, limit: int = 12) -> str:
    terms = _product_search_terms(transcript)
    if not terms:
        return ""

    phrases = [
        " ".join(terms[start:start + size])
        for size in range(1, min(5, len(terms)) + 1)
        for start in range(len(terms) - size + 1)
    ]
    products = db.query(Product).filter(Product.is_active == True).all()  # noqa: E712
    scored_products = []
    for product in products:
        score = max(
            (_product_match_score(phrase, product) for phrase in phrases),
            default=0.0,
        )
        if score >= 0.58:
            scored_products.append((score, product))

    scored_products.sort(key=lambda result: result[0], reverse=True)
    if not scored_products:
        return ""

    lines = []
    for _, product in scored_products[:limit]:
        details = [
            f"name: {product.name}",
            f"category: {product.category}" if product.category else None,
            f"brand: {product.brand}" if product.brand else None,
            f"SKU: {product.sku}" if product.sku else None,
        ]
        lines.append("- " + "; ".join(value for value in details if value))
    return "\n".join(lines)


# ---------- Main processing ----------

def process_command(
    db: Session,
    session_id: str,
    transcript: str,
    language: str | None = None,
) -> dict:
    voice_session = _get_active_session(db, session_id)

    # The session language is the source of truth.
    # This prevents the language from being lost between
    # /transcribe and /process.
    language = _normalize_language(
        language or voice_session.language
    )

    if is_add_inventory_command(transcript, language):
        voice_session.status = InvoiceSessionStatus.ACTIVE
        result = _response(
            session_id,
            "inventory_mode",
            spoken=get_voice_response("waiting_for_inventory_item", language),
            invoice_id=voice_session.invoice_id,
            db=db,
            extra={"mode": "inventory"},
        )
        _log_turn(voice_session, transcript, result["spoken_response"], None)
        voice_session.intent = INVENTORY_MODE_INTENT
        db.commit()
        return result

    if voice_session.status == InvoiceSessionStatus.STARTED:
        if is_start_billing_command(transcript, language):
            voice_session.status = InvoiceSessionStatus.ACTIVE
            voice_session.language = language
            db.commit()

            result = _response(
                session_id,
                "start_billing",
                spoken=get_voice_response(
                    "billing_started",
                    language,
                ),
                invoice_id=voice_session.invoice_id,
                db=db,
            )

            _log_turn(
                voice_session,
                transcript,
                result["spoken_response"],
                "start_billing",
            )

            db.commit()
            return result

        # The session already owns a draft invoice, so natural commands can
        # start billing immediately without a separate wake phrase.
        voice_session.status = InvoiceSessionStatus.ACTIVE
        voice_session.language = language
        db.commit()

    history = memory.get_history(session_id)
    inventory_mode = voice_session.intent == INVENTORY_MODE_INTENT

    system_prompt = (
        prompt.build_inventory_prompt(language)
        if inventory_mode
        else prompt.build_system_prompt(
            language,
            _catalog_prompt_context(db, transcript),
        )
    )

    try:
        raw_response = llm.chat_completion(
            system_prompt=system_prompt,
            user_message=transcript,
            conversation_history=history,
        )

    except llm.LLMError:
        voice_session.status = InvoiceSessionStatus.FAILED
        db.commit()
        raise

    memory.append_turn(
        session_id,
        "user",
        transcript,
    )

    memory.append_turn(
        session_id,
        "assistant",
        raw_response,
    )

    try:
        command = parser.parse_llm_response(
            raw_response
        )

    except parser.CommandParseError:
        result = _response(
            session_id,
            "unknown",
            spoken=get_voice_response(
                "unknown_command",
                language,
            ),
            invoice_id=voice_session.invoice_id,
            db=db,
        )

        _log_turn(
            voice_session,
            transcript,
            result["spoken_response"],
            None if inventory_mode else "unknown",
        )

        db.commit()
        return result

    if inventory_mode and (command.intent != "add_inventory" or not command.items):
        result = _response(
            session_id,
            "unknown",
            spoken=get_voice_response("waiting_for_inventory_item", language),
            invoice_id=voice_session.invoice_id,
            db=db,
            extra={"mode": "inventory"},
        )
        _log_turn(voice_session, transcript, result["spoken_response"], None)
        db.commit()
        return result

    result = _apply(
        db,
        voice_session,
        command,
        language,
    )

    _log_turn(
        voice_session,
        transcript,
        result.get("spoken_response"),
        command.intent,
    )

    db.commit()

    return result


def _apply(db: Session, voice_session: InvoiceSession, command: parser.ParsedCommand, language: str) -> dict:
    invoice_id = voice_session.invoice_id
    session_id = voice_session.session_id

    if command.intent == "start_billing":
        return _response(
            session_id,
            "start_billing",
            spoken=get_voice_response("billing_started", language),
            invoice_id=invoice_id,
            db=db,
        )

    if command.intent == "add_inventory":
        if voice_session.user.role not in (UserRole.ADMIN, UserRole.MANAGER):
            raise VoicePermissionError(
                get_voice_response("inventory_manager_required", language)
            )

        missing_quantity = next(
            (item for item in command.items if item.quantity is None),
            None,
        )
        if missing_quantity:
            return _response(
                session_id,
                "add_inventory",
                spoken=get_voice_response(
                    "quantity_needed", language, item=missing_quantity.product_name
                ),
                invoice_id=invoice_id,
                db=db,
                extra={"mode": "inventory", "clarification_required": "quantity"},
            )

        resolved = []
        ambiguous, unresolved = {}, []
        for item in command.items:
            candidates = _resolve_product_candidates(db, item.product_name)
            if not candidates:
                unresolved.append(item.product_name)
            elif len(candidates) == 1:
                resolved.append((candidates[0], item.quantity))
            else:
                ambiguous[item.product_name] = [
                    {"product_id": product.id, "name": product.name}
                    for product in candidates
                ]

        # Validate the whole batch first so a typo or ambiguous product never
        # leaves only part of a spoken restock applied.
        if ambiguous or unresolved:
            explanations = []
            if ambiguous:
                name, options = next(iter(ambiguous.items()))
                option_names = ", ".join(option["name"] for option in options)
                explanations.append(
                    f"'{name}': {option_names}"
                )
            if unresolved:
                explanations.append(", ".join(unresolved))
            spoken = (
                f"कृपया उत्पाद स्पष्ट करें: {'; '.join(explanations)}।"
                if language == "hi"
                else f"No inventory was changed. Please clarify these products: {'; '.join(explanations)}."
            )
            return _response(
                session_id,
                "add_inventory",
                spoken=spoken,
                ambiguous=ambiguous,
                unresolved=unresolved,
                invoice_id=invoice_id,
                db=db,
                extra={
                    "mode": "inventory",
                    "inventory_updates": [],
                    "clarification_required": "product",
                },
            )

        aggregated = {}
        for product, quantity in resolved:
            if product.id not in aggregated:
                aggregated[product.id] = {"product": product, "quantity": 0}
            aggregated[product.id]["quantity"] += quantity

        matched = []
        for entry in aggregated.values():
            product = entry["product"]
            inventory = inventory_service.add_stock_quantity(
                db, product.id, entry["quantity"]
            )
            matched.append({
                "product_name": product.name,
                "quantity": entry["quantity"],
                "inventory_quantity": inventory.quantity,
            })

        if matched:
            items_text = ", ".join(
                f"{item['quantity']:g} {item['product_name']}"
                for item in matched
            )
            spoken = get_voice_response("inventory_updated", language, items=items_text)
        else:
            spoken = get_voice_response("unknown_command", language)

        return _response(
            session_id,
            "add_inventory",
            spoken=spoken,
            matched=matched,
            ambiguous=ambiguous,
            unresolved=unresolved,
            invoice_id=invoice_id,
            db=db,
            extra={"mode": "billing", "inventory_updates": matched},
        )

    if command.intent == "add_item":
        missing_quantity = next(
            (item for item in command.items if item.quantity is None),
            None,
        )
        if missing_quantity:
            return _response(
                session_id,
                "add_item",
                spoken=get_voice_response(
                    "quantity_needed", language, item=missing_quantity.product_name
                ),
                invoice_id=invoice_id,
                db=db,
                extra={"clarification_required": "quantity"},
            )

        matched, ambiguous, unresolved = [], {}, []

        for item in command.items:
            ranked_matches = _rank_product_matches(
                item.product_name,
                _resolve_product_candidates(db, item.product_name),
            )
            if not ranked_matches:
                unresolved.append(item.product_name)
                continue

            product, match_score = ranked_matches[0]
            second_score = ranked_matches[1][1] if len(ranked_matches) > 1 else 0.0
            search_terms = _product_search_terms(item.product_name)
            short_keyword_competition = (
                len(search_terms) == 1
                and len(search_terms[0]) <= 4
                and match_score < 0.99
                and second_score >= 0.62
            )
            if match_score < 0.62 or (
                len(ranked_matches) > 1 and match_score - second_score < 0.08
            ) or short_keyword_competition:
                ambiguous[item.product_name] = [
                    {
                        "product_id": candidate.id,
                        "name": candidate.name,
                        "price": candidate.price,
                        "match_score": round(score, 3),
                        "quantity": item.quantity,
                    }
                    for candidate, score in ranked_matches
                ]
                continue

            if product:
                if item.unit and _normalize_unit(item.unit) != _normalize_unit(product.unit or ""):
                    unresolved.append(item.product_name)
                    continue
                if (
                    item.unit_price is not None
                    and round(float(product.price), 2) != round(item.unit_price, 2)
                ):
                    return _response(
                        session_id,
                        "add_item",
                        spoken=get_voice_response(
                            "price_mismatch",
                            language,
                            item=product.name,
                            catalog_price=f"{float(product.price):.2f}",
                            spoken_price=f"{item.unit_price:.2f}",
                            unit=product.unit or "unit",
                        ),
                        invoice_id=invoice_id,
                        db=db,
                        extra={
                            "clarification_required": "catalog_price",
                            "catalog_price": float(product.price),
                            "product_name": product.name,
                        },
                    )
                matched.append({
                    "product": product,
                    "quantity": item.quantity,
                    "recognized_name": item.product_name,
                    "match_score": match_score,
                })

        # Resolve and validate every spoken item before mutating the invoice.
        if ambiguous:
            spoken = _build_add_response([], ambiguous, [], language)
            return _response(
                session_id, "add_item", spoken=spoken, ambiguous=ambiguous,
                invoice_id=invoice_id, db=db,
            )
        if unresolved:
            spoken = _build_add_response([], {}, unresolved, language)
            return _response(
                session_id, "add_item", spoken=spoken, unresolved=unresolved,
                invoice_id=invoice_id, db=db,
            )

        invoice = billing_service.get_invoice(db, invoice_id)
        cart_quantities = {}
        for invoice_item in getattr(invoice, "items", []):
            cart_quantities[invoice_item.product_id] = (
                cart_quantities.get(invoice_item.product_id, 0.0)
                + float(getattr(invoice_item, "quantity", 0.0) or 0.0)
            )

        requested_by_product = {}
        for item in matched:
            product_id = item["product"].id
            requested_by_product[product_id] = (
                requested_by_product.get(product_id, 0.0) + float(item["quantity"])
            )

        insufficient_stock = []
        for item in matched:
            product = item["product"]
            product_id = product.id
            if any(entry["product_id"] == product_id for entry in insufficient_stock):
                continue

            try:
                inventory = inventory_service.get_inventory_by_product(db, product_id)
                available = float(inventory.quantity) - cart_quantities.get(product_id, 0.0)
            except HTTPException as exc:
                if exc.status_code != 404:
                    raise
                available = 0.0

            requested = requested_by_product[product_id]
            if available < requested:
                insufficient_stock.append({
                    "product_id": product_id,
                    "product_name": product.name,
                    "requested": requested,
                    "available": max(0.0, available),
                })

        if insufficient_stock:
            stock_details = ", ".join(
                (
                    f"{entry['product_name']}: {entry['available']:g} available, "
                    f"{entry['requested']:g} requested"
                )
                for entry in insufficient_stock
            )
            spoken = (
                f"स्टॉक कम है: {stock_details}। कोई आइटम कार्ट में नहीं जोड़ा गया।"
                if language == "hi"
                else f"Not enough stock: {stock_details}. Nothing was added to the cart."
            )
            return _response(
                session_id,
                "add_item",
                spoken=spoken,
                matched=[],
                invoice_id=invoice_id,
                db=db,
                extra={"out_of_stock_items": insufficient_stock},
            )

        validated_items = matched
        matched = []
        for item in validated_items:
            invoice = billing_service.add_item(
                db, invoice_id, item["product"].id, item["quantity"]
            )
            matched.append({
                "product_name": item["product"].name,
                "recognized_name": item["recognized_name"],
                "match_score": round(item["match_score"], 3),
                "quantity": item["quantity"],
                "unit_price": float(item["product"].price),
                "tax_percent": float(item["product"].tax_percent or 0),
                "line_total": next(
                    float(invoice_item.line_total)
                    for invoice_item in invoice.items
                    if invoice_item.product_id == item["product"].id
                ),
            })

        spoken = _build_add_response(matched, ambiguous, unresolved, language)
        return _response(session_id, "add_item", spoken=spoken,
                          matched=matched, ambiguous=ambiguous, unresolved=unresolved,
                          invoice_id=invoice_id, db=db)

    elif command.intent == "remove_item":
        for item in command.items:
            candidates = _resolve_product_candidates(db, item.product_name)
            if candidates:
                billing_service.remove_item(db, invoice_id, candidates[0].id)
        return _response(session_id, "remove_item", spoken=get_voice_response("item_removed", language),
                          invoice_id=invoice_id, db=db)

    elif command.intent == "increase_quantity":
        for item in command.items:
            candidates = _resolve_product_candidates(db, item.product_name)
            if candidates:
                billing_service.add_item(db, invoice_id, candidates[0].id, item.quantity)
        return _response(session_id, "increase_quantity", spoken=get_voice_response("quantity_increased", language),
                          invoice_id=invoice_id, db=db)

    elif command.intent == "decrease_quantity":
        for item in command.items:
            candidates = _resolve_product_candidates(db, item.product_name)
            if candidates:
                current_item = next(
                    (i for i in billing_service.get_invoice(db, invoice_id).items if i.product_id == candidates[0].id),
                    None,
                )
                if current_item:
                    new_qty = max(0, current_item.quantity - item.quantity)
                    if new_qty == 0:
                        billing_service.remove_item(db, invoice_id, candidates[0].id)
                    else:
                        billing_service.update_quantity(db, invoice_id, candidates[0].id, new_qty)
        return _response(session_id, "decrease_quantity", spoken=get_voice_response("quantity_decreased", language),
                          invoice_id=invoice_id, db=db)

    elif command.intent == "update_quantity":
        for item in command.items:
            candidates = _resolve_product_candidates(db, item.product_name)
            if candidates:
                billing_service.update_quantity(db, invoice_id, candidates[0].id, item.quantity)
        return _response(session_id, "update_quantity", spoken=get_voice_response("quantity_updated", language),
                          invoice_id=invoice_id, db=db)

    elif command.intent == "apply_discount":
        target_id = None
        if command.target:
            candidates = _resolve_product_candidates(db, command.target)
            target_id = candidates[0].id if candidates else None
        billing_service.apply_discount(db, invoice_id, command.discount_type, command.value, target_id)
        return _response(session_id, "apply_discount", spoken=get_voice_response("discount_applied", language),
                          invoice_id=invoice_id, db=db)

    elif command.intent == "cancel_last_item":
        billing_service.remove_last_item(db, invoice_id)
        return _response(session_id, "cancel_last_item", spoken=get_voice_response("last_item_removed", language),
                          invoice_id=invoice_id, db=db)

    elif command.intent == "checkout":
        invoice = billing_service.get_invoice(db, invoice_id)
        spoken = get_voice_response(
            "checkout_confirmation",
            language,
            total=f"{invoice.total_amount:.2f}",
        )

        return _response(
            session_id,
            "checkout",
            spoken=spoken,
            requires_confirmation=True,
            invoice_id=invoice_id,
            db=db,
        )

    elif command.intent == "get_bill_total":
        invoice = billing_service.get_invoice(db, invoice_id)
        spoken = get_voice_response(
            "bill_total",
            language,
            subtotal=f"{invoice.subtotal:.2f}",
            discount=f"{invoice.discount_amount:.2f}",
            tax=f"{invoice.tax_amount:.2f}",
            total=f"{invoice.total_amount:.2f}",
        )
        return _response(
            session_id,
            "get_bill_total",
            spoken=spoken,
            invoice_id=invoice_id,
            db=db,
        )

    elif command.intent == "generate_qr":
        order = payment_services.create_payment_order(db, invoice_id, PaymentMethod.RAZORPAY)
        return _response(session_id, "generate_qr", spoken=get_voice_response("qr_generated", language),
                          invoice_id=invoice_id, db=db, extra={"qr_order": order})

    elif command.intent == "cancel_sale":
        billing_service.cancel_sale(db, invoice_id)
        voice_session.status = InvoiceSessionStatus.CANCELLED
        voice_session.ended_at = datetime.utcnow()
        memory.clear_session(session_id)
        return _response(session_id, "cancel_sale", spoken=get_voice_response("sale_cancelled", language), invoice_id=None)

    elif command.intent == "next_customer":
        invoice = billing_service.get_invoice(db, invoice_id)
        if not invoice.items:
            billing_service.cancel_sale(db, invoice_id)
        voice_session.status = InvoiceSessionStatus.COMPLETED
        voice_session.ended_at = datetime.utcnow()
        memory.clear_session(session_id)
        return _response(session_id, "next_customer", spoken=get_voice_response("next_customer_ready", language), invoice_id=None)

    elif command.intent == "open_reports":
        return _response(session_id, "open_reports", spoken=get_voice_response("reports_opened", language),
                          invoice_id=invoice_id, db=db, extra={"navigate_to": "/reports"})

    elif command.intent == "todays_sales":
        from backend.services import report_service
        stats = report_service.dashboard_stats(db)
        spoken = get_voice_response(
            "todays_sales",
            language,
            total=f"{stats['today_revenue']:.2f}",
            invoices=stats["today_invoice_count"],
        )
        return _response(session_id, "todays_sales", spoken=spoken, invoice_id=invoice_id, db=db, extra={"stats": stats})

    elif command.intent == "print_bill":
        return _response(session_id, "print_bill", spoken=get_voice_response("printing_bill", language),
                          invoice_id=invoice_id, db=db, extra={"action": "print"})

    elif command.intent == "logout":
        return _response(session_id, "logout", spoken=get_voice_response("logging_out", language),
                          invoice_id=None, extra={"action": "logout"})

    elif command.intent in ("lookup_price", "check_stock"):
        results, unresolved = [], []
        for item in command.items:
            candidates = _resolve_product_candidates(db, item.product_name)
            if candidates:
                results.append({"name": candidates[0].name, "price": candidates[0].price})
            else:
                unresolved.append(item.product_name)
        response_key = "price_lookup" if command.intent == "lookup_price" else "stock_checked"
        return _response(session_id, command.intent, spoken=get_voice_response(response_key, language),
                          unresolved=unresolved,
                          invoice_id=invoice_id, db=db, extra={"lookup_results": results})

    return _response(session_id, "unknown",
                      spoken=get_voice_response("unknown_command", language),
                      invoice_id=invoice_id, db=db)

def _build_add_response(
    matched: list,
    ambiguous: dict,
    unresolved: list,
    language: str,
) -> str:

    language = _normalize_language(language)

    if ambiguous:
        name, options = next(iter(ambiguous.items()))

        option_lines = ", ".join(
            f"{i + 1}. {o['name']}"
            for i, o in enumerate(options)
        )

        if language == "hi":
            return (
                f"'{name}' के लिए {len(options)} "
                f"प्रोडक्ट मिले: {option_lines}। "
                f"कौन सा चुनना है?"
            )

        return (
            f"There are {len(options)} products for "
            f"'{name}': {option_lines}. "
            f"Which one?"
        )

    if matched and not unresolved:
        parts = [
            f"{m['quantity']} {m['product_name']}"
            for m in matched
        ]

        items_text = ", ".join(parts)

        if language == "hi":
            return (
                f"{items_text} कार्ट में जोड़ दिया गया है।"
            )

        return f"Added {items_text} to the cart."

    if unresolved:

        items_text = ", ".join(unresolved)

        if language == "hi":
            return (
                f"माफ़ कीजिए, {items_text} "
                f"कैटलॉग में नहीं मिला।"
            )

        return (
            f"Sorry, I couldn't find: "
            f"{items_text}."
        )

    if language == "hi":
        return "मुझे कोई आइटम नहीं मिला।"

    return "No item was added."


def _response(session_id, intent, spoken, matched=None, ambiguous=None, unresolved=None,
              requires_confirmation=False, invoice_id=None, db: Session | None = None, extra: dict | None = None) -> dict:
    cart_total = None
    if invoice_id and db:
        invoice = billing_service.get_invoice(db, invoice_id)
        cart_total = invoice.total_amount

    result = {
        "session_id": session_id,
        "invoice_id": invoice_id,
        "intent": intent,
        "matched_items": matched or [],
        "ambiguous_items": ambiguous or {},
        "unresolved_items": unresolved or [],
        "requires_confirmation": requires_confirmation,
        "spoken_response": spoken,
        "cart_total": cart_total,
    }
    if extra:
        result.update(extra)
    return result


# ---------- Disambiguation ----------

def resolve_disambiguation(db: Session, session_id: str, chosen_product_id: int, quantity: float) -> dict:
    voice_session = _get_active_session(db, session_id)
    billing_service.add_item(db, voice_session.invoice_id, chosen_product_id, quantity)
    language = _normalize_language(
        voice_session.language
    )

    result = _response(
        session_id,
        "add_item",
        spoken=get_voice_response(
            "item_added",
            language,
            quantity=quantity,
            item="selected item",
        ),
        invoice_id=voice_session.invoice_id,
        db=db,
    )
    _log_turn(voice_session, None, result["spoken_response"], "add_item")
    db.commit()
    return result