import React from 'react';
import { Layers, ShieldCheck, Lock } from 'lucide-react';

interface Props {
  onRequestDemo: () => void;
  onOpenSignIn: () => void;
}

export const Footer: React.FC<Props> = ({ onRequestDemo, onOpenSignIn }) => {
  return (
    <footer style={{ background: '#ffffff', borderTop: '1px solid var(--neutral-border)', padding: '3.5rem 2rem 2rem 2rem', marginTop: '4rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div className="logo-badge" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
              <Layers size={15} />
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.5px' }}>STITCH FIN</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '320px' }}>
            Enterprise claim reconciliation and revenue integrity platform built for healthcare practices, surgery centers, and clinical billing networks.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', color: '#64748b', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
              <span>HIPAA Compliant</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Lock size={14} style={{ color: 'var(--primary)' }} />
              <span>SOC-2 Certified</span>
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px', marginBottom: '1rem' }}>
            Platform Features
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <li>3-Way Settlement Ledger</li>
            <li>Denial Appeal Playbooks (CO-*)</li>
            <li>Unmatched Remittance Quarantine</li>
            <li>Audit-Ready CSV Export</li>
            <li>Deterministic Integer Arithmetic</li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px', marginBottom: '1rem' }}>
            Clinical Operations
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <li>
              <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How It Works</a>
            </li>
            <li>
              <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Feature Architecture</a>
            </li>
            <li>
              <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>
                Frequently Asked Questions
              </a>
            </li>
            <li>
              <button onClick={onOpenSignIn} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 'inherit' }}>
                Clinic Specialist Sign In
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px', marginBottom: '1rem' }}>
            Enterprise Pilot
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
            Ready to test your practice's 835 remittances against our reconciliation engine?
          </p>
          <button className="btn btn-primary" onClick={onRequestDemo} style={{ width: '100%', justifyContent: 'center' }}>
            <span>Schedule Custom Demo</span>
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div>
          © {new Date().getFullYear()} Stitch Financial Inc. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Security & Compliance</span>
        </div>
      </div>
    </footer>
  );
};
