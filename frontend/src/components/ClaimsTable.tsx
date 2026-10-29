import React, { useState, useRef, useEffect } from 'react';
import { ClaimListItem } from '../types';
import { formatCurrency, formatRawCents } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { FlagBadge } from './FlagBadge';
import { api } from '../api/client';
import { ChevronLeft, ChevronRight, Download, Eye, RotateCcw, Search, ChevronDown, FileText, Printer } from 'lucide-react';

interface Props {
  claims: ClaimListItem[];
  total: number;
  page: number;
  pageSize: number;
  payerFilter: string;
  statusFilter: string;
  flagFilter: string;
  claimIdFilter: string;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onPayerChange: (payer: string) => void;
  onStatusChange: (status: string) => void;
  onFlagChange: (flag: string) => void;
  onClaimIdChange: (claimId: string) => void;
  onResetFilters: () => void;
  onSelectClaim: (claimId: string) => void;
}

export const ClaimsTable: React.FC<Props> = ({
  claims,
  total,
  page,
  pageSize,
  payerFilter,
  statusFilter,
  flagFilter,
  claimIdFilter,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onPayerChange,
  onStatusChange,
  onFlagChange,
  onClaimIdChange,
  onResetFilters,
  onSelectClaim,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCsv = () => {
    setIsExportMenuOpen(false);
    window.open(api.getExportUrl('csv'), '_blank');
  };

  const handleExportJson = () => {
    setIsExportMenuOpen(false);
    window.open(api.getExportUrl('json'), '_blank');
  };

  const handlePrintPdf = () => {
    setIsExportMenuOpen(false);
    window.print();
  };

  return (
    <div className="card">
      <div className="filter-bar">
        <div className="filter-inputs">
          {/* Claim ID & Patient search */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Claim ID / Patient..."
              value={claimIdFilter}
              onChange={(e) => onClaimIdChange(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '32px', width: '220px' }}
            />
          </div>

          {/* Payer Filter */}
          <select
            value={payerFilter}
            onChange={(e) => onPayerChange(e.target.value)}
            className="select-field"
          >
            <option value="">All Payers</option>
            <option value="Northwind Health">Northwind Health</option>
            <option value="Cedar Mutual">Cedar Mutual</option>
            <option value="Harbor Plan">Harbor Plan</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="select-field"
          >
            <option value="">All Statuses</option>
            <option value="balanced">Balanced</option>
            <option value="unbalanced">Unbalanced</option>
            <option value="no_remittance">No Remittance</option>
          </select>

          {/* Operational Flag Filter */}
          <select
            value={flagFilter}
            onChange={(e) => onFlagChange(e.target.value)}
            className="select-field"
          >
            <option value="">All Operational Flags</option>
            <option value="denial_history">Denial History (CO-*)</option>
            <option value="payment_exceeds_billed">Payment &gt; Billed</option>
            <option value="payer_mismatch">Payer Mismatch</option>
          </select>

          {/* Reset Filters */}
          {(payerFilter || statusFilter || flagFilter || claimIdFilter) && (
            <button className="btn" onClick={onResetFilters} title="Reset all active filters">
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Entries per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="select-field"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', height: '32px' }}
              title="Select number of entries per page"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing <strong>{claims.length}</strong> of <strong>{total}</strong> claims
          </div>

          {/* Multi-Format Export Dropdown */}
          <div style={{ position: 'relative' }} ref={exportDropdownRef}>
            <button
              className="btn btn-primary"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              title="Export complete reconciliation audit ledger in multiple formats"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={14} />
              <span>Export Ledger</span>
              <ChevronDown size={14} style={{ transform: isExportMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {isExportMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  background: '#ffffff',
                  border: '1px solid var(--neutral-border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                  width: '230px',
                  zIndex: 40,
                  overflow: 'hidden',
                  padding: '0.4rem',
                }}
              >
                <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  Select Export Format
                </div>

                <button
                  onClick={handleExportCsv}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText size={16} style={{ color: 'var(--success)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>CSV Format (.csv)</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Excel & Sheets audit trail</div>
                  </div>
                </button>

                <button
                  onClick={handleExportJson}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Download size={16} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>JSON Format (.json)</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ERP & clearinghouse integration</div>
                  </div>
                </button>

                <button
                  onClick={handlePrintPdf}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Printer size={16} style={{ color: '#6366f1' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Print / Save PDF</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Formatted clinical ledger</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>Loading claims data...</p>
        </div>
      ) : claims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No matching claims found</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>Try clearing or adjusting your search filters above.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Payer</th>
                <th className="text-right">Billed</th>
                <th className="text-right">Paid Cash</th>
                <th className="text-right">Adjusted</th>
                <th className="text-right">Patient Resp</th>
                <th className="text-right">Difference</th>
                <th className="text-center">Status</th>
                <th>Flags</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.claim_id} onClick={() => onSelectClaim(claim.claim_id)}>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {claim.claim_id}
                  </td>
                  <td>{claim.payer}</td>
                  <td className="text-right font-mono">
                    <div>{formatCurrency(claim.billed_cents)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatRawCents(claim.billed_cents)}</div>
                  </td>
                  <td className="text-right font-mono" style={{ color: claim.paid_cents > 0 ? 'var(--primary)' : 'inherit' }}>
                    {formatCurrency(claim.paid_cents)}
                  </td>
                  <td className="text-right font-mono" style={{ color: claim.adjustment_cents > 0 ? '#475569' : 'inherit' }}>
                    {formatCurrency(claim.adjustment_cents)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(claim.patient_responsibility_cents)}
                  </td>
                  <td className="text-right font-mono">
                    {claim.difference_cents === null ? (
                      <span style={{ color: '#94a3b8' }} title="No remittance received: difference is undefined">—</span>
                    ) : (
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            claim.difference_cents === 0
                              ? 'var(--success)'
                              : claim.difference_cents < 0
                              ? 'var(--danger)'
                              : 'var(--warning)',
                        }}
                      >
                        {formatCurrency(claim.difference_cents)}
                      </span>
                    )}
                  </td>
                  <td className="text-center">
                    <StatusBadge status={claim.status} />
                  </td>
                  <td>
                    {claim.flags.length > 0 ? (
                      <div>
                        {claim.flags.map((f) => (
                          <FlagBadge key={f} flag={f} />
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>
                  <td className="text-center">
                    <button
                      className="btn"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClaim(claim.claim_id);
                      }}
                    >
                      <Eye size={12} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      <div className="pagination-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total claims)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Entries per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="select-field"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.825rem', height: '30px' }}
              title="Change number of claims displayed per page"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>
          <button
            className="btn"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
