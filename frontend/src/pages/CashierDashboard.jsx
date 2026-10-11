import { Link } from "react-router-dom";
import {
  ArrowRight,
  AudioLines,
  CreditCard,
  LockKeyhole,
  Mic,
  Package,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import "./CashierDashboard.css";

export default function CashierDashboard() {
  const { user } = useAuthContext();
  const cashierName = user?.name || user?.email?.split("@")[0] || "Cashier";

  return (
    <div className="cashier-dashboard">
      <header className="cashier-welcome">
        <div className="cashier-welcome-copy">
          <span className="cashier-eyebrow"><span /> CASHIER WORKSPACE</span>
          <h1>Welcome, {cashierName}</h1>
          <p>Your billing tools are ready. Start a sale when you’re ready.</p>
        </div>
        <Link to="/billing" className="cashier-start-button">
          <ShoppingCart size={18} />
          Open Billing
          <ArrowRight size={17} />
        </Link>
      </header>

      <section className="cashier-dashboard-grid" aria-label="Cashier tools">
        <article className="cashier-tool-card cashier-billing-card">
          <span className="cashier-tool-icon"><ReceiptText size={21} /></span>
          <div>
            <p className="cashier-card-label">SALES COUNTER</p>
            <h2>Billing workspace</h2>
            <p className="cashier-card-description">
              Search the product catalog, build a customer bill, take payment, and issue a receipt.
            </p>
          </div>
          <Link to="/billing" className="cashier-card-link">
            Start a bill <ArrowRight size={15} />
          </Link>
        </article>

        <article className="cashier-tool-card">
          <span className="cashier-tool-icon cashier-voice-icon"><AudioLines size={21} /></span>
          <div>
            <p className="cashier-card-label">VOICE ASSIST</p>
            <h2>Hands-free item entry</h2>
            <p className="cashier-card-description">
              Use the voice assistant inside Billing to add recognized products to the current bill.
            </p>
          </div>
          <Link to="/billing" className="cashier-card-link">
            Go to billing <ArrowRight size={15} />
          </Link>
        </article>

        <article className="cashier-tool-card">
          <span className="cashier-tool-icon"><Package size={21} /></span>
          <div>
            <p className="cashier-card-label">PRODUCT CATALOG</p>
            <h2>Browse products</h2>
            <p className="cashier-card-description">
              Check product names, prices, and stock availability. Product changes are managed by an owner or manager.
            </p>
          </div>
          <Link to="/products" className="cashier-card-link">
            View products <ArrowRight size={15} />
          </Link>
        </article>
      </section>

      <section className="cashier-shift-panel">
        <div className="cashier-shift-heading">
          <span className="cashier-shift-icon"><Mic size={17} /></span>
          <div>
            <h2>Ready for your next sale?</h2>
            <p>Open the billing counter to add products and complete checkout.</p>
          </div>
        </div>
        <div className="cashier-shift-actions">
          <span><CreditCard size={15} /> Billing &amp; payments</span>
          <span><ReceiptText size={15} /> Receipts</span>
          <span><LockKeyhole size={15} /> Cashier access</span>
        </div>
      </section>
    </div>
  );
}
