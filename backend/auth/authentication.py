"""
JWT creation/decoding (access + refresh tokens) and the get_current_user
dependency every protected route depends on. Combines what would otherwise
be jwt.py + dependencies.py into your existing authentication.py.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.database import get_db
from backend.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
REFRESH_TOKEN_EXPIRE_DAYS = 7


class TokenPayloadError(Exception):
    pass


# ---------- Token creation ----------

def create_access_token(user_id: int, role: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": str(user_id), "role": role, "type": ACCESS_TOKEN_TYPE, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "type": REFRESH_TOKEN_TYPE, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ---------- Token decoding ----------

def decode_token(token: str, expected_type: str = ACCESS_TOKEN_TYPE) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as e:
        raise TokenPayloadError(f"Invalid or expired token: {e}") from e

    if payload.get("type") != expected_type:
        raise TokenPayloadError(f"Expected a {expected_type} token, got {payload.get('type')}")
    if payload.get("sub") is None:
        raise TokenPayloadError("Token missing subject (user id)")

    return payload


# ---------- FastAPI dependency ----------

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_token(credentials.credentials, expected_type=ACCESS_TOKEN_TYPE)
    except TokenPayloadError:
        raise credentials_exception

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None or not user.is_active:
        raise credentials_exception

    return user