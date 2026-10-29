import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api/client';
import { ClaimListItem, ReconciliationSummary, UnmatchedRemittanceItem } from './types';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SummaryCards } from './components/SummaryCards';
import { ClaimsTable } from './components/ClaimsTable';
import { ClaimDetailModal } from './components/ClaimDetailModal';
import { UnmatchedRemittancesTable } from './components/UnmatchedRemittancesTable';
import { HowItWorksSection } from './components/HowItWorksSection';
import { FeaturesSection } from './components/FeaturesSection';
import { Footer } from './components/Footer';
import { RequestDemoModal } from './components/RequestDemoModal';
import { SignInModal } from './components/SignInModal';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation tabs: 'hub' (main ledger) or 'unmatched' (orphaned queue)
  const [activeTab, setActiveTab] = useState<'hub' | 'unmatched'>('hub');

  // Modals state
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>('sarah.jenkins@metrohealth.org');

  // Summary state
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);

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

  // Load summary
  const loadInitialData = useCallback(() => {
    setGlobalError(null);

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
    setActiveTab('hub');
    setStatusFilter(status);
    setFlagFilter('');
    setPage(1);
    scrollToLedger();
  };

  const handleKpiFlagClick = (flag: string) => {
    setActiveTab('hub');
    setStatusFilter('');
    setFlagFilter(flag);
    setPage(1);
    scrollToLedger();
  };

  const scrollToLedger = () => {
    document.getElementById('reconciliation-ledger')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        onRequestDemo={() => setIsDemoModalOpen(true)}
        onOpenSignIn={() => setIsSignInModalOpen(true)}
        currentUser={currentUser}
        onSignOut={() => setCurrentUser(null)}
      />

      {/* Main SaaS Content */}
      <main className="main-content">
        {/* Global Error Alert */}
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
              <span><strong>Connection Notice:</strong> {globalError}</span>
            </div>
            <button className="btn" onClick={loadInitialData}>
              Retry Connection
            </button>
          </div>
        )}

        {/* Hero Section */}
        <HeroSection
          onScrollToLedger={scrollToLedger}
          onRequestDemo={() => setIsDemoModalOpen(true)}
        />

        {/* Live Reconciliation Ledger & KPI Cards Section */}
        <div id="reconciliation-ledger" style={{ paddingTop: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                Live Settlement Ledger
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                {activeTab === 'hub' ? 'Claims Reconciliation Workspace' : 'Unmatched Remittance Advice Queue'}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn"
                onClick={() => {
                  loadInitialData();
                  loadClaims();
                  if (activeTab === 'unmatched') loadUnmatched();
                }}
                title="Refresh latest ledger records"
              >
                <RefreshCw size={13} />
                <span>Refresh Live Data</span>
              </button>
            </div>
          </div>

          {/* Dashboard KPI Summary Cards */}
          {summary && (
            <SummaryCards
              summary={summary}
              onFilterStatus={handleKpiStatusClick}
              onFilterFlag={handleKpiFlagClick}
            />
          )}

          {/* Workspace Sub-Tabs for Claims vs Unmatched Remittances */}
          <div className="tabs" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`tab-btn ${activeTab === 'hub' ? 'active' : ''}`}
              onClick={() => setActiveTab('hub')}
            >
              Claims Reconciliation ({summary?.total_claims ?? '...'})
            </button>
            <button
              className={`tab-btn ${activeTab === 'unmatched' ? 'active' : ''}`}
              onClick={() => setActiveTab('unmatched')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>Unmatched Remittances Queue</span>
              {(summary?.unmatched_remittance_count ?? 0) > 0 && (
                <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {summary?.unmatched_remittance_count}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Claims Reconciliation Ledger */}
          {activeTab === 'hub' && (
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

          {/* Tab 2: Unmatched Remittances Review Queue */}
          {activeTab === 'unmatched' && (
            <UnmatchedRemittancesTable
              items={unmatchedRemittances}
              isLoading={loadingUnmatched}
            />
          )}
        </div>

        {/* How It Works Section (Inspired by ClaimBook / RevSync) */}
        <HowItWorksSection />

        {/* Features Showcase Section */}
        <FeaturesSection />
      </main>

      {/* Footer */}
      <Footer
        onRequestDemo={() => setIsDemoModalOpen(true)}
        onOpenSignIn={() => setIsSignInModalOpen(true)}
      />

      {/* Claim Detail Modal */}
      {selectedClaimId && (
        <ClaimDetailModal
          claimId={selectedClaimId}
          onClose={() => setSelectedClaimId(null)}
        />
      )}

      {/* Request Demo Popup Modal */}
      <RequestDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />

      {/* Sign In Popup Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onSuccess={(email) => setCurrentUser(email)}
      />
    </div>
  );
};
