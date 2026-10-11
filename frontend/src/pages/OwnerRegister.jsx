/**
 * Full-page owner and store registration form. The registration status
 * check prevents users from filling the form when owner setup is closed.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AudioLines,
  ArrowRight,
  Check,
  Clock3,
  Command,
  CreditCard,
  LockKeyhole,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useRegistration } from "../hooks/useRegistration";
import OwnerDetails from "../components/registration/OwnerDetails";
import BusinessDetails from "../components/registration/BusinessDetails";
import BillingDetails from "../components/registration/BillingDetails";
import api from "../services/api";
import "./OwnerRegister.css";

const SETUP_SECTIONS = [
  { number: "01", label: "Owner account", target: "owner-account" },
  { number: "02", label: "Store profile", target: "store-profile" },
  { number: "03", label: "Location", target: "store-location" },
  { number: "04", label: "GST & billing", target: "billing-tax" },
];

export default function OwnerRegister() {
  const reg = useRegistration();
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [registrationClosed, setRegistrationClosed] = useState(false);

  useEffect(() => {
    api
      .get("/auth/registration-status")
      .then((res) => setRegistrationClosed(!res.data.registration_open))
      .catch(() => setRegistrationClosed(false))
      .finally(() => setCheckingAvailability(false));
  }, []);

  if (checkingAvailability) {
    return (
      <div className="register-loading">
        <span className="register-loading-mark"><Command size={20} /></span>
        <p>Checking registration status…</p>
      </div>
    );
  }

  if (registrationClosed) {
    return (
      <div className="register-page">
        <RegistrationHeader />
        <main className="register-closed">
          <span className="register-closed-icon"><LockKeyhole size={22} /></span>
          <h1>Registration is closed</h1>
          <p>
            A store is already set up on this system. If you're staff, ask your admin to create your account instead.
          </p>
          <Link to="/login" className="register-primary-link">
            Go to Login
          </Link>
        </main>
      </div>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    reg.submit();
  };

  return (
    <div className="register-page">
      <RegistrationHeader />

      <section className="register-hero">
        <div className="register-hero-copy">
          <span className="register-eyebrow">
            <span className="register-orange-dot" /> Merchant self-serve setup
            <span className="register-eyebrow-divider">•</span>
            <Clock3 size={12} /> About 4–6 min
          </span>
          <h1>Store Registration &amp; Voice Terminal Provisioning</h1>
          <p>Configure your billing ledger, tax details, and owner access for your store.</p>
        </div>
        <div className="register-progress" aria-label="Registration sections">
          {SETUP_SECTIONS.map(({ number, label, target }) => (
            <a href={`#${target}`} key={number}>
              <span>{number}</span>{label}
            </a>
          ))}
        </div>
      </section>

      <main className="register-layout">
        <form onSubmit={handleSubmit} className="register-form">
          <section id="owner-account" className="register-card register-owner-card">
            <div className="register-card-heading">
              <span className="register-card-icon"><ShieldCheck size={17} /></span>
              <div>
                <h2>Owner Account</h2>
                <p>Your sign-in details and primary contact information</p>
              </div>
              <span className="register-card-tag">01 / ACCOUNT</span>
            </div>
            <OwnerDetails data={reg.data} errors={reg.errors} updateField={reg.updateField} />
          </section>

          <div id="store-profile" className="register-card-group">
            <BusinessDetails
              data={reg.data}
              errors={reg.errors}
              updateField={reg.updateField}
              logoPreview={reg.logoPreview}
              onLogoSelect={reg.setLogo}
              onLogoRemove={() => reg.setLogo(null)}
            />
          </div>

          <div id="billing-tax" className="register-card-group">
            <BillingDetails data={reg.data} errors={reg.errors} updateField={reg.updateField} />
          </div>

          {reg.submitError && (
            <div role="alert" className="register-submit-error">
              <span><Activity size={16} /></span>{reg.submitError}
            </div>
          )}

          <div className="register-actions">
            <Link to="/login" className="register-cancel">Cancel</Link>
            <button type="submit" disabled={reg.submitting} className="register-submit">
              {reg.submitting ? "Creating your store…" : "Create Store & Continue"}
              {!reg.submitting && <ArrowRight size={16} />}
            </button>
          </div>
        </form>

        <aside className="register-aside">
          <section className="register-engine-card">
            <div className="register-engine-heading">
              <span className="register-engine-icon"><Mic size={17} /></span>
              <div>
                <h2>Continuous Voice Listening</h2>
                <p>Demo waveform · Voice billing available after setup</p>
              </div>
              <span className="register-engine-badge">
                <span className="register-status-dot" />
                Mic preview
              </span>
            </div>
            <div className="register-waveform" role="img" aria-label="Animated voice waveform demo">
              {[12, 20, 15, 27, 17, 30, 13, 23, 17, 26, 12, 21, 16, 28, 14, 24, 18, 29, 13, 22, 16, 27, 12, 20, 15, 30, 18, 24, 13, 22, 17, 28].map((height, index) => (
                <span key={index} style={{ height: `${height}px`, animationDelay: `${(index % 8) * 90}ms` }} />
              ))}
            </div>
            <div className="register-speech-sample">
              <span className="register-transcript-arrow">&gt;</span>
              <p>“Add two cold brews and one croissant to the bill”</p>
              <span className="register-transcript-result"><Check size={12} /> 3 items matched</span>
            </div>
          </section>

          <section className="register-includes-card">
            <div className="register-aside-title">
              <div>
                <span className="register-mini-label">YOUR WORKSPACE</span>
                <h2>Everything in one POS</h2>
              </div>
              <Sparkles size={17} />
            </div>
            <ul>
              {[
                { icon: AudioLines, text: "Voice-assisted product billing" },
                { icon: Store, text: "Inventory and restock management" },
                { icon: Users, text: "Staff roles and access controls" },
                { icon: CreditCard, text: "Sales and payment tracking" },
              ].map(({ icon: Icon, text }) => (
                <li key={text}>
                  <span><Check size={13} /></span><Icon size={15} />{text}
                </li>
              ))}
            </ul>
            <div className="register-aside-note">
              <LockKeyhole size={14} />
              <p><strong>Your information stays protected.</strong><br />Complete the required fields to create your owner account and store.</p>
            </div>
          </section>
        </aside>
      </main>

      <footer className="register-footer">
        <span><ShieldCheck size={13} /> Secure account setup</span>
        <span><CreditCard size={13} /> GST &amp; payment settings</span>
        <span><Store size={13} /> Store profile provisioning</span>
        <span className="register-footer-status"><span className="register-status-dot" /> READY TO CONFIGURE</span>
      </footer>
    </div>
  );
}

function RegistrationHeader() {
  return (
    <header className="register-header">
      <Link to="/login" className="register-brand">
        <span className="register-brand-mark"><AudioLines size={17} /></span>
        <span>Voice AI</span>
        <span className="register-pos-tag">POS</span>
      </Link>
      <nav className="register-header-nav" aria-label="Product sections">
        <a href="#owner-account">Account</a>
        <a href="#store-profile">Store profile</a>
        <a href="#billing-tax">GST &amp; billing</a>
      </nav>
      <div className="register-header-signin">
        <span>Already registered?</span>
        <Link to="/login">Sign in <ArrowRight size={13} /></Link>
      </div>
    </header>
  );
}