import React, { useState } from 'react';
import { api } from '../api/client';
import { FileImportResult } from '../types';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportCsvModal: React.FC<Props> = ({ isOpen, onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'remittances'>('claims');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [importResult, setImportResult] = useState<FileImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'claims' | 'remittances') => {
    setActiveTab(tab);
    setSelectedFile(null);
    setImportResult(null);
    setErrorMessage(null);
    setResetMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setErrorMessage('Only .csv files are supported.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setImportResult(null);
      setResetMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setImportResult(null);
    setResetMessage(null);

    try {
      let result: FileImportResult;
      if (activeTab === 'claims') {
        result = await api.importClaims(selectedFile);
      } else {
        result = await api.importRemittances(selectedFile);
      }
      setImportResult(result);
      onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetBenchmark = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    setImportResult(null);
    setResetMessage(null);

    try {
      await api.resetBenchmark();
      setResetMessage('Database restored to canonical 12 claims & 13 remittances benchmark.');
      onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset benchmark data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                background: '#eff6ff',
                color: 'var(--primary)',
                padding: '0.45rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                Import Batch Reconciliation CSV
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Ingest new clinic charges or payer 835 remittances with real-time audit verification.
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Sub-tabs for Claims vs Remittances */}
          <div className="tabs" style={{ marginBottom: '1.25rem' }}>
            <button
              className={`tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
              onClick={() => handleTabChange('claims')}
            >
              Upload Claims CSV
            </button>
            <button
              className={`tab-btn ${activeTab === 'remittances' ? 'active' : ''}`}
              onClick={() => handleTabChange('remittances')}
            >
              Upload Remittances CSV
            </button>
          </div>

          {/* Format specifications & template download */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
              fontSize: '0.825rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, color: '#334155' }}>
                Required Columns for {activeTab === 'claims' ? 'Claims CSV' : 'Remittances CSV'}:
              </span>
              <a
                href={api.getTemplateUrl(activeTab)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.775rem',
                }}
              >
                <Download size={13} />
                <span>Download Sample Template</span>
              </a>
            </div>

            <code
              style={{
                display: 'block',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#0f172a',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {activeTab === 'claims'
                ? 'claim_id, patient_account, payer, service_date, cpt, billed_cents'
                : 'remit_id, claim_id, payer, paid_cents, adjustment_cents, patient_responsibility_cents, reason_code, posted_date'}
            </code>
          </div>

          {/* File input / dropzone */}
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              background: selectedFile ? '#f0fdf4' : '#ffffff',
              marginBottom: '1.25rem',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: selectedFile ? '#bbf7d0' : '#eff6ff',
                  color: selectedFile ? 'var(--success)' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selectedFile ? <FileText size={20} /> : <Upload size={20} />}
              </div>

              {selectedFile ? (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB · Click to change file
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    Choose a CSV file or drag &amp; drop it here
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Strict comma-separated values (.csv) with header row
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button className="btn" onClick={onClose} disabled={isUploading}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              style={{ minWidth: '140px', justifyContent: 'center' }}
            >
              {isUploading ? (
                <span>Reconciling...</span>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Upload &amp; Reconcile</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Reset Message Success Alert */}
          {resetMessage && (
            <div
              style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{resetMessage}</span>
            </div>
          )}

          {/* Ingestion Report Results */}
          {importResult && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.6rem' }}>
                <CheckCircle2 size={16} />
                <span>Import Ingestion Completed: {importResult.filename}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', textAlign: 'center', fontSize: '0.8rem' }}>
                <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Rows Seen</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{importResult.rows_seen}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: 'var(--success)', fontSize: '0.7rem' }}>Inserted</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success)' }}>{importResult.inserted}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>Duplicates Skipped</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{importResult.duplicate_noop}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: importResult.rejected > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.7rem' }}>Rejected</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: importResult.rejected > 0 ? 'var(--danger)' : 'inherit' }}>{importResult.rejected}</div>
                </div>
              </div>

              {/* Show row issues if any */}
              {importResult.issues.length > 0 && (
                <div style={{ marginTop: '0.75rem', maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                  <strong style={{ color: 'var(--danger)' }}>Row Warnings:</strong>
                  {importResult.issues.map((issue, idx) => (
                    <div key={idx} style={{ color: '#64748b', marginTop: '0.2rem' }}>
                      Row {issue.row_number} {issue.record_id ? `[${issue.record_id}]` : ''}: {issue.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Safety Net: Reset to Original Demo Benchmark Card */}
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Info size={14} style={{ color: 'var(--primary)' }} />
                <span>Live Interview Demo Protection</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Reset the database to the canonical 12 claims &amp; 13 remittances benchmark at any time.
              </div>
            </div>

            <button
              className="btn"
              onClick={handleResetBenchmark}
              disabled={isResetting || isUploading}
              style={{
                fontSize: '0.775rem',
                padding: '0.4rem 0.85rem',
                borderColor: '#cbd5e1',
                color: '#475569',
              }}
              title="Wipe custom rows and restore the canonical benchmark dataset"
            >
              <RotateCcw size={12} />
              <span>{isResetting ? 'Restoring...' : 'Reset to Demo Benchmark'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
