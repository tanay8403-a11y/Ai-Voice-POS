"""
Authentication endpoints: owner + store registration (multi-store —
any number of owners can register), staff registration (admin-only,
scoped to the creating admin), login, token refresh, current user,
current store, and staff management (list/role/status — each admin
only ever sees/manages the staff they personally created).
"""

import os
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File, Form
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.config import settings
from backend.models.user import User, UserRole
from backend.models.store import Store
from backend.schemas.token import Token
from backend.schemas.user import UserCreate, UserResponse, UserRoleUpdate, UserStatusUpdate
from backend.schemas.store import StoreResponse
from backend.auth.authentication import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    TokenPayloadError,
    REFRESH_TOKEN_TYPE,
)
from backend.auth.encryption import hash_password, verify_password
from backend.auth.roles import require_admin

from backend.utils.helpers import generate_employee_id, generate_one_time_pin
from backend.utils.email import send_staff_welcome_email
from backend.schemas.user import ChangePinRequest, PinLoginRequest, PinSetupRequest, StaffCreateResponse
from backend.utils.rate_limiter import limiter

router = APIRouter()

STORE_LOGO_DIR = os.path.join(settings.INVOICE_DIR, "..", "logos")
ALLOWED_LOGO_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024


def _get_admin_store(db: Session, current_admin: User) -> Store:
    store = None
    if current_admin.store_id is not None:
        store = db.query(Store).filter(Store.id == current_admin.store_id).first()
    if store is None:
        store = db.query(Store).filter(Store.owner_id == current_admin.id).first()
    if store is None:
        raise HTTPException(status_code=400, detail="Your account has no associated store.")

    current_admin.store_id = store.id
    return store


# ---------- Registration status (public) ----------
# Kept only so the frontend's existing call doesn't 404. Multi-store
# registration is always open now — there's no single global gate.

@router.get("/registration-status")
def registration_status():
    return {"registration_open": True}


# ---------- Register owner + store (multipart, multi-store) ----------

