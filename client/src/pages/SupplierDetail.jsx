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

const inputClass = 'border border-slate-300 rounded-xl px-3 py-2.5 text-[0.95rem] bg-white/92';
const pillButtonClass = 'border border-slate-300 rounded-full bg-white/80 px-3.5 py-2.5 font-bold cursor-pointer';

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
    <div className="flex min-h-[72vh] gap-4.5">
      <div className="flex-1 grid gap-5 overflow-y-auto">
        <div className="flex justify-between items-center gap-3">
          <button onClick={onBack} type="button" className={pillButtonClass}>Back</button>
          <RiskBadge score={supplier.riskScore} />
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="grid gap-3 p-5 rounded-[20px] bg-white/75 border border-slate-400/35">
            <label className="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800">
              Name
              <input value={form.name} onChange={handleFormChange('name')} className={inputClass} required />
            </label>
            <label className="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800">
              Category
              <select value={form.category} onChange={handleFormChange('category')} className={inputClass}>
                <option value="">(none)</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800">
              Country
              <input value={form.country} onChange={handleFormChange('country')} className={inputClass} maxLength={2} required />
            </label>
            <label className="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800">
              Payment terms
              <input value={form.paymentTerms} onChange={handleFormChange('paymentTerms')} className={inputClass} />
            </label>
            <label className="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800">
              Risk score (0-100)
              <input
                value={form.riskScore}
                onChange={handleFormChange('riskScore')}
                className={inputClass}
                type="number"
                min="0"
                max="100"
              />
            </label>
            <label className="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800">
              Contract expiry
              <input value={form.contractExpiry} onChange={handleFormChange('contractExpiry')} className={inputClass} type="date" />
            </label>

            {saveError ? <p className="m-0 text-red-700">{saveError}</p> : null}

            <div className="flex gap-2.5 mt-1">
              <button
                type="submit"
                className="border-none rounded-full px-4 py-2.5 font-bold text-white bg-gradient-to-br from-blue-700 to-teal-700 cursor-pointer disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" className={pillButtonClass} onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex justify-between items-start gap-3">
              <div>
                <h1 className="m-0 text-[clamp(1.8rem,4vw,2.8rem)] text-slate-900">{supplier.name}</h1>
                <p className="mt-2 mb-0 text-slate-600">{supplier.category} | {supplier.country}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" className={pillButtonClass} onClick={startEditing}>
                  Edit
                </button>
                {isAdmin ? (
                  confirmingDelete ? (
                    <span className="flex items-center gap-2">
                      <span className="text-red-700 text-[0.9rem] font-semibold">Delete this supplier?</span>
                      <button
                        type="button"
                        className="border-none rounded-full bg-red-700 text-white px-3.5 py-2.5 font-bold cursor-pointer"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button type="button" className={pillButtonClass} onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="border border-red-300 rounded-full bg-red-50/90 text-red-700 px-3.5 py-2.5 font-bold cursor-pointer"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Delete
                    </button>
                  )
                ) : null}
              </div>
            </div>
            {deleteError ? <p className="m-0 text-red-700">{deleteError}</p> : null}
          </>
        )}

        <section className="rounded-[20px] p-5 bg-white/75 border border-slate-400/35">
          <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Document Vault</h2>
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
          {uploadStatus ? <p className="mt-2.5 mb-0 text-slate-600">{uploadStatus}</p> : null}
          {documents.length > 0 ? (
            <div className="grid gap-2.5 mt-3.5">
              {documents.map((document) => (
                <div
                  key={document._id || document.fileName}
                  className="flex justify-between gap-3 px-3.5 py-3 rounded-[14px] bg-white/72 border border-slate-400/30 text-slate-900"
                >
                  <span>{document.fileName}</span>
                  <span className="text-slate-500 text-[0.9rem]">{document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : 'recent'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2.5 mb-0 text-slate-600">No documents uploaded yet.</p>
          )}
        </section>

        <section className="rounded-[20px] p-5 bg-white/75 border border-slate-400/35">
          <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Latest Intelligence</h2>
          <NewsPanel supplierId={supplierId} />
        </section>
      </div>

      <RagChatDrawer supplierId={supplierId} />
    </div>
  );
}
