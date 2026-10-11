from datetime import datetime
from pydantic import BaseModel, EmailStr ,Field   


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    preferred_language: str | None = None


class UserRoleUpdate(BaseModel):
    role: str  # "admin" | "manager" | "cashier"


class UserStatusUpdate(BaseModel):
    is_active: bool


class PinLoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=150)
    pin: str = Field(min_length=1, max_length=64)

class UserResponse(BaseModel):
    id: int
    employee_id: str | None = None
    store_id: int | None = None
    created_by: int | None = None
    name: str
    email: EmailStr
    phone: str | None
    role: str
    preferred_language: str
    is_active: bool
    must_set_pin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StaffCreateResponse(BaseModel):
    """Returned once after creation as a fallback if the setup PIN email fails."""
    user: UserResponse
    employee_id: str
    one_time_pin: str
    email_sent: bool


class PinSetupRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=150)
    one_time_pin: str = Field(min_length=1, max_length=64)
    new_pin: str = Field(pattern=r"^\d{4}$")


class ChangePinRequest(BaseModel):
    old_pin: str = Field(min_length=1, max_length=64)
    new_pin: str = Field(pattern=r"^\d{4}$")