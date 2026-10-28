import React from 'react';
import { ReconciliationSummary } from '../types';
import { formatCurrency, formatRawCents } from '../utils/formatters';
import { FileText, CheckCircle, AlertOctagon, DollarSign, HelpCircle, ShieldAlert } from 'lucide-react';

interface Props {
  summary: ReconciliationSummary;
  onFilterStatus?: (status: string) => void;
}

export const SummaryCards: React.FC<Props> = ({ summary, onFilterStatus }) => {
  return (
    <div className="kpi-grid">
      {/* Total Claims */}
      <div className="kpi-card">
        <div>
          <div className="kpi-label">
            <span>Total Claims</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="kpi-value">{summary.total_claims}</div>
        </div>
        <div className="kpi-subtext">Total claims billed in system</div>
      </div>

      {/* Balanced Claims */}
      <div
        className="kpi-card"
        style={{ cursor: onFilterStatus ? 'pointer' : 'default' }}
        onClick={() => onFilterStatus && onFilterStatus('balanced')}
      >
        <div>
          <div className="kpi-label" style={{ color: 'var(--success)' }}>
            <span>Balanced Claims</span>
            <CheckCircle size={16} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>
            {summary.balanced_claims}
          </div>
        </div>
        <div className="kpi-subtext">Fully accounted (difference = $0.00)</div>
      </div>

      {/* Unbalanced Claims */}
      <div
        className="kpi-card"
        style={{ cursor: onFilterStatus ? 'pointer' : 'default' }}
        onClick={() => onFilterStatus && onFilterStatus('unbalanced')}
      >
        <div>
          <div className="kpi-label" style={{ color: 'var(--warning)' }}>
            <span>Unbalanced Claims</span>
            <AlertOctagon size={16} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>
            {summary.unbalanced_claims}
          </div>
        </div>
        <div className="kpi-subtext">Require review (difference ≠ $0.00)</div>
      </div>

      {/* No Remittance */}
      <div
        className="kpi-card"
        style={{ cursor: onFilterStatus ? 'pointer' : 'default' }}
        onClick={() => onFilterStatus && onFilterStatus('no_remittance')}
      >
        <div>
          <div className="kpi-label" style={{ color: '#64748b' }}>
            <span>No Remittance</span>
            <HelpCircle size={16} />
          </div>
          <div className="kpi-value">{summary.claims_without_remittance}</div>
        </div>
        <div className="kpi-subtext">Zero payments or write-offs posted</div>
      </div>

      {/* Total Billed */}
      <div className="kpi-card">
        <div>
          <div className="kpi-label">
            <span>Total Billed</span>
            <DollarSign size={16} className="text-slate-400" />
          </div>
          <div className="kpi-value">{formatCurrency(summary.total_billed_cents)}</div>
        </div>
        <div className="kpi-subtext font-mono">{formatRawCents(summary.total_billed_cents)} clinic charges</div>
      </div>

      {/* Matched Paid */}
      <div className="kpi-card">
        <div>
          <div className="kpi-label">
            <span>Matched Cash Paid</span>
            <DollarSign size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--primary)' }}>
            {formatCurrency(summary.matched_paid_cents)}
          </div>
        </div>
        <div className="kpi-subtext font-mono">
          {formatCurrency(summary.all_remittance_paid_cents)} total payer remittances
        </div>
      </div>

      {/* Unmatched Remittances */}
      <div className="kpi-card">
        <div>
          <div className="kpi-label" style={{ color: '#d97706' }}>
            <span>Unmatched Cash</span>
            <HelpCircle size={16} />
          </div>
          <div className="kpi-value" style={{ color: '#d97706' }}>
            {formatCurrency(summary.unmatched_remittance_paid_cents)}
          </div>
        </div>
        <div className="kpi-subtext">
          {summary.unmatched_remittance_count} orphaned remittance (e.g. C9999)
        </div>
      </div>

      {/* Denial & Warnings */}
      <div className="kpi-card">
        <div>
          <div className="kpi-label" style={{ color: '#dc2626' }}>
            <span>Denial & Flags</span>
            <ShieldAlert size={16} />
          </div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>
            {summary.claims_with_denial_history}
          </div>
        </div>
        <div className="kpi-subtext">
          4 denial history claims · {summary.claims_flagged_for_review} overpayment flag
        </div>
      </div>
    </div>
  );
};
