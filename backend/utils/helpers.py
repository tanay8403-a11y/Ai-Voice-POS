"""
Small, generic helper functions used across multiple modules.
Nothing here should import from services/ or api/ — this is the
lowest layer, safe to import from anywhere without circular imports.
"""

import re
import uuid
from datetime import datetime
from typing import Optional

import secrets
import string


def generate_employee_id(store_code: str) -> str:
    """e.g. STR-A1B2C3-E047 — ties the employee ID to their store for readability."""
    suffix = "".join(secrets.choice(string.digits) for _ in range(4))
    return f"{store_code}-E{suffix}"


def generate_one_time_pin() -> str:
    """Returns a cryptographically random six-digit staff setup PIN."""
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_sku(product_name: str, category: Optional[str] = None) -> str:
    """
    Generates a readable SKU from a product name, e.g.
    'Basmati Rice 1kg' -> 'BASMATI-RICE-1KG-A3F2'
    """
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", product_name.strip().upper()).strip("-")
    suffix = uuid.uuid4().hex[:4].upper()
    prefix = f"{category.upper()[:3]}-" if category else ""
    return f"{prefix}{slug}-{suffix}"[:50]


def round_currency(amount: float) -> float:
    """Rounds to 2 decimal places, consistent across all money calculations."""
    return round(amount + 1e-9, 2)  # tiny epsilon avoids float rounding artifacts


def format_currency_inr(amount: float) -> str:
    """Formats a number using Indian numbering (lakh/crore commas), e.g. 1234567 -> '12,34,567.00'"""
    amount_str = f"{amount:.2f}"
    integer_part, decimal_part = amount_str.split(".")
    is_negative = integer_part.startswith("-")
    if is_negative:
        integer_part = integer_part[1:]

    if len(integer_part) <= 3:
        formatted = integer_part
    else:
        last_three = integer_part[-3:]
        remaining = integer_part[:-3]
        groups = []
        while len(remaining) > 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            groups.insert(0, remaining)
        formatted = ",".join(groups) + "," + last_three

    result = f"₹{formatted}.{decimal_part}"
    return f"-{result}" if is_negative else result


def safe_filename(value: str) -> str:
    """Strips characters unsafe for filesystem paths, e.g. invoice numbers used in PDF filenames."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", value)


def paginate(query, limit: int = 50, offset: int = 0, max_limit: int = 200):
    """Applies safe pagination bounds to a SQLAlchemy query."""
    limit = min(max(limit, 1), max_limit)
    offset = max(offset, 0)
    return query.offset(offset).limit(limit)


def utc_now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"