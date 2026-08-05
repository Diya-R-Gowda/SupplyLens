import { useState } from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import DigitalTwinPanel from './DigitalTwinPanel';

const REASON_LABEL = {
  scheduled: 'Scheduled',
  manual: 'Manual',
  significant_change: 'Significant change',
};

// Basic side-by-side comparison, not a highlighted field-by-field diff -
// a clear raw view of two point-in-time states is an acceptable first
// version (per the phase spec); a real diff-highlighting UI is a
// nice-to-have that isn't built here.
export default function SnapshotPanel({ snapshots, onTakeSnapshot, taking, error, onLoadSnapshot }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [compareStates, setCompareStates] = useState(null);
  const [comparing, setComparing] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((existing) => existing !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep it to the 2 most recently picked
      return [...prev, id];
    });
    setCompareStates(null);
  };

  const handleCompare = async () => {
    if (selectedIds.length !== 2) return;
    setComparing(true);
    try {
      const [a, b] = await Promise.all(selectedIds.map((id) => onLoadSnapshot(id)));
      // Show older on the left, newer on the right.
      const [older, newer] = new Date(a.createdAt) <= new Date(b.createdAt) ? [a, b] : [b, a];
      setCompareStates({ older, newer });
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="grid gap-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="m-0 text-slate-600 text-[0.9rem]">
          Point-in-time copies of the Digital Twin above, taken daily plus on demand.
        </p>
        <Button className="rounded-full px-3.5 py-2" onClick={onTakeSnapshot} loading={taking} loadingText="Taking snapshot...">
          Take snapshot now
        </Button>
      </div>
      {error ? <p className="m-0 text-red-700 text-[0.85rem]">{error}</p> : null}

      {snapshots.length === 0 ? (
        <p className="m-0 text-slate-500 text-[0.9rem]">No snapshots yet.</p>
      ) : (
        <div className="grid gap-2">
          {snapshots.map((snap) => (
            <label
              key={snap._id}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-white/72 border border-slate-400/30 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(snap._id)}
                onChange={() => toggleSelect(snap._id)}
              />
              <Badge className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[0.78rem]">
                {REASON_LABEL[snap.reason] || snap.reason}
              </Badge>
              <span className="text-slate-700 text-[0.9rem]">{new Date(snap.createdAt).toLocaleString()}</span>
              <span className="ml-auto text-slate-500 text-[0.85rem]">Risk {snap.riskScore ?? '—'} · Health {snap.healthScore ?? '—'}</span>
            </label>
          ))}
        </div>
      )}

      <Button
        className="rounded-full px-3.5 py-2 justify-self-start"
        onClick={handleCompare}
        disabled={selectedIds.length !== 2}
        loading={comparing}
        loadingText="Loading..."
      >
        Compare selected (pick 2)
      </Button>

      {compareStates ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <p className="m-0 font-semibold text-slate-800">
              {new Date(compareStates.older.createdAt).toLocaleString()} ({REASON_LABEL[compareStates.older.reason] || compareStates.older.reason})
            </p>
            <DigitalTwinPanel twin={compareStates.older.state} readOnly />
          </div>
          <div className="grid gap-2">
            <p className="m-0 font-semibold text-slate-800">
              {new Date(compareStates.newer.createdAt).toLocaleString()} ({REASON_LABEL[compareStates.newer.reason] || compareStates.newer.reason})
            </p>
            <DigitalTwinPanel twin={compareStates.newer.state} readOnly />
          </div>
        </div>
      ) : null}
    </div>
  );
}
