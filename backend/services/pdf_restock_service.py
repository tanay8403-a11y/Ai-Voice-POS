"""Extract product, quantity, and unit-price rows from supplier PDF invoices."""

import io
import re
from dataclasses import dataclass

import pymupdf
from PIL import Image
import pytesseract


MAX_PDF_PAGES = 20
MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

_NUMBER = re.compile(r"(?<![\w/.-])-?\d[\d,]*(?:\.\d+)?")
_SKIP_LINE = re.compile(
    r"\b(subtotal|grand total|total|tax|gst|cgst|sgst|discount|invoice|date|"
    r"quantity|qty|rate|price|amount|description|item|product|s\.?no\.?)\b",
    re.IGNORECASE,
)
_DESCRIPTION_HEADER = re.compile(r"^(description|product|particulars|item|goods)$", re.IGNORECASE)
_CATEGORY_HEADER = re.compile(r"^(category|group|department|class)$", re.IGNORECASE)
_QUANTITY_HEADER = re.compile(r"^(qty|quantity|qnty|units)$", re.IGNORECASE)
_PURCHASE_PRICE_HEADER = re.compile(
    r"^(rate|price|unitprice|cost|purchase|purchaseprice|costprice|basicrate)$",
    re.IGNORECASE,
)
_SELLING_PRICE_HEADER = re.compile(
    r"^(selling|sellingprice|sale|saleprice|mrp|retail|retailprice|listprice)$",
    re.IGNORECASE,
)
_PROFIT_HEADER = re.compile(
    r"^(profit|profitamount|margin|profitmargin|markup|markupamount)$",
    re.IGNORECASE,
)
_TOTAL_PRICE_HEADER = re.compile(r"^(amount|total|value|lineamount)$", re.IGNORECASE)


class PDFRestockError(ValueError):
    """A supplier PDF could not be safely read as restock rows."""


@dataclass(frozen=True)
class RestockRow:
    product_name: str
    quantity: float
    cost_price: float
    category: str | None = None
    selling_price: float | None = None
    profit_amount: float | None = None


def _parse_number(value: str) -> float | None:
    try:
        parsed = float(value.replace(",", ""))
    except ValueError:
        return None
    return parsed if parsed >= 0 else None


def parse_restock_rows(text: str) -> list[RestockRow]:
    rows = []
    has_profit_column = bool(
        re.search(r"\b(profit|margin|markup)\b", text, re.IGNORECASE)
    )
    for line in text.splitlines():
        cleaned = re.sub(r"\s+", " ", line).strip(" \t|")
        if not cleaned or _SKIP_LINE.search(cleaned):
            continue

        numbers = list(_NUMBER.finditer(cleaned))
        if len(numbers) < 2:
            continue

        first_number, second_number = numbers[:2]
        has_leading_row_number = (
            len(numbers) >= 3
            and not cleaned[:first_number.start()].strip()
            and re.search(r"[A-Za-z]", cleaned[first_number.end():second_number.start()])
        )
        has_quantity_prefix = (
            len(numbers) == 2
            and not cleaned[:first_number.start()].strip()
            and re.search(r"[A-Za-z]", cleaned[first_number.end():second_number.start()])
        )
        if has_leading_row_number:
            quantity_match, price_match = numbers[1], numbers[2]
            name = cleaned[first_number.end():quantity_match.start()]
        elif has_quantity_prefix:
            quantity_match, price_match = numbers
            name = cleaned[quantity_match.end():price_match.start()]
        else:
            # Supplier line items commonly end in quantity, unit rate, and line total.
            quantity_index = -3 if len(numbers) >= 3 else -2
            quantity_match = numbers[quantity_index]
            price_match = numbers[quantity_index + 1]
            name = cleaned[:quantity_match.start()]
        name = name.strip(" \t|:-.")
        name = re.sub(r"^\d+\s*[.)-]?\s*", "", name)
        quantity = _parse_number(quantity_match.group())
        cost_price = _parse_number(price_match.group())
        profit_amount = (
            _parse_number(numbers[-1].group())
            if has_profit_column
            and len(numbers) == 3
            and quantity_match is numbers[0]
            and price_match is numbers[1]
            else None
        )

        if name and quantity and quantity > 0 and cost_price is not None:
            selling_price = (
                cost_price + profit_amount if profit_amount is not None else None
            )
            rows.append(
                RestockRow(
                    name,
                    quantity,
                    cost_price,
                    selling_price=selling_price,
                    profit_amount=profit_amount,
                )
            )
    return rows


