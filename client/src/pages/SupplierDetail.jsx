import { useEffect, useState } from 'react';
import api from '../api/axios';
import { RiskBadge } from '../components/RiskBadge';
import NewsPanel from '../components/NewsPanel';
import RagChatDrawer from '../components/RagChatDrawer';

export default function SupplierDetail({ supplierId, onBack }) {
  const [supplier, setSupplier] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!supplierId) return;
    api.get(`/suppliers/${supplierId}`).then(res => setSupplier(res.data));
    api.get(`/documents/${supplierId}`).then((res) => setDocuments(res.data || [])).catch(() => setDocuments([]));
  }, [supplierId]);

  if (!supplier) return <p>Loading...</p>;

  return (
    <div style={styles.layout}>
      <div style={styles.content}>
        <div style={styles.topRow}>
          <button onClick={onBack} type="button" style={styles.backButton}>Back</button>
          <RiskBadge score={supplier.riskScore} />
        </div>

        <div>
          <h1 style={styles.title}>{supplier.name}</h1>
          <p style={styles.subtitle}>{supplier.category} | {supplier.country}</p>
        </div>

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
              const response = await api.post(`/documents/upload/${supplierId}`, formData);
              setUploadStatus(response.data?.demo ? 'Uploaded in demo mode.' : 'Document ingested and embedded!');
              const latestDocuments = await api.get(`/documents/${supplierId}`);
              setDocuments(latestDocuments.data || []);
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
  title: {
    margin: 0,
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    color: '#0f172a',
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#475569',
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