import React, { useState } from 'react';
import { X, CheckCircle, Send, Building, Mail, User, Phone, FileSpreadsheet } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestDemoModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    organization: '',
    phone: '',
    claimVolume: '5,000 – 25,000 claims/mo',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate real SaaS lead intake
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleReset}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Schedule a Custom Product Demo
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              See how Stitch Fin uncovers uncollected revenue and automates 3-way reconciliation.
            </p>
          </div>
          <button className="modal-close" onClick={handleReset} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Thank You, {formData.fullName.split(' ')[0] || 'Partner'}!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                We received your request for <strong>{formData.organization || 'your clinic'}</strong>. A Stitch Fin Solutions Architect will reach out to <strong>{formData.workEmail}</strong> within 24 business hours with your sandbox demo coordinates.
              </p>
              <button className="btn btn-primary" onClick={handleReset} style={{ margin: '0 auto' }}>
                Return to Platform
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Full Name *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <User size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                    <input
                      required
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: '32px', width: '100%' }}
                      placeholder="Dr. Sarah Jenkins"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Work Email *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                    <input
                      required
                      type="email"
                      className="input-field"
                      style={{ paddingLeft: '32px', width: '100%' }}
                      placeholder="sarah@metrocounseling.org"
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Healthcare Organization *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Building size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                    <input
                      required
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: '32px', width: '100%' }}
                      placeholder="Metro Health Partners"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Phone size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                    <input
                      type="tel"
                      className="input-field"
                      style={{ paddingLeft: '32px', width: '100%' }}
                      placeholder="+1 (555) 234-5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Estimated Monthly Claim Volume
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <FileSpreadsheet size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                  <select
                    className="select-field"
                    style={{ paddingLeft: '32px', width: '100%' }}
                    value={formData.claimVolume}
                    onChange={(e) => setFormData({ ...formData, claimVolume: e.target.value })}
                  >
                    <option value="Under 5,000 claims/mo">&lt; 5,000 claims / month</option>
                    <option value="5,000 – 25,000 claims/mo">5,000 – 25,000 claims / month</option>
                    <option value="25,000 – 100,000 claims/mo">25,000 – 100,000 claims / month</option>
                    <option value="100,000+ claims/mo">100,000+ claims / month (Enterprise)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Specific Reconciliation Challenges / Notes
                </label>
                <textarea
                  className="input-field"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  placeholder="e.g. Experiencing high denial rates with Harbor Plan or struggling to match unlinked 835 ERAs..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" onClick={handleReset}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.25rem' }}>
                  <Send size={14} />
                  <span>Request Product Demo</span>
                </button>
              </div>

              <p style={{ fontSize: '0.725rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.25rem' }}>
                Protected by 256-bit encryption. Zero PHI or patient data is required for demo scheduling.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
