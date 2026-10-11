/**
 * Global toast notification component. Simple context-free version —
 * mount <NotificationProvider> once at the App root and call
 * useNotify() anywhere to push a toast.
 */

import { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext(null);

let idCounter = 0;

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = "info", duration = 4000) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div className="notification-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`notification notification-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotify must be used within a NotificationProvider");
  }
  return context;
}