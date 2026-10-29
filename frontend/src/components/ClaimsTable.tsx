import React from 'react';
import { ClaimListItem } from '../types';
import { formatCurrency, formatRawCents } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { FlagBadge } from './FlagBadge';
import { api } from '../api/client';
import { ChevronLeft, ChevronRight, Download, Eye, RotateCcw, Search } from 'lucide-react';

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
  onPayerChange,
  onStatusChange,
  onFlagChange,
  onClaimIdChange,
  onResetFilters,
  onSelectClaim,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleExportCsv = () => {
    window.open(api.getExportUrl(), '_blank');
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing <strong>{claims.length}</strong> of <strong>{total}</strong> claims
          </div>

          {/* Export Audit CSV Button */}
          <button
            className="btn btn-primary"
            onClick={handleExportCsv}
            title="Download complete reconciliation audit ledger as CSV"
          >
            <Download size={14} />
            <span>Export Audit CSV</span>
          </button>
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
        <div>
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
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
