/**
 * Role-based UI permission checks — mirrors backend/auth/roles.py's
 * require_admin / require_manager_or_admin / require_any_staff.
 * Frontend gating for UX only (hide/disable buttons); the backend is
 * still the real enforcement layer for every request.
 */

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  CASHIER: "cashier",
};

const ROLE_RANK = {
  [ROLES.CASHIER]: 1,
  [ROLES.MANAGER]: 2,
  [ROLES.ADMIN]: 3,
};

export const ROLE_RANK_LABELS = {
  [ROLES.CASHIER]: "Cashier",
  [ROLES.MANAGER]: "Manager",
  [ROLES.ADMIN]: "Admin",
};

/** True if the user's role meets or exceeds the required role's rank. */
export function hasRole(userRole, requiredRole) {
  return (ROLE_RANK[userRole] || 0) >= (ROLE_RANK[requiredRole] || 0);
}

export function isAdmin(userRole) {
  return userRole === ROLES.ADMIN;
}

export function isManagerOrAdmin(userRole) {
  return hasRole(userRole, ROLES.MANAGER);
}

export function isCashier(userRole) {
  return userRole === ROLES.CASHIER;
}

export function isStaff(userRole) {
  return hasRole(userRole, ROLES.CASHIER);
}

/** Feature-level permission map — central place to adjust who can do what in the UI. */
export const PERMISSIONS = {
  VIEW_REPORTS: ROLES.MANAGER,
  MANAGE_PRODUCTS: ROLES.MANAGER,
  MANAGE_STAFF: ROLES.ADMIN,
  ADJUST_INVENTORY: ROLES.MANAGER,
  REFUND_PAYMENT: ROLES.MANAGER,
  CANCEL_INVOICE: ROLES.MANAGER,
  PROCESS_SALE: ROLES.CASHIER,
  VIEW_VOICE_ANALYTICS: ROLES.MANAGER,
};


export const CUSTOM_PERMISSIONS = {
  INVENTORY: "inventory",
  PRODUCTS: "products",
  REPORTS: "reports",
  SETTINGS: "settings",
  USERS: "users",
  BILLING: "billing",
  REFUND: "refund",
};

export function can(userRole, permissionKey) {
  const requiredRole = PERMISSIONS[permissionKey];
  if (!requiredRole) return false;
  return hasRole(userRole, requiredRole);
}


/**
 * Returns true if the user has a specific permission.
 * Admin always has every permission.
 */
export function hasPermission(user, permission) {
  if (!user) return false;

  // Admin has all permissions
  if (user.role === ROLES.ADMIN) return true;

  return Array.isArray(user.permissions)
    ? user.permissions.includes(permission)
    : false;
}

export const ROUTE_PERMISSIONS = {
  "products.view": ROLES.MANAGER,
  "inventory.view": ROLES.MANAGER,
  "reports.view": ROLES.MANAGER,
  "staff.manage": ROLES.ADMIN,
};
