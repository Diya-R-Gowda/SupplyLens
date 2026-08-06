import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Input from './Input';

const RISK_FIELDS = [
  { key: 'newsScore', label: 'News sentiment' },
  { key: 'expiryScore', label: 'Contract expiry' },
  { key: 'docScore', label: 'Missing documents' },
  { key: 'countryScore', label: 'Country risk' },
];

const HEALTH_FIELDS = [
  { key: 'esgScore', label: 'ESG composite' },
  { key: 'logisticsScore', label: 'Logistics performance' },
  { key: 'docCompletenessScore', label: 'Document completeness' },
  { key: 'contractHealthScore', label: 'Contract health' },
  { key: 'riskComponent', label: 'Inverted risk score' },
];

const sum = (weights, fields) => fields.reduce((total, f) => total + (Number(weights[f.key]) || 0), 0);

// Weight editors work in whole percentage points in the UI (friendlier than
// typing "0.4") and convert to/from the 0-1 fractions the API expects.
const toPercent = (weights) => Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Math.round(v * 100)]));
const toFraction = (percents) => Object.fromEntries(Object.entries(percents).map(([k, v]) => [k, (Number(v) || 0) / 100]));

function WeightGroup({ title, fields, percents, onChange, formulaKey }) {
  const total = fields.reduce((t, f) => t + (Number(percents[f.key]) || 0), 0);
  const isValid = total === 100;

  return (
    <Card className="grid gap-3 p-4 rounded-2xl bg-white/72">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="m-0 font-semibold text-slate-800">{title}</p>
        <span className={`text-[0.85rem] font-bold ${isValid ? 'text-emerald-700' : 'text-red-700'}`}>
          Total: {total}% {isValid ? '' : '(must equal 100%)'}
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {fields.map((f) => (
          <Input
            key={f.key}
            label={`${f.label} (%)`}
            type="number"
            min={0}
            max={100}
            value={percents[f.key]}
            onChange={(e) => onChange(formulaKey, f.key, e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-[0.92rem] bg-white/92"
          />
        ))}
      </div>
    </Card>
  );
}

// Admin-only settings surface for Phase 5's configurable weight table
// (server/models/RiskConfig.js) - viewers can't PATCH per the API's own
// requireRole('admin') gate, so this panel isn't rendered for them at all
// (Dashboard.jsx only shows the entry point to admins).
export default function RiskConfigPanel({ onBack }) {
  const [riskPercents, setRiskPercents] = useState(null);
  const [healthPercents, setHealthPercents] = useState(null);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/org/risk-config');
        if (!active) return;
        setRiskPercents(toPercent(res.data.data.riskWeights));
        setHealthPercents(toPercent(res.data.data.healthWeights));
        setIsDefault(res.data.data.isDefault);
        setError('');
      } catch {
        if (active) setError('Unable to load risk configuration');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleChange = (formulaKey, fieldKey, value) => {
    const setter = formulaKey === 'risk' ? setRiskPercents : setHealthPercents;
    setter((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const riskValid = riskPercents && sum(riskPercents, RISK_FIELDS.map((f) => ({ key: f.key }))) === 100;
  const healthValid = healthPercents && sum(healthPercents, HEALTH_FIELDS.map((f) => ({ key: f.key }))) === 100;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveMessage('');
    try {
      const res = await api.patch('/org/risk-config', {
        riskWeights: toFraction(riskPercents),
        healthWeights: toFraction(healthPercents),
      });
      setRiskPercents(toPercent(res.data.data.riskWeights));
      setHealthPercents(toPercent(res.data.data.healthWeights));
      setIsDefault(res.data.data.isDefault);
      setSaveMessage('Saved. New weights apply the next time a score recomputes for each supplier.');
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || 'Unable to save risk configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button onClick={onBack} className="rounded-full px-3.5 py-2 mb-2">&larr; Back</Button>
          <h1 className="m-0 text-[1.6rem] text-slate-900">Risk &amp; health scoring weights</h1>
          <p className="mt-1 mb-0 text-slate-600 text-[0.9rem]">
            {isDefault ? 'Using default weights - not yet customized for this organisation.' : 'Custom weights for this organisation.'}
          </p>
        </div>
      </div>

      {loading ? <p className="m-0 text-slate-600">Loading...</p> : null}
      {error ? <p className="m-0 text-red-700">{error}</p> : null}
      {saveMessage ? <p className="m-0 text-emerald-700">{saveMessage}</p> : null}

      {riskPercents && healthPercents ? (
        <>
          <WeightGroup title="Risk score weights" fields={RISK_FIELDS} percents={riskPercents} onChange={handleChange} formulaKey="risk" />
          <WeightGroup title="Health score weights" fields={HEALTH_FIELDS} percents={healthPercents} onChange={handleChange} formulaKey="health" />

          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            loadingText="Saving..."
            disabled={!riskValid || !healthValid}
            className="rounded-full px-5 py-2.5 justify-self-start"
          >
            Save weights
          </Button>
          {(!riskValid || !healthValid) ? (
            <p className="m-0 text-[0.85rem] text-slate-500">Both groups must each total exactly 100% before saving.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
