/**
 * Owner/Admin login — after authenticating, verifies the account actually
 * has admin/manager privileges before allowing entry to the Owner Dashboard.
 * A cashier account attempting owner login is rejected with a clear message,
 * even though their credentials are valid — this is a UX guard only,
 * the backend's role checks remain the real enforcement.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { isManagerOrAdmin } from "../../utils/permissions";
import LoginForm from "./LoginForm";
import PinSetupForm from "./PinSetupForm";

export default function OwnerLogin() {
  const { login, setupPin, logout } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupCredential, setSetupCredential] = useState(null);

  const handleAuthenticated = (user) => {
    if (!isManagerOrAdmin(user.role)) {
      logout({ redirect: false });
      setError("This account doesn't have owner/manager access. Use the cashier login instead.");
      return;
    }
    navigate("/dashboard");
  };

  const handleLogin = async (email, pin) => {
    setLoading(true);
    setError(null);
    try {
      handleAuthenticated(await login(email, pin));
    } catch (err) {
      if (err.response?.data?.detail === "PIN_SETUP_REQUIRED") {
        setSetupCredential({ email, pin });
      } else {
        setError(err.response?.data?.detail || "Sign-in failed. Check your email and PIN.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinSetup = async (newPin) => {
    setLoading(true);
    setError(null);
    try {
      const user = await setupPin(setupCredential.email, setupCredential.pin, newPin);
      handleAuthenticated(user);
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
      title="Owner Login"
      subtitle="Sign in with your business email and owner PIN."
      accentColor="#0B1E4A"
      submitLabel="Sign in as owner"
      emailLabel="Business email"
      pinLabel="4-digit PIN or setup credential"
      allowSetupCredential
      securityNote="Role-based access keeps owner and manager tools available to authorized accounts."
      onSubmit={handleLogin}
      loading={loading}
      error={error}
    />
  );
}