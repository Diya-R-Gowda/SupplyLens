import { useEffect, useState } from 'react';
import api from '../api/axios';
import { RiskBadge } from '../components/RiskBadge';
import NewsPanel from '../components/NewsPanel';
import RagChatDrawer from '../components/RagChatDrawer';

const CATEGORY_OPTIONS = ['raw_material', 'logistics', 'saas', 'other'];

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const emptyForm = {
  name: '',
  category: '',
  country: '',
  paymentTerms: '',
  riskScore: '',
  contractExpiry: '',
};

const formFromSupplier = (supplier) => ({
  name: supplier.name || '',
  category: supplier.category || '',
  country: supplier.country || '',
  paymentTerms: supplier.paymentTerms || '',
  riskScore: supplier.riskScore ?? '',
  contractExpiry: toDateInputValue(supplier.contractExpiry),
});

export default function SupplierDetail({ supplierId, user, onBack, onChanged }) {
  const [supplier, setSupplier] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [documents, setDocuments] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!supplierId) return;
    api.get(`/suppliers/${supplierId}`).then(res => setSupplier(res.data.data));
    api.get(`/documents/${supplierId}`).then((res) => setDocuments(res.data.data || [])).catch(() => setDocuments([]));
  }, [supplierId]);

  if (!supplier) return <p>Loading...</p>;

  const startEditing = () => {
    setForm(formFromSupplier(supplier));
    setSaveError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveError('');
  };

  const handleFormChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        country: form.country,
        paymentTerms: form.paymentTerms,
        riskScore: form.riskScore === '' ? undefined : Number(form.riskScore),
        contractExpiry: form.contractExpiry || null,
      };
      const response = await api.put(`/suppliers/${supplierId}`, payload);
      setSupplier(response.data.data);
      setIsEditing(false);
      onChanged?.();
    } catch (requestError) {
      const details = requestError?.response?.data?.error?.details;
      const firstDetail = details && Object.values(details)[0];
      setSaveError(firstDetail || requestError?.response?.data?.error?.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');

    try {
      await api.delete(`/suppliers/${supplierId}`);
      onChanged?.();
      onBack();
    } catch (requestError) {
      setDeleteError(requestError?.response?.data?.error?.message || 'Unable to delete supplier.');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div style={styles.layout}>
      <div style={styles.content}>
        <div style={styles.topRow}>
          <button onClick={onBack} type="button" style={styles.backButton}>Back</button>
          <RiskBadge score={supplier.riskScore} />
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} style={styles.editForm}>
            <label style={styles.label}>
              Name
              <input value={form.name} onChange={handleFormChange('name')} style={styles.input} required />
            </label>
            <label style={styles.label}>
              Category
              <select value={form.category} onChange={handleFormChange('category')} style={styles.input}>
                <option value="">(none)</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Country
              <input value={form.country} onChange={handleFormChange('country')} style={styles.input} maxLength={2} required />
            </label>
            <label style={styles.label}>
              Payment terms
              <input value={form.paymentTerms} onChange={handleFormChange('paymentTerms')} style={styles.input} />
            </label>
            <label style={styles.label}>
              Risk score (0-100)
              <input
                value={form.riskScore}
                onChange={handleFormChange('riskScore')}
                style={styles.input}
                type="number"
                min="0"
                max="100"
              />
            </label>
            <label style={styles.label}>
              Contract expiry
              <input value={form.contractExpiry} onChange={handleFormChange('contractExpiry')} style={styles.input} type="date" />
            </label>

            {saveError ? <p style={styles.error}>{saveError}</p> : null}

            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" style={styles.cancelButton} onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div style={styles.titleRow}>
              <div>
                <h1 style={styles.title}>{supplier.name}</h1>
                <p style={styles.subtitle}>{supplier.category} | {supplier.country}</p>
              </div>
              <div style={styles.actions}>
                <button type="button" style={styles.editButton} onClick={startEditing}>
                  Edit
                </button>
                {isAdmin ? (
                  confirmingDelete ? (
                    <span style={styles.confirmRow}>
                      <span style={styles.confirmText}>Delete this supplier?</span>
                      <button type="button" style={styles.deleteConfirmButton} onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button type="button" style={styles.cancelButton} onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button type="button" style={styles.deleteButton} onClick={() => setConfirmingDelete(true)}>
                      Delete
                    </button>
                  )
                ) : null}
              </div>
            </div>
            {deleteError ? <p style={styles.error}>{deleteError}</p> : null}
          </>
        )}

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Document Vault</h2>
          <input
            type="file"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploadStatus('Uploading...');
              const formData = new FormData();
              formData.append('file', file);
              try {
                const response = await api.post(`/documents/upload/${supplierId}`, formData);
                setUploadStatus(response.data.data?.demo ? 'Uploaded in demo mode.' : 'Document ingested and embedded!');
                const latestDocuments = await api.get(`/documents/${supplierId}`);
                setDocuments(latestDocuments.data.data || []);
              } catch (uploadError) {
                setUploadStatus(uploadError?.response?.data?.error?.message || 'Failed to process document.');
              }
            }}
          />
          {uploadStatus ? <p style={styles.status}>{uploadStatus}</p> : null}
          {documents.length > 0 ? (
            <div style={styles.docList}>
              {documents.map((document) => (
                <div key={document._id || document.fileName} style={styles.docItem}>
                  <span>{document.fileName}</span>
                  <span style={styles.docMeta}>{document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : 'recent'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.status}>No documents uploaded yet.</p>
          )}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Latest Intelligence</h2>
          <NewsPanel supplierId={supplierId} />
        </section>
      </div>

      <RagChatDrawer supplierId={supplierId} />
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '72vh',
    gap: '18px',
  },
  content: {
    flex: 1,
    display: 'grid',
    gap: '20px',
    overflowY: 'auto',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  backButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.8)',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    color: '#0f172a',
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#475569',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  editButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.8)',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  deleteButton: {
    border: '1px solid #fca5a5',
    borderRadius: '999px',
    background: 'rgba(254,242,242,0.9)',
    color: '#b91c1c',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  confirmText: {
    color: '#b91c1c',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  deleteConfirmButton: {
    border: 'none',
    borderRadius: '999px',
    background: '#b91c1c',
    color: 'white',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  cancelButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.8)',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  editForm: {
    display: 'grid',
    gap: '12px',
    padding: '20px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(148,163,184,0.35)',
  },
  label: {
    display: 'grid',
    gap: '6px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '0.95rem',
    background: 'rgba(255,255,255,0.92)',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
  saveButton: {
    border: 'none',
    borderRadius: '999px',
    padding: '10px 16px',
    fontWeight: 700,
    color: 'white',
    background: 'linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%)',
    cursor: 'pointer',
  },
  panel: {
    borderRadius: '20px',
    padding: '20px',
    background: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(148,163,184,0.35)',
  },
  panelTitle: {
    margin: '0 0 12px',
    fontSize: '1.1rem',
    color: '#0f172a',
  },
  status: {
    margin: '10px 0 0',
    color: '#475569',
  },
  error: {
    margin: 0,
    color: '#b91c1c',
  },
  copy: {
    margin: 0,
    color: '#475569',
  },
  docList: {
    display: 'grid',
    gap: '10px',
    marginTop: '14px',
  },
  docItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(148,163,184,0.3)',
    color: '#0f172a',
  },
  docMeta: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
};
