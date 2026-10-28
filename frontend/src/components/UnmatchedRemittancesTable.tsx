import React from 'react';
import { UnmatchedRemittanceItem } from '../types';
import { formatCurrency, formatDate, formatRawCents } from '../utils/formatters';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface Props {
  items: UnmatchedRemittanceItem[];
  isLoading: boolean;
}

export const UnmatchedRemittancesTable: React.FC<Props> = ({ items, isLoading }) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Unmatched Remittance Advice Queue</h2>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400e' }}>
        <p>
          <strong>Audit Principle:</strong> These remittances reference claim IDs that do not exist in clinic records (e.g. <span className="font-mono" style={{ fontWeight: 600 }}>C9999</span>). The system safely preserves the source reference while setting the foreign key to <span className="font-mono">NULL</span>.
        </p>
        <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#b45309' }}>
          Notice: Their cash is included in <em>all-remittance totals</em> ($1,040.00), but strictly isolated from matched-claim totals ($990.00) so claim differences are not contaminated.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p>Loading unmatched remittances...</p>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No unmatched remittances</p>
          <p style={{ fontSize: '0.85rem' }}>All received remittances have been successfully matched to valid claims.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Remit ID</th>
                <th>Source Claim Ref</th>
                <th>Payer</th>
                <th>Posted Date</th>
                <th className="text-right">Paid Cash</th>
                <th className="text-right">Adjustment</th>
                <th className="text-right">Patient Resp</th>
                <th>Classification Issue</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.remit_id}>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{item.remit_id}</td>
                  <td>
                    <span
                      className="font-mono"
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        fontWeight: 600,
                      }}
                      title="Claim ID referenced by payer that cannot be found in clinic EHR"
                    >
                      {item.source_claim_id}
                    </span>
                  </td>
                  <td>{item.payer}</td>
                  <td>{formatDate(item.posted_date)}</td>
                  <td className="text-right font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    <div>{formatCurrency(item.paid_cents)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatRawCents(item.paid_cents)}</div>
                  </td>
                  <td className="text-right font-mono">{formatCurrency(item.adjustment_cents)}</td>
                  <td className="text-right font-mono">{formatCurrency(item.patient_responsibility_cents)}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        background: '#fff7ed',
                        color: '#c2410c',
                        border: '1px solid #ffedd5',
                      }}
                    >
                      <HelpCircle size={12} />
                      <span>{item.issue}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
