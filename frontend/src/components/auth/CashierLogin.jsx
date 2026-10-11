/**
 * Cashier login — the fast-path login for the billing counter. Any
 * cashier account can use this screen; owner and manager accounts use
 * Manager Mode instead.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { ROLES } from "../../utils/permissions";
import LoginForm from "./LoginForm";
import PinSetupForm from "./PinSetupForm";

export default function CashierLogin() {
  const { login, setupPin, logout } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupCredential, setSetupCredential] = useState(null);

  const handleAuthenticated = (user) => {
    if (user.role !== ROLES.CASHIER) {
      logout({ redirect: false });
      setError("This is a manager or owner account. Choose Manager Mode to sign in.");
      return;
    }
    navigate("/cashier-dashboard");
  };

  const handleLogin = async (identifier, pin) => {
    setLoading(true);
    setError(null);
    try {
      handleAuthenticated(await login(identifier, pin));
    } catch (err) {
      if (err.response?.data?.detail === "PIN_SETUP_REQUIRED") {
        setSetupCredential({ identifier, pin });
      } else {
        setError(err.response?.data?.detail || "Sign-in failed. Check your staff ID and PIN.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinSetup = async (newPin) => {
    setLoading(true);
    setError(null);
    try {
      handleAuthenticated(await setupPin(setupCredential.identifier, setupCredential.pin, newPin));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not set your PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (setupCredential) {
    return (
      <PinSetupForm
        onSubmit={handlePinSetup}
        onCancel={() => {
          setSetupCredential(null);
          setError(null);
        }}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <LoginForm
      title="Cashier Login"
      subtitle="Sign in with your staff email or employee ID and PIN."
      accentColor="#047857"
      submitLabel="Sign in to billing"
      emailLabel="Staff email or employee ID"
      identifierType="text"
      pinLabel="4-digit PIN or one-time setup code"
      allowSetupCredential
      badge="Staff access"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
    />
  );
}