def _word_rows(words: list[tuple]) -> list[list[tuple[float, float, float, float, str]]]:
    positioned = sorted(
        (
            (float(word[0]), float(word[1]), float(word[2]), float(word[3]), str(word[4]))
            for word in words
            if len(word) >= 5 and str(word[4]).strip()
        ),
        key=lambda word: ((word[1] + word[3]) / 2, word[0]),
    )
    rows: list[list[tuple[float, float, float, float, str]]] = []
    for word in positioned:
        center_y = (word[1] + word[3]) / 2
        if not rows:
            rows.append([word])
            continue
        last_center_y = sum((item[1] + item[3]) / 2 for item in rows[-1]) / len(rows[-1])
        if abs(center_y - last_center_y) <= max(3.0, (word[3] - word[1]) * 0.6):
            rows[-1].append(word)
        else:
            rows.append([word])
    return [sorted(row, key=lambda word: word[0]) for row in rows]


def _header_columns(
    row: list[tuple[float, float, float, float, str]],
) -> dict[str, float]:
    found: dict[str, float] = {}
    for index, word in enumerate(row):
        text = re.sub(r"[^a-z]", "", word[4].lower())
        previous_text = (
            re.sub(r"[^a-z]", "", row[index - 1][4].lower())
            if index
            else ""
        )
        if text == "price" and previous_text in {
            "selling", "sale", "purchase", "cost", "retail", "list",
        }:
            continue
        if text == "amount" and previous_text in {
            "selling", "sale", "purchase", "cost", "profit", "markup",
        }:
            continue
        next_text = ""
        if index + 1 < len(row) and row[index + 1][0] - word[2] < 24:
            next_text = re.sub(r"[^a-z]", "", row[index + 1][4].lower())
        combined = text + next_text
        next_x = row[index + 1][2] if next_text else word[2]
        label_center_x = (word[0] + next_x) / 2

        if _DESCRIPTION_HEADER.fullmatch(text) or _DESCRIPTION_HEADER.fullmatch(combined):
            found.setdefault("description", label_center_x)
        elif _CATEGORY_HEADER.fullmatch(text) or _CATEGORY_HEADER.fullmatch(combined):
            found["category"] = label_center_x
        elif _QUANTITY_HEADER.fullmatch(text) or _QUANTITY_HEADER.fullmatch(combined):
            found["quantity"] = label_center_x
        elif _SELLING_PRICE_HEADER.fullmatch(text) or _SELLING_PRICE_HEADER.fullmatch(combined):
            found.setdefault("selling_price", label_center_x)
        elif _PROFIT_HEADER.fullmatch(text) or _PROFIT_HEADER.fullmatch(combined):
            found.setdefault("profit_amount", label_center_x)
        elif _PURCHASE_PRICE_HEADER.fullmatch(text) or _PURCHASE_PRICE_HEADER.fullmatch(combined):
            found.setdefault("purchase_price", label_center_x)
        elif _TOTAL_PRICE_HEADER.fullmatch(text) or _TOTAL_PRICE_HEADER.fullmatch(combined):
            found.setdefault("total_price", label_center_x)

    if "description" in found and "quantity" in found and (
        "purchase_price" in found
        or "selling_price" in found
        or "profit_amount" in found
        or "total_price" in found
    ):
        return found
    return {}


