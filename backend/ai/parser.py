import json
import logging
from typing import Optional, List

from pydantic import BaseModel, ValidationError, field_validator, Field

logger = logging.getLogger("ai.parser")


VALID_INTENTS = {
    "start_billing",
    "add_item", "add_inventory", "remove_item", "increase_quantity", "decrease_quantity",
    "update_quantity", "apply_discount", "cancel_last_item", "checkout", "get_bill_total",
    "generate_qr", "lookup_price", "check_stock", "cancel_sale",
    "next_customer", "open_reports", "todays_sales", "print_bill",
    "logout", "unknown",
}


class ParsedItem(BaseModel):
    product_name: str
    quantity: float | None = None
    unit_price: float | None = None
    unit: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def quantity_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("quantity must be positive")
        return v

    @field_validator("unit_price")
    @classmethod
    def unit_price_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("unit_price must be positive")
        return v


class ParsedCommand(BaseModel):
    intent: str
    items: List[ParsedItem] = Field(default_factory=list)
    discount_type: Optional[str] = None
    value: Optional[float] = None
    target: Optional[str] = None
    payment_method: Optional[str] = None
    note: Optional[str] = None

    @field_validator("intent")
    @classmethod
    def intent_must_be_known(cls, v):
        if v not in VALID_INTENTS:
            raise ValueError(f"Unknown intent '{v}'")
        return v


class CommandParseError(Exception):
    pass


def _strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return text


def parse_llm_response(raw_text: str) -> ParsedCommand:
    cleaned = _strip_markdown_fences(raw_text)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.warning(f"LLM returned non-JSON output: {raw_text[:200]}")
        raise CommandParseError(f"Could not parse LLM response as JSON: {e}") from e

    try:
        return ParsedCommand(**data)
    except ValidationError as e:
        logger.warning(f"LLM output failed schema validation: {e}")
        raise CommandParseError(f"LLM response did not match expected schema: {e}") from e