@router.post("/register/owner", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_owner(
    # Owner account
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    pin: str = Form(...),

    # Store — required fields
    store_name: str = Form(...),
    store_phone: str = Form(...),
    store_email: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    state: str = Form(...),
    pincode: str = Form(...),

    # Store — optional
    business_type: str = Form("Retail"),
    country: str = Form("India"),
    gst_number: str | None = Form(None),
    pan_number: str | None = Form(None),
    alternate_phone: str | None = Form(None),
    website: str | None = Form(None),
    upi_id: str | None = Form(None),
    bank_name: str | None = Form(None),
    account_holder: str | None = Form(None),
    account_number: str | None = Form(None),
    ifsc_code: str | None = Form(None),
    default_tax: int = Form(18),
    currency: str = Form("INR"),
    timezone: str = Form("Asia/Kolkata"),

    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """
    Creates a new owner + their own store. Any number of owners can
    register — each gets an isolated store and their own staff list.
    """
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    existing_phone = db.query(User).filter(User.phone == phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="A user with this phone number already exists.")

    if not re.fullmatch(r"\d{4}", pin):
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits.")

    if gst_number:
        existing_gst = db.query(Store).filter(Store.gst_number == gst_number).first()
        if existing_gst:
            raise HTTPException(status_code=400, detail="This GST number is already registered.")

    logo_url = None
    if logo:
        if logo.content_type not in ALLOWED_LOGO_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported logo type: {logo.content_type}")
        logo_bytes = await logo.read()
        if len(logo_bytes) > MAX_LOGO_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Logo must be under 5MB.")
        os.makedirs(STORE_LOGO_DIR, exist_ok=True)
        ext = os.path.splitext(logo.filename)[1] or ".png"
        filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = os.path.join(STORE_LOGO_DIR, filename)
        with open(saved_path, "wb") as f:
            f.write(logo_bytes)
        logo_url = saved_path

    user = User(
        name=name,
        email=email,
        phone=phone,
        hashed_password=hash_password(pin),
        role=UserRole.ADMIN,
        is_active=True,
        must_set_pin=False,
    )
    db.add(user)

    try:
        db.flush()  # assigns user.id, needed for Store.owner_id and to link back onto the user
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not create user account.")

    store = Store(
        owner_id=user.id,
        store_name=store_name,
        store_code=f"STR-{uuid.uuid4().hex[:8].upper()}",
        business_type=business_type,
        gst_registered=bool(gst_number),
        gst_number=gst_number,
        pan_number=pan_number,
        phone=store_phone,
        alternate_phone=alternate_phone,
        email=store_email,
        website=website,
        address=address,
        city=city,
        state=state,
        country=country,
        pincode=pincode,
        default_tax=default_tax,
        currency=currency,
        timezone=timezone,
        upi_id=upi_id,
        bank_name=bank_name,
        account_holder=account_holder,
        account_number=account_number,
        ifsc_code=ifsc_code,
        logo_url=logo_url,
    )
    db.add(store)

    try:
        db.flush()  # need store.id to link back onto the owner
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not create store — please try again.")

    user.store_id = store.id  # owner belongs to their own store

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not finalize registration — please try again.")

    db.refresh(user)
    return user


# ---------- Staff registration (admin-only, scoped to the creating admin) ----------


@router.post("/register/staff", response_model=StaffCreateResponse, status_code=status.HTTP_201_CREATED)
def register_staff(
    payload: UserCreate,
    role: UserRole = UserRole.CASHIER,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Admin-only: creates a staff account with an auto-generated employee ID
    and one-time setup PIN. Staff must choose a personal 4-digit PIN before
    they can sign in.
    """
    if role not in (UserRole.MANAGER, UserRole.CASHIER):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff accounts can only be created as a manager or cashier.",
        )

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    if payload.phone:
        existing_phone = db.query(User).filter(User.phone == payload.phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="A user with this phone number already exists.")

    store = _get_admin_store(db, current_admin)

    employee_id = generate_employee_id(store.store_code)
    one_time_pin = generate_one_time_pin()

    user = User(
        employee_id=employee_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(one_time_pin),
        role=role,
        is_active=True,
        must_set_pin=True,
        store_id=store.id,
        created_by=current_admin.id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Staff account could not be created because the email, phone number, or employee ID is already in use.",
        ) from error
    db.refresh(user)

    email_sent = send_staff_welcome_email(
        to_email=user.email,
        name=user.name,
        employee_id=employee_id,
        one_time_pin=one_time_pin,
        store_name=store.store_name,
    )

    return StaffCreateResponse(
        user=user,
        employee_id=employee_id,
        one_time_pin=one_time_pin,
        email_sent=email_sent,
    )


@router.post("/setup-pin", response_model=Token)
@limiter.limit("5/minute")
def setup_pin(
    request: Request,
    payload: PinSetupRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        (User.email == payload.identifier) | (User.employee_id == payload.identifier)
    ).with_for_update().first()
    if not user or not user.is_active or user.account_locked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid setup credentials.")
    if not user.must_set_pin or not verify_password(payload.one_time_pin, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid setup credentials.")
    if payload.new_pin == payload.one_time_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a different PIN from the setup credential.")

    user.hashed_password = hash_password(payload.new_pin)
    user.must_set_pin = False
    db.commit()
    return Token(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=create_refresh_token(user_id=user.id),
    )

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: PinLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Accepts an email address or employee ID in the identifier field.
    """
    identifier = payload.identifier
    user = db.query(User).filter(
        (User.email == identifier) | (User.employee_id == identifier)
    ).first()

    if not user or not user.is_active or user.account_locked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credential_matches = verify_password(payload.pin, user.hashed_password)
    if not credential_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.must_set_pin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PIN_SETUP_REQUIRED")

    if not re.fullmatch(r"\d{4}", payload.pin):
        user.must_set_pin = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PIN_SETUP_REQUIRED")

    return Token(
        access_token=create_access_token(user_id=user.id, role=user.role),
        token_type="bearer",
        refresh_token=create_refresh_token(user_id=user.id),
    )


# ---------- Refresh ----------

@router.post("/refresh", response_model=Token)
def refresh_access_token(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(refresh_token, expected_type=REFRESH_TOKEN_TYPE)
    except TokenPayloadError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access_token = create_access_token(user_id=user.id, role=user.role)
    new_refresh_token = create_refresh_token(user_id=user.id)

    return Token(access_token=new_access_token, token_type="bearer", refresh_token=new_refresh_token)


# ---------- Current user ----------

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/change-pin")
def change_pin(
    payload: ChangePinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.old_pin, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current PIN is incorrect.")
    if not re.fullmatch(r"\d{4}", payload.new_pin):
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits.")

    current_user.hashed_password = hash_password(payload.new_pin)
    db.commit()
    return {"detail": "PIN updated successfully."}


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Stateless JWT logout: the client discards its token."""
    return {"detail": "Logged out successfully"}


# ---------- Current store ----------

@router.get("/me/store", response_model=StoreResponse)
def get_my_store(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    store = (
        db.query(Store)
        .filter(Store.id == current_user.store_id)
        .first()
        if current_user.store_id
        else db.query(Store).filter(Store.owner_id == current_user.id).first()
    )
    if not store:
        raise HTTPException(status_code=404, detail="No store found for this account")
    return store


# ---------- Staff management (admin-only, scoped to staff the admin personally created) ----------

@router.get("/staff", response_model=list[UserResponse], dependencies=[Depends(require_admin)])
def list_staff(db: Session = Depends(get_db), current_admin: User = Depends(get_current_user)):
    """Admin-only: lists only staff that this specific admin personally created."""
    return (
        db.query(User)
        .filter(User.created_by == current_admin.id)
        .order_by(User.created_at.desc())
        .all()
    )


def _get_own_staff_or_404(db: Session, current_admin: User, user_id: int) -> User:
    """
    Shared ownership check: 404s if the target doesn't exist or wasn't
    created by this admin. This is the actual isolation boundary — role
    checks alone (require_admin) only prove "an admin", not "the right one".
    """
    user = (
        db.query(User)
        .filter(User.id == user_id, User.created_by == current_admin.id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    return user


@router.patch("/staff/{user_id}/role", response_model=UserResponse, dependencies=[Depends(require_admin)])
def update_staff_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_user),
):
    user = _get_own_staff_or_404(db, current_admin, user_id)
    if payload.role not in (UserRole.MANAGER.value, UserRole.CASHIER.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff roles can only be manager or cashier.",
        )
    try:
        user.role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role '{payload.role}'")
    db.commit()
    db.refresh(user)
    return user


@router.patch("/staff/{user_id}/status", response_model=UserResponse, dependencies=[Depends(require_admin)])
def update_staff_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_user),
):
    """Activate/deactivate a staff account this admin created."""
    user = _get_own_staff_or_404(db, current_admin, user_id)
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user