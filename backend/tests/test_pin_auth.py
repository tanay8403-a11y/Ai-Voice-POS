from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.api.auth import login, setup_pin
from backend.auth.encryption import hash_password, verify_password
from backend.models.user import UserRole
from backend.schemas.user import PinSetupRequest
from backend.schemas.user import PinLoginRequest
from backend.utils.helpers import generate_one_time_pin


class FakeQuery:
    def __init__(self, user):
        self.user = user

    def filter(self, *_conditions):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self.user


class FakeDatabase:
    def __init__(self, user):
        self.user = user
        self.commits = 0

    def query(self, _model):
        return FakeQuery(self.user)

    def commit(self):
        self.commits += 1


def test_generated_staff_setup_pin_is_six_digits():
    assert len(generate_one_time_pin()) == 6
    assert generate_one_time_pin().isdigit()


@pytest.mark.parametrize("pin", ["", "123", "12345", "12ab"])
def test_pin_setup_rejects_non_four_digit_personal_pins(pin):
    with pytest.raises(ValidationError):
        PinSetupRequest(identifier="staff@example.com", one_time_pin="123456", new_pin=pin)


def test_pin_setup_accepts_a_four_digit_pin():
    request = PinSetupRequest(
        identifier="staff@example.com",
        one_time_pin="123456",
        new_pin="0427",
    )

    assert request.new_pin == "0427"


def test_one_time_pin_is_consumed_when_staff_sets_personal_pin():
    user = SimpleNamespace(
        id=7,
        role=UserRole.CASHIER,
        is_active=True,
        account_locked=False,
        must_set_pin=True,
        hashed_password=hash_password("815024"),
    )
    db = FakeDatabase(user)
    payload = PinSetupRequest(
        identifier="staff@example.com",
        one_time_pin="815024",
        new_pin="0427",
    )

    with patch("backend.api.auth.create_access_token", return_value="access"), patch(
        "backend.api.auth.create_refresh_token", return_value="refresh"
    ):
        result = setup_pin.__wrapped__(request=None, payload=payload, db=db)

    assert result.access_token == "access"
    assert not user.must_set_pin
    assert verify_password("0427", user.hashed_password)
    assert db.commits == 1

    with pytest.raises(HTTPException) as error:
        setup_pin.__wrapped__(request=None, payload=payload, db=db)
    assert error.value.status_code == 401


def test_existing_password_can_be_used_once_to_migrate_to_pin():
    user = SimpleNamespace(
        id=9,
        email="owner@example.com",
        employee_id=None,
        is_active=True,
        account_locked=False,
        must_set_pin=False,
        hashed_password=hash_password("legacy-login-secret"),
    )
    db = FakeDatabase(user)
    payload = PinLoginRequest(identifier="owner@example.com", pin="legacy-login-secret")

    with pytest.raises(HTTPException) as error:
        login.__wrapped__(request=None, payload=payload, db=db)

    assert error.value.status_code == 403
    assert error.value.detail == "PIN_SETUP_REQUIRED"
    assert user.must_set_pin
    assert db.commits == 1


def test_owner_signs_in_with_a_four_digit_pin():
    user = SimpleNamespace(
        id=12,
        role=UserRole.ADMIN,
        is_active=True,
        account_locked=False,
        must_set_pin=False,
        hashed_password=hash_password("0427"),
    )
    payload = PinLoginRequest(identifier="owner@example.com", pin="0427")

    with patch("backend.api.auth.create_access_token", return_value="access"), patch(
        "backend.api.auth.create_refresh_token", return_value="refresh"
    ):
        result = login.__wrapped__(request=None, payload=payload, db=FakeDatabase(user))

    assert result.access_token == "access"
    assert result.refresh_token == "refresh"
