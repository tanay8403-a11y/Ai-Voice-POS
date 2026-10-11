from datetime import datetime

from pydantic import BaseModel, EmailStr


# =====================================================
# Create Store
# =====================================================

class StoreCreate(BaseModel):
    store_name: str
    business_type: str

    phone: str
    alternate_phone: str | None = None

    email: EmailStr
    website: str | None = None

    address: str
    city: str
    state: str
    country: str = "India"
    pincode: str

    gst_registered: bool = False
    gst_number: str | None = None
    pan_number: str | None = None

    invoice_prefix: str = "INV"
    invoice_suffix: str | None = None

    default_tax: int = 18

    currency: str = "INR"
    timezone: str = "Asia/Kolkata"

    upi_id: str | None = None

    bank_name: str | None = None
    account_holder: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None

    receipt_header: str | None = None
    receipt_footer: str | None = None


# =====================================================
# Update Store
# =====================================================

class StoreUpdate(BaseModel):
    store_name: str | None = None
    business_type: str | None = None

    gst_number: str | None = None
    pan_number: str | None = None

    phone: str | None = None
    alternate_phone: str | None = None

    website: str | None = None

    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pincode: str | None = None

    invoice_prefix: str | None = None
    invoice_suffix: str | None = None

    default_tax: int | None = None

    currency: str | None = None
    timezone: str | None = None

    upi_id: str | None = None

    bank_name: str | None = None
    account_holder: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None

    receipt_header: str | None = None
    receipt_footer: str | None = None

    logo_url: str | None = None


# =====================================================
# Store Response
# =====================================================

class StoreResponse(BaseModel):
    id: int

    owner_id: int

    store_name: str
    business_type: str

    store_code: str

    gst_registered: bool
    gst_number: str | None

    pan_number: str | None

    phone: str
    alternate_phone: str | None

    email: EmailStr
    website: str | None

    address: str
    city: str
    state: str
    country: str
    pincode: str

    invoice_prefix: str
    invoice_suffix: str | None

    invoice_start_number: int
    current_invoice_number: int

    financial_year: str

    default_tax: int

    currency: str
    timezone: str

    upi_id: str | None

    qr_code_path: str | None

    bank_name: str | None
    account_holder: str | None
    account_number: str | None
    ifsc_code: str | None

    logo_url: str | None

    receipt_header: str | None
    receipt_footer: str | None

    is_active: bool

    created_at: datetime

    class Config:
        from_attributes = True