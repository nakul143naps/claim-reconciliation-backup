import React from 'react';
import { UploadCloud, Cpu, CheckCircle } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: <UploadCloud size={24} style={{ color: 'var(--primary)' }} />,
      title: 'Intake & Atomic Validation',
      desc: 'Ingest claim submissions and payer remittance advice files. The pipeline performs strict header validation, ISO date checks, and non-negative integer cents enforcement before transaction commitment.',
    },
    {
      num: '02',
      icon: <Cpu size={24} style={{ color: '#0284c7' }} />,
      title: 'Deterministic Settlement Engine',
      desc: 'Matches claims to remittance lines, aggregates historical transactions, and calculates variances. Solves orphan payments via dual-key isolation so unverified claims never contaminate balanced records.',
    },
    {
      num: '03',
      icon: <CheckCircle size={24} style={{ color: 'var(--success)' }} />,
      title: 'Revenue Recovery & Export',
      desc: 'Billing specialists inspect claims by operational queues (Denials, Overpayments, Unmatched). Generates actionable clinical appeal briefs and streams audit-ready CSV ledgers for accounting.',
    },
  ];

  return (
    <section id="how-it-works" style={{ margin: '4rem 0 3rem 0', background: '#ffffff', border: '1px solid var(--neutral-border)', borderRadius: '12px', padding: '3rem 2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2.5rem auto' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          How Stitch Fin Works
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          A 3-step automated pipeline from raw clearinghouse data to audit-ready settlement.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', position: 'relative' }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'inline-flex' }}>
                {step.icon}
              </div>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-1px' }}>
                {step.num}
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              {step.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
