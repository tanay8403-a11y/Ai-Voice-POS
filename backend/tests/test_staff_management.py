from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.api.auth import _get_admin_store, register_staff, update_staff_role
from backend.models.user import UserRole
from backend.models.store import Store
from backend.schemas.user import UserCreate, UserRoleUpdate


class StaffQuery:
    def __init__(self, staff):
        self.staff = staff

    def filter(self, *_conditions):
        return self

    def first(self):
        return self.staff


class StaffDatabase:
    def __init__(self, staff):
        self.staff = staff
        self.committed = False

    def query(self, _model):
        return StaffQuery(self.staff)

    def commit(self):
        self.committed = True

    def refresh(self, _staff):
        pass


class StoreDatabase:
    def __init__(self, store):
        self.store = store

    def query(self, model):
        assert model is Store
        return StaffQuery(self.store)


def test_admin_store_is_resolved_from_owner_when_store_id_is_missing():
    store = SimpleNamespace(id=4)
    admin = SimpleNamespace(id=1, store_id=None)

    resolved_store = _get_admin_store(StoreDatabase(store), admin)

    assert resolved_store is store
    assert admin.store_id == store.id


def test_staff_creation_cannot_create_admin():
    with pytest.raises(HTTPException) as error:
        register_staff(
            payload=UserCreate(
                name="Test Staff",
                email="staff@example.com",
                phone="1234567890",
                password="temporary",
            ),
            role=UserRole.ADMIN,
            db=None,
            current_admin=None,
        )

    assert error.value.status_code == 400


def test_staff_role_cannot_be_promoted_to_admin():
    staff = SimpleNamespace(role=UserRole.CASHIER)
    db = StaffDatabase(staff)

    with pytest.raises(HTTPException) as error:
        update_staff_role(
            user_id=2,
            payload=UserRoleUpdate(role="admin"),
            db=db,
            current_admin=SimpleNamespace(id=1),
        )

    assert error.value.status_code == 400
    assert staff.role == UserRole.CASHIER
    assert not db.committed


def test_staff_role_can_be_changed_to_manager():
    staff = SimpleNamespace(role=UserRole.CASHIER)
    db = StaffDatabase(staff)

    result = update_staff_role(
        user_id=2,
        payload=UserRoleUpdate(role="manager"),
        db=db,
        current_admin=SimpleNamespace(id=1),
    )

    assert result.role == UserRole.MANAGER
    assert db.committed
