/**
 * Owner registration API call — separate from services/auth.js's
 * existing login/register functions since this one is multipart
 * (supports logo upload) and maps to POST /auth/register/owner.
 */

import api from "./api";

/**
 * Submits the full registration payload as multipart/form-data.
 * `formData` keys must match the backend's Form(...) parameter names
 * exactly: name, email, phone, pin, store_name, store_phone,
 * store_email, address, city, state, pincode, business_type, country,
 * gst_number, pan_number, alternate_phone, website, upi_id, bank_name,
 * account_holder, account_number, ifsc_code, default_tax, currency,
 * timezone, logo (file).
 */
export async function registerOwner(formValues, logoFile) {
  const formData = new FormData();

  Object.entries(formValues).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      formData.append(key, value);
    }
  });

  if (logoFile) {
    formData.append("logo", logoFile);
  }

  const response = await api.post("/auth/register/owner", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getMyStore() {
  const response = await api.get("/auth/me/store");
  return response.data;
}