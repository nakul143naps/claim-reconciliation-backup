import React from 'react';
import { Calculator, ShieldAlert, Split, FileCheck2, Database, Cpu } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Calculator size={24} style={{ color: 'var(--primary)' }} />,
      title: 'Deterministic 3-Way Reconciliation',
      description:
        'Calculates claim balances by aggregating payer cash, contractual fee schedule write-offs (CO-45), and patient copays/deductibles using exact integer cents arithmetic. Zero IEEE 754 floating-point rounding errors.',
      tag: 'Financial Precision',
    },
    {
      icon: <ShieldAlert size={24} style={{ color: '#dc2626' }} />,
      title: 'Complete Denial History & Appeal Engine',
      description:
        'Preserves prior denial codes (CO-16, CO-50, CO-197) in historical audit logs even after claims balance. Includes one-click generation of clinical reconsideration appeal briefs for billing specialists.',
      tag: 'Revenue Recovery',
    },
    {
      icon: <Split size={24} style={{ color: '#d97706' }} />,
      title: 'Dual-Key Orphan Remittance Quarantine',
      description:
        'Isolates remittances referencing unverified claims (e.g. C9999) using a dual-column schema (source reference preserved while relational FK is NULL). Never discards cash and never invents phantom claims.',
      tag: 'Audit Integrity',
    },
    {
      icon: <FileCheck2 size={24} style={{ color: 'var(--success)' }} />,
      title: 'Audit-Ready Ledgers & One-Click CSV Export',
      description:
        'Generate and stream comprehensive reconciliation ledgers with variance breakdowns, review flags, and reason codes formatted for month-end accounting closes and payer settlement audits.',
      tag: 'Operational Speed',
    },
    {
      icon: <Database size={24} style={{ color: '#0284c7' }} />,
      title: 'Idempotent Ingestion Pipeline',
      description:
        'Three-tier duplicate detection: exact duplicate files are processed as no-ops without double-counting payments, while conflicting modified records trigger structured row-level warning reports.',
      tag: 'Enterprise Scalability',
    },
    {
      icon: <Cpu size={24} style={{ color: '#7c3aed' }} />,
      title: 'Payer Anomaly & Overpayment Warnings',
      description:
        'Automatically flags claims where cash payments exceed billed charges or where remittance payer names conflict with original claim submissions, preventing costly post-audit payer recoupments.',
      tag: 'Risk Mitigation',
    },
  ];

  return (
    <section id="features" style={{ margin: '4rem 0 2rem 0' }}>
      <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem auto' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Engineered for Healthcare Revenue Cycle Integrity
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
          Standard accounting software cannot handle the complexity of healthcare remittances. Stitch Fin provides a purpose-built settlement engine that eliminates billing blindspots.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {features.map((feat, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.75rem', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.65rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'inline-flex' }}>
                  {feat.icon}
                </div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                  {feat.tag}
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {feat.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                {feat.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
