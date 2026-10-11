/**
 * Auth state hook: wraps login/logout/current-user and exposes
 * loading/error state for use in Login page and route guards.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  completePinSetup,
  login as loginApi,
  logout as logoutApi,
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
} from "../services/auth";

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated() && !user) {
      getCurrentUser()
        .then(setUser)
        .catch(() => logoutApi());
    }
  }, [user]);

  const login = useCallback(async (identifier, pin) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await loginApi(identifier, pin);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const message = err.response?.data?.detail || "Login failed. Check your credentials.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setupPin = useCallback(async (identifier, oneTimePin, newPin) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await completePinSetup(identifier, oneTimePin, newPin);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const message = err.response?.data?.detail || "Could not set your PIN. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(({ redirect = true } = {}) => {
    setUser(null);
    logoutApi();
    if (redirect) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    setupPin,
    logout,
    role: user?.role,
  };
}