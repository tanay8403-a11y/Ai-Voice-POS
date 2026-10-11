"""
Schemas for the voice AI conversation flow: start session -> transcribe
-> process (intent + response) -> end session. This is the core
differentiator of the product, so the schema is deliberately expressive
enough to support multi-item commands, disambiguation ("which size?"),
and confirmation prompts.
"""

from pydantic import BaseModel, Field
from enum import Enum


class VoiceIntent(str, Enum):
    ADD_ITEM = "add_item"
    REMOVE_ITEM = "remove_item"
    UPDATE_QUANTITY = "update_quantity"
    APPLY_DISCOUNT = "apply_discount"
    CANCEL_LAST_ITEM = "cancel_last_item"
    CHECKOUT = "checkout"
    GENERATE_QR = "generate_qr"
    LOOKUP_PRICE = "lookup_price"
    CHECK_STOCK = "check_stock"
    CANCEL_SALE = "cancel_sale"
    NEXT_CUSTOMER = "next_customer"
    OPEN_REPORTS = "open_reports"
    TODAYS_SALES = "todays_sales"
    UNKNOWN = "unknown"


class StartRequest(BaseModel):
    language: str = Field(default="en", pattern="^(en|hi|mr)$")
    customer_id: int | None = None


class StartResponse(BaseModel):
    session_id: str
    invoice_id: int
    greeting: str


class StartSessionRequest(BaseModel):
    language: str = "en"
    customer_id: int | None = None



class ProcessCommandRequest(BaseModel):
    session_id: str
    transcript: str


class DisambiguateRequest(BaseModel):
    session_id: str
    spoken_name: str
    chosen_product_id: int
    quantity: float = 1.0


class EndSessionRequest(BaseModel):
    session_id: str


    
class TranscribeResponse(BaseModel):
    session_id: str
    transcript: str


class SpokenItem(BaseModel):
    """A single item as extracted from speech, before product resolution."""
    product_name: str
    quantity: float = 1.0


class ProductMatch(BaseModel):
    """One candidate when a spoken name is ambiguous (e.g. 'Amul Butter' -> 3 sizes)."""
    product_id: int
    name: str
    price: float


class VoiceProcessRequest(BaseModel):
    session_id: str
    transcript: str


class VoiceProcessResponse(BaseModel):
    session_id: str
    intent: VoiceIntent
    matched_items: list[SpokenItem] = []
    ambiguous_items: dict[str, list[ProductMatch]] = {}  # spoken_name -> candidate products
    unresolved_items: list[str] = []  # spoken names with zero matches
    requires_confirmation: bool = False
    spoken_response: str
    cart_total: float | None = None


class VoiceDisambiguationRequest(BaseModel):
    """Cashier/customer picks one of the ambiguous_items candidates."""
    session_id: str
    spoken_name: str
    chosen_product_id: int
    quantity: float = 1.0


class EndRequest(BaseModel):
    session_id: str


class EndResponse(BaseModel):
    session_id: str
    invoice_id: int | None
    status: str  # "completed" | "cancelled"