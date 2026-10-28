import React from 'react';
import { ShieldAlert, AlertCircle, ArrowUpRight } from 'lucide-react';

interface Props {
  flag: string;
}

export const FlagBadge: React.FC<Props> = ({ flag }) => {
  switch (flag) {
    case 'denial_history':
      return (
        <span
          className="flag-chip flag-denial"
          title="At least one remittance in history contains an explicit denial code (CO-16, CO-50, CO-197)"
        >
          <ShieldAlert size={11} aria-hidden="true" />
          <span>Denial History</span>
        </span>
      );
    case 'payment_exceeds_billed':
      return (
        <span
          className="flag-chip flag-overpayment"
          title="Review Warning: Total cash payments exceed billed amount"
        >
          <ArrowUpRight size={11} aria-hidden="true" />
          <span>Payment &gt; Billed</span>
        </span>
      );
    case 'payer_mismatch':
      return (
        <span
          className="flag-chip flag-mismatch"
          title="Review Warning: Remittance payer name differs from claim payer"
        >
          <AlertCircle size={11} aria-hidden="true" />
          <span>Payer Mismatch</span>
        </span>
      );
    default:
      return (
        <span className="flag-chip" style={{ background: '#f1f5f9', color: '#475569' }}>
          {flag}
        </span>
      );
  }
};