def parse_restock_words(words: list[tuple]) -> list[RestockRow]:
    """Read item columns by their PDF positions, not text extraction order."""
    rows = _word_rows(words)
    for header_index, row in enumerate(rows):
        columns = _header_columns(row)
        if not columns:
            continue

        centers = sorted(
            (x, name) for name, x in columns.items()
        )
        boundaries = {
            name: (
                (centers[index - 1][0] + x) / 2 if index else float("-inf"),
                (x + centers[index + 1][0]) / 2 if index + 1 < len(centers) else float("inf"),
            )
            for index, (x, name) in enumerate(centers)
        }
        parsed = []
        for data_row in rows[header_index + 1:]:
            text = " ".join(word[4] for word in data_row)
            normalized = text.lower()
            if any(term in normalized for term in (
                "subtotal", "grand total", "tax total", "invoice total",
            )):
                continue

            description_bounds = boundaries["description"]
            name_words = [
                word[4] for word in data_row
                if description_bounds[0] <= (word[0] + word[2]) / 2 < description_bounds[1]
            ]
            name = " ".join(name_words).strip(" \t|:-.")
            name = re.sub(r"^\d+[.)-]?\s*", "", name)
            if not name or _SKIP_LINE.search(name):
                continue

            def number_in_column(column: str) -> float | None:
                if column not in boundaries:
                    return None
                low, high = boundaries[column]
                candidates = [
                    (_parse_number(word[4].replace(",", "")), word[4])
                    for word in data_row
                    if low <= (word[0] + word[2]) / 2 < high
                ]
                candidates = [value for value, _ in candidates if value is not None]
                return candidates[-1] if candidates else None

            quantity = number_in_column("quantity")
            purchase_price = number_in_column("purchase_price")
            selling_price = number_in_column("selling_price")
            profit_amount = number_in_column("profit_amount")
            total_price = number_in_column("total_price")
            category = None
            if "category" in boundaries:
                category_low, category_high = boundaries["category"]
                category_words = [
                    word[4] for word in data_row
                    if category_low <= (word[0] + word[2]) / 2 < category_high
                ]
                category = " ".join(category_words).strip(" \t|:-.") or None
            if quantity is None or quantity <= 0:
                continue
            if purchase_price is None and total_price is not None:
                purchase_price = total_price / quantity
            if purchase_price is None:
                purchase_price = 0.0
            if selling_price is None and profit_amount is not None:
                selling_price = purchase_price + profit_amount
            parsed.append(
                RestockRow(
                    name,
                    quantity,
                    purchase_price,
                    category,
                    selling_price,
                    profit_amount,
                )
            )

        if parsed:
            return parsed
    return []


def _ocr_words(page) -> list[tuple]:
    image = page.get_pixmap(matrix=pymupdf.Matrix(3, 3), alpha=False)
    result = pytesseract.image_to_data(
        Image.open(io.BytesIO(image.tobytes("png"))),
        config="--psm 6",
        output_type=pytesseract.Output.DICT,
    )
    scale = 3
    words = []
    for index, text in enumerate(result["text"]):
        if not text.strip() or float(result["conf"][index]) < 0:
            continue
        x0 = float(result["left"][index]) / scale
        y0 = float(result["top"][index]) / scale
        x1 = x0 + float(result["width"][index]) / scale
        y1 = y0 + float(result["height"][index]) / scale
        words.append((x0, y0, x1, y1, text))
    return words


def extract_restock_rows(pdf_bytes: bytes) -> list[RestockRow]:
    if not pdf_bytes or len(pdf_bytes) > MAX_PDF_SIZE_BYTES:
        raise PDFRestockError("PDF must be non-empty and no larger than 10 MB.")

    try:
        document = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except (pymupdf.FileDataError, ValueError) as exc:
        raise PDFRestockError("The uploaded file is not a readable PDF.") from exc

    try:
        if document.page_count > MAX_PDF_PAGES:
            raise PDFRestockError("PDF must contain no more than 20 pages.")

        extracted_rows = []
        text_pages = []
        for page in document:
            text = page.get_text("text")
            page_rows = parse_restock_words(page.get_text("words"))
            if not page_rows and len(text.strip()) < 20:
                ocr_words = _ocr_words(page)
                page_rows = parse_restock_words(ocr_words)
                text = " ".join(word[4] for word in ocr_words)
            if page_rows:
                extracted_rows.extend(page_rows)
            text_pages.append(text)
    except pytesseract.TesseractNotFoundError as exc:
        raise PDFRestockError(
            "Local OCR is unavailable. Install Tesseract OCR and restart the backend."
        ) from exc
    finally:
        document.close()

    rows = extracted_rows or parse_restock_rows("\n".join(text_pages))
    if not rows:
        raise PDFRestockError(
            "No product rows were detected. Use a PDF with readable item, quantity, "
            "and unit-price columns, or adjust the invoice and try again."
        )
    return rows
