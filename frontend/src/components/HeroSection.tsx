import React from 'react';
import { ArrowDown, CheckCircle2, Shield, Sparkles, TrendingUp, Zap } from 'lucide-react';

interface Props {
  onScrollToLedger: () => void;
  onRequestDemo: () => void;
}

export const HeroSection: React.FC<Props> = ({ onScrollToLedger, onRequestDemo }) => {
  return (
    <section className="hero-banner">
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: 'var(--primary)', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.775rem', fontWeight: 600, border: '1px solid #bfdbfe', marginBottom: '1.25rem' }}>
        <Sparkles size={14} />
        <span>Next-Generation Healthcare Revenue Cycle & Claim Settlement Engine</span>
      </div>

      <h1 className="hero-heading">
        Automate Claims Reconciliation. <br />
        <span style={{ color: 'var(--primary)' }}>Stop Revenue Leakage.</span>
      </h1>

      <p className="hero-subheading">
        Stitch Fin delivers complete financial transparency between submitted charges and payer cash remittances. Eliminate manual Excel reconciliation, catch underpayments instantly, and retain complete denial audit trails without rounding errors.
      </p>

      {/* Feature Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', margin: '1.5rem 0 2rem 0' }}>
        <div className="hero-pill">
          <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
          <span>Zero Calculation &amp; Rounding Errors</span>
        </div>
        <div className="hero-pill">
          <Shield size={14} style={{ color: 'var(--primary)' }} />
          <span>Instant Payer Denial Tracking</span>
        </div>
        <div className="hero-pill">
          <Zap size={14} style={{ color: '#d97706' }} />
          <span>Unmatched Payer Cash Protection</span>
        </div>
        <div className="hero-pill">
          <TrendingUp size={14} style={{ color: '#0284c7' }} />
          <span>Automatic Underpayment Detection</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={onScrollToLedger}
          style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: 600 }}
        >
          <span>Explore Live Audit Ledger</span>
          <ArrowDown size={16} />
        </button>

        <button
          className="btn"
          onClick={onRequestDemo}
          style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: 600, background: '#ffffff' }}
        >
          <span>Request Custom Demo</span>
        </button>
      </div>
    </section>
  );
};
