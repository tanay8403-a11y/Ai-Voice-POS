/**
 * Shared authenticated app shell with the horizontal top navigation from the
 * supplied mockup. Login and registration routes should remain outside this shell.
 */

import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import "./AppLayout.css";

export default function AppLayout() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
