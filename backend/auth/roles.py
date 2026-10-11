"""
Role-based access control. Provides a dependency factory for restricting
endpoints to specific roles, plus convenience shortcuts for common cases.
"""

from fastapi import Depends, HTTPException, status
from typing import List

from backend.models.user import User, UserRole
from backend.auth.authentication import get_current_user


def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted to perform this action.",
            )
        return current_user

    return role_checker


require_admin = require_role([UserRole.ADMIN])
require_manager_or_admin = require_role([UserRole.ADMIN, UserRole.MANAGER])
require_any_staff = require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER])