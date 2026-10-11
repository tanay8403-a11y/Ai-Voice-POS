import io
import barcode
from barcode.writer import ImageWriter


def generate_barcode_image(value: str) -> bytes:
    if not value:
        raise ValueError("Barcode value cannot be empty")

    code128 = barcode.get_barcode_class("code128")

    buffer = io.BytesIO()

    barcode_obj = code128(value, writer=ImageWriter())

    barcode_obj.write(buffer)

    return buffer.getvalue()