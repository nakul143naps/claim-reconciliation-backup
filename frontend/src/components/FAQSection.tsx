import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Stitch Fin eliminate floating-point calculation errors in claims billing?',
      a: 'Standard binary floating-point numbers in Python and JavaScript suffer from IEEE 754 precision drift (e.g. 0.1 + 0.2 = 0.30000000000000004). In healthcare ledgers, even one-cent discrepancies fail audits. Stitch Fin stores and calculates all currency amounts strictly as integer cents (BIGINT in MySQL and integer types across services). Division into dollars occurs solely at the UI display layer, guaranteeing 100% mathematical precision.',
    },
    {
      q: 'What happens when a payer sends payment for an unknown or missing claim?',
      a: 'In real-world billing, payers often remit cash for historic, transferred, or miskeyed claim IDs (e.g. remit R1012 referencing missing claim C9999). Discarding the record loses cash tracking, while inventing a dummy claim creates phantom accounts receivable. Stitch Fin uses a dual-key architecture: the exact source string is preserved in source_claim_id while the foreign key claim_id is set to NULL. The cash ($50.00) is tracked in total remittances ($1,040.00) but safely quarantined from matched claims so balances are never contaminated.',
    },
    {
      q: 'Why can a claim be marked "Balanced" while still displaying a "Denial History" flag?',
      a: 'Financial balance and clinical denial history are independent dimensions. For example, in claim C1007, the payer initially rejected the claim under CO-197 ($0 paid). Once the clinic resolved the authorization, the payer issued remittance R1007 paying $110.00 with a $40.00 contractual write-off. Mathematically, the claim is balanced ($150 - $110 - $40 = $0). Operationally, billing specialists need to know the claim required an appeal. Stitch Fin retains complete remittance history rather than overwriting prior rows.',
    },
    {
      q: 'Why is the calculated difference null for claims with no remittance?',
      a: 'Treating an unremitted claim as having a confirmed $60.00 outstanding balance is an accounting error. Until the payer adjudicates the claim, the clinic does not know what portion will be covered, contractually discounted (e.g., CO-45), or shifted to patient copay. Stitch Fin marks status as no_remittance with a null difference, preventing false assumptions of collectible debt.',
    },
    {
      q: 'What formats can the reconciliation audit ledger be exported in?',
      a: 'The platform supports one-click export in CSV format (for Excel, Google Sheets, and accounting audits), structured JSON (for automated ERP and clearinghouse integrations), and formatted Print/PDF view.',
    },
    {
      q: 'How does the system prevent duplicate batch files from double-counting revenue?',
      a: 'Stitch Fin enforces a three-tier idempotency model. When a file is re-submitted, records with identical normalized data are classified as duplicate_noop and skipped without incrementing totals. If an incoming row shares an existing ID but has conflicting amounts, it is rejected as conflicting_existing_id with a row-level error log. Unique database constraints serve as the final integrity safeguard.',
    },
  ];

  return (
    <section id="faq" style={{ margin: '4rem 0 3rem 0', background: '#ffffff', border: '1px solid var(--neutral-border)', borderRadius: '12px', padding: '3rem 2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2.5rem auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
          <HelpCircle size={15} />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Everything You Need to Know
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Common questions about Stitch Fin’s reconciliation logic, data integrity, and compliance standards.
        </p>
      </div>

      <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              style={{
                border: '1px solid var(--neutral-border)',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease',
              }}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isOpen ? '#f8fafc' : '#ffffff',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: 'var(--text-main)',
                }}
              >
                <span>{faq.q}</span>
                {isOpen ? <ChevronUp size={18} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={18} style={{ color: '#94a3b8' }} />}
              </button>

              {isOpen && (
                <div style={{ padding: '1.25rem 1.5rem', background: '#ffffff', borderTop: '1px solid #f1f5f9', fontSize: '0.875rem', color: '#475569', lineHeight: 1.65 }}>
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
