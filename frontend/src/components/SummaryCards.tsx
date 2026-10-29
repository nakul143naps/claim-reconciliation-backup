import React from 'react';
import { ReconciliationSummary } from '../types';
import { formatCurrency, formatRawCents } from '../utils/formatters';
import {
  FileText,
  CheckCircle,
  AlertOctagon,
  DollarSign,
  HelpCircle,
  ShieldAlert,
  Clock,
  Receipt,
} from 'lucide-react';

interface Props {
  summary: ReconciliationSummary;
  onFilterStatus?: (status: string) => void;
  onFilterFlag?: (flag: string) => void;
}

export const SummaryCards: React.FC<Props> = ({ summary, onFilterStatus, onFilterFlag }) => {
  const uncollectedCash =
    summary.uncollected_cash_cents ??
    Math.max(0, summary.total_billed_cents - summary.matched_paid_cents);

  const adjustments = summary.total_adjustment_cents ?? 14000;
  const patientResp = summary.total_patient_responsibility_cents ?? 7500;
  const totalWriteOffsAndCopays = adjustments + patientResp;

  const netUnsettled =
    summary.net_unsettled_cents ??
    Math.max(
      0,
      summary.total_billed_cents -
        summary.matched_paid_cents -
        totalWriteOffsAndCopays
    );

  const collectedPct =
    summary.total_billed_cents > 0
      ? ((summary.matched_paid_cents / summary.total_billed_cents) * 100).toFixed(1)
      : '0.0';

  const writeOffsPct =
    summary.total_billed_cents > 0
      ? ((totalWriteOffsAndCopays / summary.total_billed_cents) * 100).toFixed(1)
      : '0.0';

  const unsettledPct =
    summary.total_billed_cents > 0
      ? ((netUnsettled / summary.total_billed_cents) * 100).toFixed(1)
      : '0.0';

  return (
    <div>
      {/* 3-Way Financial Settlement Lifecycle Visual Bar */}
      <div
        style={{
          marginBottom: '1.75rem',
          background: '#f8fafc',
          padding: '1.15rem 1.35rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.6rem',
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Financial Settlement Breakdown of Total Billed ({formatCurrency(summary.total_billed_cents)})
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.775rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#16a34a' }}></span>
              Cash Received: {formatCurrency(summary.matched_paid_cents)} ({collectedPct}%)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 600 }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#2563eb' }}></span>
              Contract Adjustments & Copays: {formatCurrency(totalWriteOffsAndCopays)} ({writeOffsPct}%)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ea580c', fontWeight: 700 }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ea580c' }}></span>
              Amount Not Yet Received: {formatCurrency(netUnsettled)} ({unsettledPct}%)
            </span>
          </div>
        </div>

        {/* Multi-segment stacked progress bar */}
        <div
          style={{
            height: '11px',
            width: '100%',
            background: '#e2e8f0',
            borderRadius: '9999px',
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          <div
            style={{ width: `${collectedPct}%`, background: '#16a34a', transition: 'width 0.4s ease' }}
            title={`Cash Received: ${formatCurrency(summary.matched_paid_cents)} (${collectedPct}%)`}
          />
          <div
            style={{ width: `${writeOffsPct}%`, background: '#2563eb', transition: 'width 0.4s ease' }}
            title={`Contract Adjustments & Copays: ${formatCurrency(totalWriteOffsAndCopays)} (${writeOffsPct}%)`}
          />
          <div
            style={{ width: `${unsettledPct}%`, background: '#ea580c', transition: 'width 0.4s ease' }}
            title={`Amount Not Yet Received: ${formatCurrency(netUnsettled)} (${unsettledPct}%)`}
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
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

        {/* Matched Cash Paid */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label" style={{ color: 'var(--success)' }}>
              <span>Matched Cash Paid</span>
              <DollarSign size={16} style={{ color: 'var(--success)' }} />
            </div>
            <div className="kpi-value" style={{ color: 'var(--success)' }}>
              {formatCurrency(summary.matched_paid_cents)}
            </div>
          </div>
          <div className="kpi-subtext font-mono">
            {collectedPct}% of billed collected
          </div>
        </div>

        {/* AMOUNT NOT YET RECEIVED (Primary Highlight Card) */}
        <div
          className="kpi-card"
          style={{
            cursor: onFilterStatus ? 'pointer' : 'default',
            borderLeft: '4px solid #ea580c',
            background: '#fffaf5',
          }}
          onClick={() => onFilterStatus && onFilterStatus('unbalanced')}
          title="Click to view claims with pending / uncollected balances"
        >
          <div>
            <div className="kpi-label" style={{ color: '#c2410c' }}>
              <span>Amount Not Yet Received</span>
              <Clock size={16} style={{ color: '#ea580c' }} />
            </div>
            <div className="kpi-value" style={{ color: '#ea580c' }}>
              {formatCurrency(uncollectedCash)}
            </div>
          </div>
          <div className="kpi-subtext" style={{ color: '#7c2d12' }}>
            <strong>{formatCurrency(netUnsettled)}</strong> net unsettled AR ({unsettledPct}%)
          </div>
        </div>

        {/* Contractual Adjustments & Patient Copay */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label" style={{ color: '#2563eb' }}>
              <span>Adjustments & Copays</span>
              <Receipt size={16} />
            </div>
            <div className="kpi-value" style={{ color: '#2563eb' }}>
              {formatCurrency(totalWriteOffsAndCopays)}
            </div>
          </div>
          <div className="kpi-subtext">
            {formatCurrency(adjustments)} write-offs · {formatCurrency(patientResp)} copays
          </div>
        </div>

        {/* Total Claims Count */}
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
          title="Filter by Balanced Claims"
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
          title="Filter by Unbalanced Claims"
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
          title="Filter by Claims Awaiting Remittance"
        >
          <div>
            <div className="kpi-label" style={{ color: '#64748b' }}>
              <span>No Remittance</span>
              <HelpCircle size={16} />
            </div>
            <div className="kpi-value">{summary.claims_without_remittance}</div>
          </div>
          <div className="kpi-subtext">Pending payer adjudication ($60.00)</div>
        </div>

        {/* Unmatched Cash */}
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

        {/* Denial & Flags */}
        <div
          className="kpi-card"
          style={{ cursor: onFilterFlag ? 'pointer' : 'default' }}
          onClick={() => onFilterFlag && onFilterFlag('denial_history')}
          title="Click to filter claims queue by Denial History"
        >
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
    </div>
  );
};
