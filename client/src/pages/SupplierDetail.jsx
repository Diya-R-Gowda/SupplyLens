import { useEffect, useState } from 'react';
import api from '../api/axios';
import { RiskBadge } from '../components/RiskBadge';
import { HealthBadge } from '../components/HealthBadge';
import NewsPanel from '../components/NewsPanel';
import RagChatDrawer from '../components/RagChatDrawer';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Timeline from '../components/Timeline';
import DigitalTwinPanel from '../components/DigitalTwinPanel';
import SnapshotPanel from '../components/SnapshotPanel';
import RiskHealthTrendChart from '../components/RiskHealthTrendChart';
import ConfidenceBadge from '../components/ConfidenceBadge';
import AlertBanner from '../components/AlertBanner';
import ForecastPanel from '../components/ForecastPanel';
import ScenarioSimulatorPanel from '../components/ScenarioSimulatorPanel';

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
const pillButtonClass = 'rounded-full px-3.5 py-2.5';

export default function SupplierDetail({ supplierId, user, onBack, onChanged }) {
  const [supplier, setSupplier] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [documents, setDocuments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [twin, setTwin] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState('');

  const [esgRefreshing, setEsgRefreshing] = useState(false);
  const [esgError, setEsgError] = useState('');
  const [logisticsRefreshing, setLogisticsRefreshing] = useState(false);
  const [logisticsError, setLogisticsError] = useState('');

  const [snapshots, setSnapshots] = useState([]);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');

  const [riskHistory, setRiskHistory] = useState([]);
  const [healthHistory, setHealthHistory] = useState([]);
  const [forecast, setForecast] = useState(null);

  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState('');

  const [mitigation, setMitigation] = useState(null);
  const [mitigating, setMitigating] = useState(false);
  const [mitigationError, setMitigationError] = useState('');

  const [alternatives, setAlternatives] = useState(null);
  const [findingAlternatives, setFindingAlternatives] = useState(false);
  const [alternativesError, setAlternativesError] = useState('');

  const isAdmin = user?.role === 'admin';
  const lastRiskChange = timeline.find((event) => event.type === 'risk_changed');
  const lastHealthChange = timeline.find((event) => event.type === 'health_changed');

  const loadTimeline = () => {
    api.get(`/suppliers/${supplierId}/timeline`).then((res) => setTimeline(res.data.data || [])).catch(() => setTimeline([]));
  };

  const loadTwin = () => {
    api.get(`/suppliers/${supplierId}/twin`).then((res) => setTwin(res.data.data || null)).catch(() => setTwin(null));
  };

  const loadSnapshots = () => {
    api.get(`/suppliers/${supplierId}/snapshots`).then((res) => setSnapshots(res.data.data || [])).catch(() => setSnapshots([]));
  };

  // limit=30 - plenty for a trend chart's default view without over-fetching
  // full history (GET .../risk-health-history also supports a `days` param
  // and standard pagination for a fuller browsing view later, if needed).
  const loadHistory = () => {
    api.get(`/suppliers/${supplierId}/risk-health-history`, { params: { limit: 30 } })
      .then((res) => {
        setRiskHistory(res.data.data?.risk?.items || []);
        setHealthHistory(res.data.data?.health?.items || []);
      })
      .catch(() => { setRiskHistory([]); setHealthHistory([]); });
  };

  const loadForecast = () => {
    api.get(`/suppliers/${supplierId}/forecast`).then((res) => setForecast(res.data.data)).catch(() => setForecast(null));
  };

  useEffect(() => {
    if (!supplierId) return;
    api.get(`/suppliers/${supplierId}`).then(res => setSupplier(res.data.data));
    api.get(`/documents/${supplierId}`).then((res) => setDocuments(res.data.data || [])).catch(() => setDocuments([]));
    loadTimeline();
    loadTwin();
    loadHistory();
    loadSnapshots();
    loadForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      loadTimeline();
      loadTwin();
      loadHistory();
      loadForecast();
      onChanged?.();
    } catch (requestError) {
      const details = requestError?.response?.data?.error?.details;
      const firstDetail = details && Object.values(details)[0];
      setSaveError(firstDetail || requestError?.response?.data?.error?.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichError('');
    try {
      const response = await api.post(`/suppliers/${supplierId}/enrich`);
      setSupplier((prev) => ({ ...prev, enrichment: response.data.data }));
      loadTimeline();
      loadTwin();
      loadHistory();
      loadForecast();
    } catch (requestError) {
      setEnrichError(requestError?.response?.data?.error?.message || 'Unable to enrich supplier data.');
    } finally {
      setEnriching(false);
    }
  };

  const handleEsgRefresh = async () => {
    setEsgRefreshing(true);
    setEsgError('');
    try {
      await api.post(`/suppliers/${supplierId}/esg-refresh`);
      loadTimeline();
      loadTwin();
      loadHistory();
      loadForecast();
    } catch (requestError) {
      setEsgError(requestError?.response?.data?.error?.message || 'Unable to refresh ESG data.');
    } finally {
      setEsgRefreshing(false);
    }
  };

  const handleLogisticsRefresh = async () => {
    setLogisticsRefreshing(true);
    setLogisticsError('');
    try {
      await api.post(`/suppliers/${supplierId}/logistics-refresh`);
      loadTimeline();
      loadTwin();
      loadHistory();
      loadForecast();
    } catch (requestError) {
      setLogisticsError(requestError?.response?.data?.error?.message || 'Unable to refresh logistics data.');
    } finally {
      setLogisticsRefreshing(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimulationError('');
    try {
      const response = await api.post(`/suppliers/${supplierId}/simulate-failure`);
      setSimulation(response.data.data);
    } catch (requestError) {
      setSimulationError(requestError?.response?.data?.error?.message || 'Unable to run simulation.');
    } finally {
      setSimulating(false);
    }
  };

  const handleGenerateMitigation = async () => {
    setMitigating(true);
    setMitigationError('');
    try {
      const response = await api.post(`/suppliers/${supplierId}/mitigation-strategies`);
      setMitigation(response.data.data);
    } catch (requestError) {
      setMitigationError(requestError?.response?.data?.error?.message || 'Unable to generate mitigation strategies.');
    } finally {
      setMitigating(false);
    }
  };

  const handleFindAlternatives = async () => {
    setFindingAlternatives(true);
    setAlternativesError('');
    try {
      const response = await api.get(`/suppliers/${supplierId}/alternatives`);
      setAlternatives(response.data.data);
    } catch (requestError) {
      setAlternativesError(requestError?.response?.data?.error?.message || 'Unable to find alternative suppliers.');
    } finally {
      setFindingAlternatives(false);
    }
  };

  const handleTakeSnapshot = async () => {
    setTakingSnapshot(true);
    setSnapshotError('');
    try {
      await api.post(`/suppliers/${supplierId}/snapshot`);
      loadSnapshots();
    } catch (requestError) {
      setSnapshotError(requestError?.response?.data?.error?.message || 'Unable to take snapshot.');
    } finally {
      setTakingSnapshot(false);
    }
  };

  const handleLoadSnapshot = async (snapshotId) => {
    const response = await api.get(`/suppliers/${supplierId}/snapshots/${snapshotId}`);
    return response.data.data;
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
        <AlertBanner
          alerts={twin?.alerts}
          riskNarrative={twin?.risk?.lastChange?.narrative}
          healthNarrative={twin?.health?.lastChange?.narrative}
          projectedAlerts={twin?.projectedAlerts}
          anomalies={twin?.anomalies}
        />
        <div className="flex justify-between items-center gap-3">
          <Button onClick={onBack} className={pillButtonClass}>Back</Button>
          <div className="grid gap-1 justify-items-end">
            <div className="flex items-center gap-2">
              <RiskBadge score={supplier.riskScore} />
              <HealthBadge score={supplier.healthScore ?? 50} />
            </div>
            {lastRiskChange ? (
              <span className="text-[0.78rem] text-slate-500 text-right max-w-[280px]">
                Risk {lastRiskChange.delta > 0 ? '+' : ''}{lastRiskChange.delta} from {lastRiskChange.previousScore} on{' '}
                {new Date(lastRiskChange.timestamp).toLocaleDateString()} ({lastRiskChange.reason?.replace(/_/g, ' ')})
              </span>
            ) : null}
            {lastHealthChange ? (
              <span className="text-[0.78rem] text-slate-500 text-right max-w-[280px]">
                Health {lastHealthChange.delta > 0 ? '+' : ''}{lastHealthChange.delta} from {lastHealthChange.previousScore} on{' '}
                {new Date(lastHealthChange.timestamp).toLocaleDateString()} ({lastHealthChange.reason?.replace(/_/g, ' ')})
              </span>
            ) : null}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="grid gap-3 p-5 rounded-[20px] bg-white/75 border border-slate-400/35">
            <Input
              label="Name"
              labelClassName="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800"
              value={form.name}
              onChange={handleFormChange('name')}
              className={inputClass}
              required
            />
            <label className="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800">
              Category
              <select value={form.category} onChange={handleFormChange('category')} className={inputClass}>
                <option value="">(none)</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <Input
              label="Country"
              labelClassName="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800"
              value={form.country}
              onChange={handleFormChange('country')}
              className={inputClass}
              maxLength={2}
              required
            />
            <Input
              label="Payment terms"
              labelClassName="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800"
              value={form.paymentTerms}
              onChange={handleFormChange('paymentTerms')}
              className={inputClass}
            />
            <Input
              label="Risk score (0-100)"
              labelClassName="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800"
              value={form.riskScore}
              onChange={handleFormChange('riskScore')}
              className={inputClass}
              type="number"
              min="0"
              max="100"
            />
            <Input
              label="Contract expiry"
              labelClassName="grid gap-1.5 text-[0.9rem] font-semibold text-slate-800"
              value={form.contractExpiry}
              onChange={handleFormChange('contractExpiry')}
              className={inputClass}
              type="date"
            />

            {saveError ? <p className="m-0 text-red-700">{saveError}</p> : null}

            <div className="flex gap-2.5 mt-1">
              <Button
                type="submit"
                variant="primary"
                className="rounded-full px-4 py-2.5"
                loading={saving}
                loadingText="Saving..."
              >
                Save changes
              </Button>
              <Button className={pillButtonClass} onClick={cancelEditing} disabled={saving}>
                Cancel
              </Button>
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
                {isAdmin ? (
                  <Button className={pillButtonClass} onClick={startEditing}>
                    Edit
                  </Button>
                ) : null}
                {isAdmin ? (
                  <Button variant="danger" className="rounded-full px-3.5 py-2.5" onClick={() => setConfirmingDelete(true)}>
                    Delete
                  </Button>
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
                loadTimeline();
                loadTwin();
                loadHistory();
                loadForecast();
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
          <div className="flex justify-between items-center gap-3 mb-3">
            <h2 className="m-0 text-[1.1rem] text-slate-900">Company Enrichment</h2>
            <Button className={pillButtonClass} onClick={handleEnrich} loading={enriching} loadingText="Enriching...">
              {supplier.enrichment?.enrichedAt ? 'Refresh' : 'Enrich with AI'}
            </Button>
          </div>
          {enrichError ? <p className="m-0 mb-2.5 text-red-700">{enrichError}</p> : null}
          {supplier.enrichment?.enrichedAt ? (
            <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.78rem] uppercase tracking-[0.08em]">
                  AI-generated - verify independently
                </Badge>
                <ConfidenceBadge confidence={supplier.enrichment.confidence} />
                <span className="text-slate-500 text-[0.85rem]">
                  Last enriched {new Date(supplier.enrichment.enrichedAt).toLocaleString()}
                </span>
              </div>
              <p className="m-0 text-slate-900">{supplier.enrichment.summary || 'No summary available.'}</p>
              <div className="flex flex-wrap gap-2.5 mt-1">
                {supplier.enrichment.industry ? <Badge className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[0.85rem]">{supplier.enrichment.industry}</Badge> : null}
                {supplier.enrichment.companySize ? <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.85rem]">{supplier.enrichment.companySize}</Badge> : null}
                {supplier.enrichment.foundedYear ? <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.85rem]">Founded {supplier.enrichment.foundedYear}</Badge> : null}
              </div>
            </Card>
          ) : (
            <p className="m-0 text-slate-600">No enrichment data yet - click "Enrich with AI" to populate industry, size, and a summary using Gemini.</p>
          )}
        </section>

        <section className="rounded-[20px] p-5 bg-white/75 border border-slate-400/35">
          <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Latest Intelligence</h2>
          <NewsPanel supplierId={supplierId} />
        </section>

        <section className="rounded-[20px] p-5 bg-indigo-50/60 border border-indigo-300/40">
          <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Digital Twin</h2>
          <p className="mt-0 mb-3.5 text-slate-500 text-[0.85rem]">
            A consolidated, always-current profile combining everything below - risk, ESG, logistics, documents, and news.
          </p>
          <DigitalTwinPanel
            twin={twin}
            onEsgRefresh={handleEsgRefresh}
            esgRefreshing={esgRefreshing}
            esgError={esgError}
            onLogisticsRefresh={handleLogisticsRefresh}
            logisticsRefreshing={logisticsRefreshing}
            logisticsError={logisticsError}
          />
        </section>

        <RiskHealthTrendChart riskItems={riskHistory} healthItems={healthHistory} forecast={forecast} />

        <ForecastPanel
          title="Risk & health forecast"
          subtitle="A hand-rolled linear projection from this supplier's own history - not a guarantee, and honestly gated below a minimum real, time-spread sample."
          forecast={forecast}
        />

        <section className="rounded-[20px] p-5 bg-violet-50/60 border border-violet-300/40">
          <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Scenario Simulator</h2>
          <ScenarioSimulatorPanel
            simulation={simulation}
            onRunSimulation={handleRunSimulation}
            simulating={simulating}
            simulationError={simulationError}
            mitigation={mitigation}
            onGenerateMitigation={handleGenerateMitigation}
            mitigating={mitigating}
            mitigationError={mitigationError}
            alternatives={alternatives}
            onFindAlternatives={handleFindAlternatives}
            findingAlternatives={findingAlternatives}
            alternativesError={alternativesError}
          />
        </section>

        <section className="rounded-[20px] p-5 bg-white/75 border border-slate-400/35">
          <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Snapshots</h2>
          <SnapshotPanel
            snapshots={snapshots}
            onTakeSnapshot={handleTakeSnapshot}
            taking={takingSnapshot}
            error={snapshotError}
            onLoadSnapshot={handleLoadSnapshot}
          />
        </section>

        <section className="rounded-[20px] p-5 bg-white/75 border border-slate-400/35">
          <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Timeline</h2>
          <Timeline events={timeline} />
        </section>
      </div>

      <RagChatDrawer supplierId={supplierId} />

      <Modal open={confirmingDelete} onClose={() => (deleting ? null : setConfirmingDelete(false))}>
        <p className="m-0 mb-4 text-red-700 text-[0.95rem] font-semibold">
          Delete this supplier?
        </p>
        <div className="flex gap-2.5 justify-end">
          <Button className={pillButtonClass} onClick={() => setConfirmingDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="rounded-full px-3.5 py-2.5"
            onClick={handleDelete}
            loading={deleting}
            loadingText="Deleting..."
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}
