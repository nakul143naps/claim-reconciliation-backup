/**
 * TypeScript interfaces strictly mirroring backend schemas.
 */

export interface RemittanceDetail {
  remit_id: string;
  paid_cents: number;
  adjustment_cents: number;
  patient_responsibility_cents: number;
  reason_code: string | null;
  posted_date: string;
}

export interface ClaimTotals {
  paid_cents: number;
  adjustment_cents: number;
  patient_responsibility_cents: number;
  difference_cents: number | null;
}

export interface ClaimListItem {
  claim_id: string;
  payer: string;
  billed_cents: number;
  paid_cents: number;
  adjustment_cents: number;
  patient_responsibility_cents: number;
  difference_cents: number | null;
  status: 'balanced' | 'unbalanced' | 'no_remittance';
  flags: string[];
}

export interface ClaimDetail {
  claim_id: string;
  patient_account: string;
  payer: string;
  service_date: string;
  cpt: string;
  billed_cents: number;
  totals: ClaimTotals;
  status: 'balanced' | 'unbalanced' | 'no_remittance';
  flags: string[];
  denial_history: boolean;
  remittances: RemittanceDetail[];
}

export interface ClaimListResponse {
  items: ClaimListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReconciliationSummary {
  total_claims: number;
  balanced_claims: number;
  unbalanced_claims: number;
  claims_without_remittance: number;
  total_billed_cents: number;
  matched_paid_cents: number;
  all_remittance_paid_cents: number;
  unmatched_remittance_count: number;
  unmatched_remittance_paid_cents: number;
  claims_with_denial_history: number;
  claims_flagged_for_review: number;
  uncollected_cash_cents: number;
  net_unsettled_cents: number;
  total_adjustment_cents: number;
  total_patient_responsibility_cents: number;
}

export interface UnmatchedRemittanceItem {
  remit_id: string;
  source_claim_id: string;
  payer: string;
  paid_cents: number;
  adjustment_cents: number;
  patient_responsibility_cents: number;
  reason_code: string | null;
  posted_date: string;
  issue: string;
}

export interface UnmatchedRemittancesResponse {
  items: UnmatchedRemittanceItem[];
  total: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
