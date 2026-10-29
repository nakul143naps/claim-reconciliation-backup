import React from 'react';
import { Layers, Calendar, UserCheck } from 'lucide-react';

interface Props {
  currentTab: 'hub' | 'unmatched';
  onSelectTab: (tab: 'hub' | 'unmatched') => void;
  onRequestDemo: () => void;
  onOpenSignIn: () => void;
  currentUser: string | null;
  onSignOut: () => void;
  totalUnmatchedCount?: number;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  onRequestDemo,
  onOpenSignIn,
  currentUser,
  onSignOut,
  totalUnmatchedCount = 1,
}) => {
  return (
    <header className="header">
      <div className="logo-group">
        <div className="logo-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }} onClick={() => onSelectTab('hub')}>
          <Layers size={18} />
          <span>STITCH FIN</span>
        </div>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.15rem' }}>Claims Reconciliation & Revenue Integrity</h1>
          <p className="header-subtitle" style={{ fontSize: '0.75rem' }}>Enterprise Healthcare Financial Settlement</p>
        </div>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={`tab-btn ${currentTab === 'hub' ? 'active' : ''}`}
            onClick={() => onSelectTab('hub')}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
          >
            Reconciliation Hub
          </button>
          <button
            className={`tab-btn ${currentTab === 'unmatched' ? 'active' : ''}`}
            onClick={() => onSelectTab('unmatched')}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>Unmatched Remittances</span>
            {totalUnmatchedCount > 0 && (
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>
                {totalUnmatchedCount}
              </span>
            )}
          </button>
          <a
            href="#how-it-works"
            className="tab-btn"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem', textDecoration: 'none', color: 'inherit' }}
          >
            How It Works
          </a>
          <a
            href="#features"
            className="tab-btn"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem', textDecoration: 'none', color: 'inherit' }}
          >
            Features
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#334155', background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '9999px' }}>
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
            style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
          >
            <Calendar size={14} />
            <span>Request Demo</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
