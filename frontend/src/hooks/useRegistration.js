/**
 * Owns the registration form state, validation, and final submission.
 * Form sections share this state so every value is validated and submitted
 * together from the single-page registration screen.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  validateOwnerStep, validateBusinessStep, validateBillingStep, validateLogo,
} from "../utils/validation";
import { registerOwner } from "../services/authServices";

const initialData = {
  // Owner
  name: "", email: "", phone: "", pin: "", confirmPin: "",

  // Business (Store required fields)
  store_name: "", store_phone: "", store_email: "",
  address: "", city: "", state: "", pincode: "",
  business_type: "Retail", country: "India",
  gst_number: "", pan_number: "",

  // Billing (Store optional fields)
  alternate_phone: "", website: "",
  upi_id: "", bank_name: "", account_holder: "", account_number: "", ifsc_code: "",
  default_tax: 18, currency: "INR", timezone: "Asia/Kolkata",
};

export function useRegistration() {
  const [data, setData] = useState(initialData);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const navigate = useNavigate();

  const updateField = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setLogo = useCallback((file) => {
    const { valid, error } = validateLogo(file);
    if (!valid) {
      setErrors((prev) => ({ ...prev, logo: error }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.logo;
      return next;
    });
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }, []);

  const submit = useCallback(async () => {
    const validationErrors = {
      ...validateOwnerStep(data).errors,
      ...validateBusinessStep(data).errors,
      ...validateBillingStep(data).errors,
      ...(errors.logo ? { logo: errors.logo } : {}),
    };
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return false;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { confirmPin, ...payload } = data;
      await registerOwner(payload, logoFile);
      navigate("/login");
      return true;
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Registration failed. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [data, errors.logo, logoFile, navigate]);

  return {
    data,
    errors,
    logoFile,
    logoPreview,
    submitting,
    submitError,
    updateField,
    setLogo,
    submit,
  };
}