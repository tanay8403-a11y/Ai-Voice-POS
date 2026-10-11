from datetime import datetime
from pydantic import BaseModel, EmailStr


class CustomerCreate(BaseModel):
    name: str
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None


class CustomerResponse(CustomerCreate):
    id: int
    loyalty_points: float
    total_spent: float
    created_at: datetime

    class Config:
        from_attributes = True