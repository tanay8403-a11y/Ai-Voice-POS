import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AudioLines,
  Check,
  Cloud,
  Command,
  LockKeyhole,
  Mic,
  ReceiptText,
  ShieldCheck,
  Zap,
} from "lucide-react";

import OwnerLogin from "../components/auth/OwnerLogin";
import CashierLogin from "../components/auth/CashierLogin";
import "./Login.css";

const waveformHeights = [
  12, 20, 15, 27, 18, 31, 13, 23, 17, 28, 11, 21, 15, 32, 18, 25, 12, 29,
  16, 22, 13, 30, 19, 26, 14, 21, 11, 28, 17, 24, 13, 31, 18, 23, 12, 27,
  16, 22, 14, 29,
];

const metrics = [
  { icon: Zap, value: "1.2s", label: "Fast billing cycle", accent: "orange" },
  { icon: Activity, value: "99.8%", label: "Voice item accuracy", accent: "ink" },
  { icon: ReceiptText, value: "Instant", label: "UPI QR & GST", accent: "green" },
];

export default function Login({ initialMode = "cashier" }) {
  const [mode, setMode] = useState(initialMode);

  return (
    <main className="login-page">
      <header className="login-topbar">
        <Link to="/login" className="login-brand" aria-label="Voice AI POS home">
          <span className="login-brand-mark">
            <AudioLines size={18} />
          </span>
          <span>Voice AI</span>
          <span className="login-pos-tag">POS</span>
        </Link>

        <div className="login-topbar-status">
          <span className="login-status-dot" />
          <span>Secure terminal sign-in</span>
        </div>
      </header>

      <div className="login-workspace">
        <section className="login-overview" aria-labelledby="login-heading">
          <div className="login-overview-content">
            <div className="login-edition-chip">
              <span className="login-orange-dot" />
              Acoustic beamforming matrix
              <span className="login-chip-divider">•</span>
              Boutique edition
            </div>
            <p className="login-version">VOICE POS / 4.8.2</p>

            <h1 id="login-heading">
              Natural conversational billing for fast, human checkout.
            </h1>
            <p className="login-intro">
              Zero-tap item parsing, instant GST computation, and continuous
              voice telemetry built for busy retail storefronts.
            </p>

            <div className="login-listening-card">
              <div className="login-listening-header">
                <span className="login-mic-icon">
                  <Mic size={17} />
                </span>
                <div>
                  <p className="login-card-title">Continuous voice listening</p>
                  <p className="login-muted-copy">
                    Hardware array calibrated · Low ambient SNR threshold
                  </p>
                </div>
                <span className="login-live-pill">
                  <span className="login-status-dot" />
                  Active mic
                </span>
              </div>

              <div className="login-waveform" aria-label="Voice activity animation">
                {waveformHeights.map((height, index) => (
                  <span
                    key={index}
                    style={{
                      height: `${height}px`,
                      animationDelay: `${(index % 9) * 90}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="login-transcript">
                <span className="login-transcript-arrow">&gt;</span>
                <span className="login-transcript-text">
                  “Add two cold brews and one croissant to the bill”
                </span>
                <span className="login-transcript-result">
                  <Check size={12} />
                  3 items matched
                </span>
              </div>
            </div>

            <div className="login-metrics">
              {metrics.map(({ icon: Icon, value, label, accent }, index) => (
                <article
                  className="login-metric-card"
                  key={value}
                  style={{ animationDelay: `${180 + index * 100}ms` }}
                >
                  <Icon className={`login-metric-icon ${accent}`} size={16} />
                  <p className="login-metric-label">
                    {index === 0
                      ? "Response"
                      : index === 1
                        ? "ASR model"
                        : "Settlement"}
                  </p>
                  <p className="login-metric-value">{value}</p>
                  <p className="login-metric-caption">{label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="login-overview-footer">
            <span><span className="login-status-dot" /> Thermal printer ready</span>
            <span><span className="login-status-dot" /> Scanner paired</span>
            <span className="login-compliance"><ShieldCheck size={13} /> GST-ready & secure</span>
          </div>
        </section>

        <section className="login-terminal" aria-labelledby="terminal-heading">
          <div className="login-terminal-heading">
            <div>
              <h2 id="terminal-heading">Terminal Sign-In</h2>
              <p>Unlock your console to begin the shift</p>
            </div>
            <span className="login-terminal-icon" aria-hidden="true">
              <Command size={17} />
            </span>
          </div>

          <div className="login-role-switch" aria-label="Choose sign-in role">
            <button
              type="button"
              onClick={() => setMode("cashier")}
              aria-pressed={mode === "cashier"}
              className={mode === "cashier" ? "active" : ""}
            >
              <ReceiptText size={13} />
              Cashier role
            </button>
            <button
              type="button"
              onClick={() => setMode("owner")}
              aria-pressed={mode === "owner"}
              className={mode === "owner" ? "active" : ""}
            >
              <ShieldCheck size={13} />
              Manager mode
            </button>
          </div>

          <div className="login-terminal-meta">
            <span className="login-form-label">Assigned POS terminal</span>
            <div className="login-terminal-ready">
              <span className="login-terminal-ready-icon">
                <Command size={15} />
              </span>
              <span>
                <strong>POS terminal</strong>
                <small><span className="login-status-dot" /> Ready for sign-in</small>
              </span>
              <span className="login-ready-check"><Check size={14} /></span>
            </div>
          </div>

          <div className="login-form-panel" key={mode}>
            {mode === "owner" ? <OwnerLogin /> : <CashierLogin />}
          </div>

          <div className="login-terminal-footer">
            <p>
              New to Voice AI POS?{" "}
              <Link to="/register">Register your business</Link>
            </p>
            <span><LockKeyhole size={12} /> Secure sign-in · GST-ready retail</span>
          </div>
        </section>
      </div>

      <footer className="login-page-footer">
        <span><ShieldCheck size={13} /> GST & e-Invoice ready</span>
        <span><LockKeyhole size={13} /> 256-bit terminal isolation</span>
        <span><Cloud size={13} /> Secure cloud sync</span>
        <span className="login-latency">VOICE AI POS · ALL SYSTEMS READY</span>
      </footer>
    </main>
  );
}
