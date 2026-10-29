import React from 'react';
import { Layers, Calendar, UserCheck, ExternalLink } from 'lucide-react';

interface Props {
  onRequestDemo: () => void;
  onOpenSignIn: () => void;
  currentUser: string | null;
  onSignOut: () => void;
}

export const Navbar: React.FC<Props> = ({
  onRequestDemo,
  onOpenSignIn,
  currentUser,
  onSignOut,
}) => {
  return (
    <header className="header">
      {/* Brand Logo - Clean horizontal line, no wrap */}
      <a
        href="#"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            background: 'var(--primary)',
            color: '#ffffff',
            padding: '0.45rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Layers size={18} />
        </div>
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: 'var(--text-main)',
            whiteSpace: 'nowrap',
          }}
        >
          Stitch<span style={{ color: 'var(--primary)' }}>Fin</span>
        </span>
      </a>

      {/* Clean SaaS Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="#how-it-works"
            className="tab-btn"
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.85rem', textDecoration: 'none', color: '#475569' }}
          >
            How It Works
          </a>
          <a
            href="#features"
            className="tab-btn"
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.85rem', textDecoration: 'none', color: '#475569' }}
          >
            Features
          </a>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="tab-btn"
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.85rem', textDecoration: 'none', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <span>API Docs</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Right CTA Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  color: '#334155',
                  background: '#f1f5f9',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                <UserCheck size={14} style={{ color: 'var(--success)' }} />
                <span>{currentUser.split('@')[0]}</span>
              </div>
              <button
                className="btn"
                onClick={onSignOut}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              className="btn"
              onClick={onOpenSignIn}
              style={{ fontSize: '0.85rem', fontWeight: 600 }}
            >
              Sign In
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={onRequestDemo}
            style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', whiteSpace: 'nowrap' }}
          >
            <Calendar size={14} />
            <span>Request Demo</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
