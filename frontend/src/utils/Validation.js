/**
 * Validation helpers for the Owner Registration wizard. Field names
 * match the real Store/User model exactly (store_name, gst_number,
 * pincode, ifsc_code, etc.) — no invented fields.
 */

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

export function isValidPhone(phone) {
  // Indian mobile: 10 digits, optionally prefixed with +91
  return /^(\+91)?[6-9]\d{9}$/.test((phone || "").replace(/\s/g, ""));
}

export function isValidPincode(pincode) {
  return /^\d{6}$/.test(pincode || "");
}

export function isValidPin(pin) {
  return /^\d{4}$/.test(pin || "");
}

export function isValidGST(gst) {
  // Standard 15-char GSTIN format: 2 digits state code, 10 char PAN, 1 entity, 1 'Z', 1 checksum
  if (!gst) return true; // optional field
  return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase());
}

export function isValidPAN(pan) {
  if (!pan) return true; // optional field
  return /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(pan.toUpperCase());
}

export function isValidIFSC(ifsc) {
  if (!ifsc) return true; // optional field
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
}

export function isValidUPI(upi) {
  if (!upi) return true; // optional field
  return /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
}

/** Returns { score: 0-4, label: string } based on real password strength, not a fake meter. */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "Empty" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4);
  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  return { score: clamped, label: labels[clamped] };
}

/**
 * Validates one step of the wizard. Returns { valid: boolean, errors: {field: message} }.
 * Field names must match the Form fields sent to POST /auth/register/owner exactly.
 */
export function validateOwnerStep(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (!isValidEmail(data.email)) errors.email = "Enter a valid email address.";
  if (!isValidPhone(data.phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (!isValidPin(data.pin)) errors.pin = "PIN must be exactly 4 digits.";
  if (data.pin !== data.confirmPin) errors.confirmPin = "PINs do not match.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateBusinessStep(data) {
  const errors = {};
  if (!data.store_name || data.store_name.trim().length < 2) errors.store_name = "Store name must be at least 2 characters.";
  if (!data.store_phone || !isValidPhone(data.store_phone)) errors.store_phone = "Enter a valid store phone number.";
  if (!isValidEmail(data.store_email)) errors.store_email = "Enter a valid store email.";
  if (!data.address || data.address.trim().length < 5) errors.address = "Enter a valid address.";
  if (!data.city) errors.city = "City is required.";
  if (!data.state) errors.state = "State is required.";
  if (!isValidPincode(data.pincode)) errors.pincode = "Enter a valid 6-digit pincode.";
  if (data.gst_number && !isValidGST(data.gst_number)) errors.gst_number = "Enter a valid GSTIN (15 characters).";
  if (data.pan_number && !isValidPAN(data.pan_number)) errors.pan_number = "Enter a valid PAN (10 characters).";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateBillingStep(data) {
  const errors = {};
  if (data.upi_id && !isValidUPI(data.upi_id)) errors.upi_id = "Enter a valid UPI ID (e.g. name@bank).";
  if (data.ifsc_code && !isValidIFSC(data.ifsc_code)) errors.ifsc_code = "Enter a valid IFSC code.";
  if (data.account_number && !/^\d{9,18}$/.test(data.account_number)) {
    errors.account_number = "Account number should be 9-18 digits.";
  }
  // Bank fields are optional individually, but if any one is filled, require the core trio together
  const hasAnyBankField = data.bank_name || data.account_number || data.ifsc_code;
  if (hasAnyBankField) {
    if (!data.bank_name) errors.bank_name = "Bank name is required if adding bank details.";
    if (!data.account_number) errors.account_number = errors.account_number || "Account number is required.";
    if (!data.ifsc_code) errors.ifsc_code = errors.ifsc_code || "IFSC code is required.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLogo(file) {
  if (!file) return { valid: true, error: null };
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Logo must be PNG, JPEG, or WebP." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: "Logo must be under 5MB." };
  }
  return { valid: true, error: null };
}