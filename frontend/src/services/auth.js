/**
 * Auth-related API calls: login, current user, and logout.
 */
import api from "./api";

async function saveSession(loginResponse) {
  const { access_token, refresh_token } = loginResponse.data;
  localStorage.setItem("access_token", access_token);
  if (refresh_token) {
    localStorage.setItem("refresh_token", refresh_token);
  }

  const me = await api.get("/auth/me");
  const user = me.data;
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export async function login(identifier, pin) {
  const loginResponse = await api.post(
    "/auth/login",
    { identifier, pin }
  );

  return saveSession(loginResponse);
}

export async function completePinSetup(identifier, oneTimePin, newPin) {
  const response = await api.post("/auth/setup-pin", {
    identifier,
    one_time_pin: oneTimePin,
    new_pin: newPin,
  });

  return saveSession({ data: response.data });
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem("access_token");
}

export async function listStaff() {
  const response = await api.get("/auth/staff");
  return response.data;
}

export async function updateStaffRole(userId, role) {
  const response = await api.patch(`/auth/staff/${userId}/role`, { role });
  return response.data;
}

export async function updateStaffStatus(userId, isActive) {
  const response = await api.patch(`/auth/staff/${userId}/status`, { is_active: isActive });
  return response.data;
}

export async function createStaff(payload, role = "cashier") {
  const response = await api.post(`/auth/register/staff?role=${role}`, payload);
  return response.data; // { user, employee_id, one_time_pin, email_sent }
}