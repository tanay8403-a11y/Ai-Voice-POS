
import { Route } from "react-router-dom";

import Billing from "../pages/Billing";

export default function CashierRoutes() {
  return (
    <>
      <Route path="billing" element={<Billing />} />
    </>
  );
}