import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api/client';
import { ClaimListItem, ReconciliationSummary, UnmatchedRemittanceItem } from './types';
import { SummaryCards } from './components/SummaryCards';
import { ClaimsTable } from './components/ClaimsTable';
import { ClaimDetailModal } from './components/ClaimDetailModal';
import { UnmatchedRemittancesTable } from './components/UnmatchedRemittancesTable';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'claims' | 'unmatched'>('claims');

  // Summary state
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('checking');

  // Claims list state
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [totalClaims, setTotalClaims] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [payerFilter, setPayerFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [flagFilter, setFlagFilter] = useState<string>('');
  const [claimIdFilter, setClaimIdFilter] = useState<string>('');
  const [loadingClaims, setLoadingClaims] = useState<boolean>(true);

  // Unmatched remittances state
  const [unmatchedRemittances, setUnmatchedRemittances] = useState<UnmatchedRemittanceItem[]>([]);
  const [loadingUnmatched, setLoadingUnmatched] = useState<boolean>(false);

  // Selected claim detail modal state
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  // Error state
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Check health and load summary
  const loadInitialData = useCallback(() => {
    setGlobalError(null);

    api.getHealth()
      .then((res) => setHealthStatus(res.database === 'connected' ? 'connected' : 'degraded'))
      .catch(() => setHealthStatus('disconnected'));

    api.getSummary()
      .then((data) => setSummary(data))
      .catch((err) => setGlobalError(err.message || 'Failed to fetch summary metrics'));
  }, []);

  // Load claims with current filters and pagination
  const loadClaims = useCallback(() => {
    setLoadingClaims(true);
    api.getClaims({
      payer: payerFilter || undefined,
      status: statusFilter || undefined,
      flag: flagFilter || undefined,
      claim_id: claimIdFilter || undefined,
      page,
      page_size: pageSize,
    })
      .then((res) => {
        setClaims(res.items);
        setTotalClaims(res.total);
      })
      .catch((err) => {
        setGlobalError(err.message || 'Failed to fetch claims list');
      })
      .finally(() => setLoadingClaims(false));
  }, [payerFilter, statusFilter, flagFilter, claimIdFilter, page, pageSize]);

  // Load unmatched remittances
  const loadUnmatched = useCallback(() => {
    setLoadingUnmatched(true);
    api.getUnmatchedRemittances()
      .then((res) => {
        setUnmatchedRemittances(res.items);
      })
      .catch((err) => {
        setGlobalError(err.message || 'Failed to fetch unmatched remittances');
      })
      .finally(() => setLoadingUnmatched(false));
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    if (activeTab === 'unmatched') {
      loadUnmatched();
    }
  }, [activeTab, loadUnmatched]);

  const handleResetFilters = () => {
    setPayerFilter('');
    setStatusFilter('');
    setFlagFilter('');
    setClaimIdFilter('');
    setPage(1);
  };

  const handleKpiStatusClick = (status: string) => {
    setActiveTab('claims');
    setStatusFilter(status);
    setFlagFilter('');
    setPage(1);
  };

  const handleKpiFlagClick = (flag: string) => {
    setActiveTab('claims');
    setStatusFilter('');
    setFlagFilter(flag);
    setPage(1);
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="header">
        <div className="logo-group">
          <div className="logo-badge">STITCH FIN</div>
          <div>
            <h1 className="header-title">Claim Reconciliation & Audit Hub</h1>
            <p className="header-subtitle">Forward Deployed Engineering · Clinic Revenue Integrity Platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Health Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontWeight: 500,
              background:
                healthStatus === 'connected'
                  ? 'var(--success-bg)'
                  : healthStatus === 'checking'
                  ? '#f1f5f9'
                  : 'var(--danger-bg)',
              color:
                healthStatus === 'connected'
                  ? 'var(--success)'
                  : healthStatus === 'checking'
                  ? '#64748b'
                  : 'var(--danger)',
              border: `1px solid ${
                healthStatus === 'connected'
                  ? 'var(--success-border)'
                  : healthStatus === 'checking'
                  ? '#cbd5e1'
                  : 'var(--danger-border)'
              }`,
            }}
          >
            <Activity size={12} />
            <span>
              {healthStatus === 'connected'
                ? 'MySQL & API Online'
                : healthStatus === 'checking'
                ? 'Connecting...'
                : 'Service Offline'}
            </span>
          </div>

          <button
            className="btn"
            onClick={() => {
              loadInitialData();
              loadClaims();
              if (activeTab === 'unmatched') loadUnmatched();
            }}
            title="Refresh latest data from database"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="main-content">
        {/* Global Error Banner */}
        {globalError && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={18} />
              <span><strong>Connection Error:</strong> {globalError}</span>
            </div>
            <button className="btn" onClick={loadInitialData}>
              Retry Connection
            </button>
          </div>
        )}

        {/* Dashboard KPI Summary Cards */}
        {summary && (
          <SummaryCards
            summary={summary}
            onFilterStatus={handleKpiStatusClick}
            onFilterFlag={handleKpiFlagClick}
          />
        )}

        {/* Navigation Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
            onClick={() => setActiveTab('claims')}
          >
            Claims Reconciliation ({summary?.total_claims ?? '...'})
          </button>
          <button
            className={`tab-btn ${activeTab === 'unmatched' ? 'active' : ''}`}
            onClick={() => setActiveTab('unmatched')}
          >
            Unmatched Remittances ({summary?.unmatched_remittance_count ?? '...'})
          </button>
        </div>

        {/* Tab 1: Claims Reconciliation */}
        {activeTab === 'claims' && (
          <ClaimsTable
            claims={claims}
            total={totalClaims}
            page={page}
            pageSize={pageSize}
            payerFilter={payerFilter}
            statusFilter={statusFilter}
            flagFilter={flagFilter}
            claimIdFilter={claimIdFilter}
            isLoading={loadingClaims}
            onPageChange={(p) => setPage(p)}
            onPayerChange={(payer) => {
              setPayerFilter(payer);
              setPage(1);
            }}
            onStatusChange={(status) => {
              setStatusFilter(status);
              setPage(1);
            }}
            onFlagChange={(flag) => {
              setFlagFilter(flag);
              setPage(1);
            }}
            onClaimIdChange={(id) => {
              setClaimIdFilter(id);
              setPage(1);
            }}
            onResetFilters={handleResetFilters}
            onSelectClaim={(id) => setSelectedClaimId(id)}
          />
        )}

        {/* Tab 2: Unmatched Remittances */}
        {activeTab === 'unmatched' && (
          <UnmatchedRemittancesTable
            items={unmatchedRemittances}
            isLoading={loadingUnmatched}
          />
        )}
      </main>

      {/* Claim Detail Drawer / Modal */}
      {selectedClaimId && (
        <ClaimDetailModal
          claimId={selectedClaimId}
          onClose={() => setSelectedClaimId(null)}
        />
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--neutral-border)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', background: '#fff' }}>
        Stitch Financial Take-Home Assessment · Forward Deployed Engineer Assignment · Built with FastAPI, MySQL, React, and Strict Financial Precision
      </footer>
    </div>
  );
};
