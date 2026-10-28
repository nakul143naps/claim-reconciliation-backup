import React, { useEffect, useState } from 'react';
import { ClaimDetail } from '../types';
import { api } from '../api/client';
import { formatCurrency, formatDate, formatRawCents, REASON_CODE_DESCRIPTIONS } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { FlagBadge } from './FlagBadge';
import { X, Calendar, User, FileCode, AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  claimId: string;
  onClose: () => void;
}

export const ClaimDetailModal: React.FC<Props> = ({ claimId, onClose }) => {
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.getClaimById(claimId)
      .then((data) => {
        if (active) setClaim(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load claim detail');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [claimId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Claim Detail — {claimId}</h2>
            {claim && (
              <>
                <StatusBadge status={claim.status} />
                {claim.flags.map((flag) => (
                  <FlagBadge key={flag} flag={flag} />
                ))}
              </>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Loading claim breakdown...</p>
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
              <strong>Error loading claim:</strong> {error}
            </div>
          )}

          {claim && (
            <>
              {/* Claim Attributes Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', border: '1px solid var(--neutral-border)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User size={13} /> Patient Account
                  </div>
                  <div className="font-mono" style={{ fontWeight: 600, marginTop: '0.2rem' }}>{claim.patient_account}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payer</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{claim.payer}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={13} /> Service Date
                  </div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{formatDate(claim.service_date)}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileCode size={13} /> CPT Procedure
                  </div>
                  <div className="font-mono" style={{ fontWeight: 600, marginTop: '0.2rem' }}>{claim.cpt}</div>
                </div>
              </div>

              {/* Warning Banners */}
              {claim.flags.includes('payment_exceeds_billed') && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <AlertTriangle size={18} style={{ color: '#dc2626' }} />
                  <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                    <strong>Review Anomaly:</strong> Matched payer payments ({formatCurrency(claim.totals.paid_cents)}) exceed total billed charges ({formatCurrency(claim.billed_cents)}). Difference is negative ({formatCurrency(claim.totals.difference_cents)}).
                  </div>
                </div>
              )}

              {claim.denial_history && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShieldAlert size={18} style={{ color: '#2563eb' }} />
                  <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                    <strong>Historical Denial Recorded:</strong> This claim has earlier remittances with explicit denial codes (CO-16, CO-50, or CO-197) in its audit history. Current balance is independent from denial history.
                  </div>
                </div>
              )}

              {claim.status === 'no_remittance' && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <strong>Pending Remittance:</strong> No payments or write-offs have been received for this claim yet. Per billing standards, the difference is undefined (null) rather than confirmed outstanding collectible balance.
                  </div>
                </div>
              )}

              {/* Financial Breakdown Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Financial Reconciliation Summary</h3>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th className="text-right">Amount ($)</th>
                        <th className="text-right">Raw Cents</th>
                        <th>Formula & Rule Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Billed Charges</strong></td>
                        <td className="text-right font-mono">{formatCurrency(claim.billed_cents)}</td>
                        <td className="text-right font-mono" style={{ color: '#94a3b8' }}>{formatRawCents(claim.billed_cents)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Original amount charged by clinic</td>
                      </tr>
                      <tr>
                        <td><strong>Total Payer Cash Paid</strong></td>
                        <td className="text-right font-mono" style={{ color: 'var(--primary)' }}>{formatCurrency(claim.totals.paid_cents)}</td>
                        <td className="text-right font-mono" style={{ color: '#94a3b8' }}>{formatRawCents(claim.totals.paid_cents)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sum of paid_cents across matched remittances</td>
                      </tr>
                      <tr>
                        <td><strong>Contractual Adjustments</strong></td>
                        <td className="text-right font-mono">{formatCurrency(claim.totals.adjustment_cents)}</td>
                        <td className="text-right font-mono" style={{ color: '#94a3b8' }}>{formatRawCents(claim.totals.adjustment_cents)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contractual write-offs</td>
                      </tr>
                      <tr>
                        <td><strong>Patient Responsibility</strong></td>
                        <td className="text-right font-mono">{formatCurrency(claim.totals.patient_responsibility_cents)}</td>
                        <td className="text-right font-mono" style={{ color: '#94a3b8' }}>{formatRawCents(claim.totals.patient_responsibility_cents)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Patient copay / deductible</td>
                      </tr>
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td>Calculated Difference</td>
                        <td className="text-right font-mono" style={{ fontSize: '1rem', color: claim.totals.difference_cents === 0 ? 'var(--success)' : 'var(--warning)' }}>
                          {formatCurrency(claim.totals.difference_cents)}
                        </td>
                        <td className="text-right font-mono" style={{ color: '#94a3b8' }}>{formatRawCents(claim.totals.difference_cents)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Billed - Paid - Adjustments - PatientResp</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remittance History Timeline */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>
                  Remittance Audit Trail ({claim.remittances.length} record{claim.remittances.length !== 1 ? 's' : ''})
                </h3>

                {claim.remittances.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No remittance transactions recorded for this claim.</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Posted Date</th>
                          <th>Remit ID</th>
                          <th className="text-right">Paid Cash</th>
                          <th className="text-right">Adjustment</th>
                          <th className="text-right">Patient Resp</th>
                          <th>Reason Code</th>
                          <th>Explanation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claim.remittances.map((remit) => {
                          const reasonInfo = remit.reason_code ? REASON_CODE_DESCRIPTIONS[remit.reason_code] : null;
                          return (
                            <tr key={remit.remit_id}>
                              <td>{formatDate(remit.posted_date)}</td>
                              <td className="font-mono" style={{ fontWeight: 600 }}>{remit.remit_id}</td>
                              <td className="text-right font-mono" style={{ color: remit.paid_cents > 0 ? 'var(--primary)' : 'inherit' }}>
                                {formatCurrency(remit.paid_cents)}
                              </td>
                              <td className="text-right font-mono">{formatCurrency(remit.adjustment_cents)}</td>
                              <td className="text-right font-mono">{formatCurrency(remit.patient_responsibility_cents)}</td>
                              <td>
                                {remit.reason_code ? (
                                  <span
                                    className="font-mono"
                                    style={{
                                      fontWeight: 600,
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      background: reasonInfo?.isDenial ? '#fef2f2' : '#f1f5f9',
                                      color: reasonInfo?.isDenial ? '#b91c1c' : '#334155',
                                      border: reasonInfo?.isDenial ? '1px solid #fecaca' : '1px solid #cbd5e1',
                                    }}
                                  >
                                    {remit.reason_code}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {reasonInfo ? reasonInfo.desc : remit.reason_code ? 'Standard adjustment code' : 'Clean cash payment without adjustment code'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
