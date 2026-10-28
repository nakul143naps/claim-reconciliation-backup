import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface Props {
  status: 'balanced' | 'unbalanced' | 'no_remittance';
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  switch (status) {
    case 'balanced':
      return (
        <span className="badge badge-balanced" title="Total remittances match billed amount exactly">
          <CheckCircle2 size={13} aria-hidden="true" />
          <span>Balanced</span>
        </span>
      );
    case 'unbalanced':
      return (
        <span className="badge badge-unbalanced" title="Nonzero arithmetic difference between billed and remittances">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>Unbalanced</span>
        </span>
      );
    case 'no_remittance':
      return (
        <span className="badge badge-no-remit" title="No remittance received from payer yet">
          <HelpCircle size={13} aria-hidden="true" />
          <span>No Remittance</span>
        </span>
      );
  }
};
