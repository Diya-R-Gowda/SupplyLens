import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axios';
import Button from './Button';
import Badge from './Badge';

// Same green/yellow/red thresholds as RiskBadge.jsx, reused here for marker
// color so the map reads consistently with the rest of the app.
const riskColor = (score) => (score <= 33 ? '#16a34a' : score <= 66 ? '#ca8a04' : '#dc2626');

// Phase 9 Step 2 - Geographic Map. Library choice: react-simple-maps
// doesn't yet declare React 19 as a supported peer (would need a forced
// --legacy-peer-deps install); react-leaflet@5 declares native React 19
// support and installed cleanly, so it was used instead. Base map tiles
// come from OpenStreetMap's public, keyless tile service - a separate
// concern from supplier LOCATION data, which never leaves the static
// country-centroid table (server/data/countryCentroids.json, no geocoding
// API/key). Suppliers sharing a country are grouped into one marker
// (otherwise they'd render as perfectly-overlapping, indistinguishable
// points) - the marker's popup honestly lists every supplier grouped there.
export default function GeographicMapPage({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/org/supplier-locations')
      .then((res) => { if (active) setData(res.data.data); })
      .catch(() => { if (active) setError('Unable to load supplier locations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const countryGroups = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    for (const s of data.suppliers) {
      if (!s.locatable) continue;
      if (!map.has(s.country)) {
        map.set(s.country, {
          country: s.country, countryName: s.countryName, lat: s.lat, lng: s.lng, suppliers: [],
        });
      }
      map.get(s.country).suppliers.push(s);
    }
    return [...map.values()];
  }, [data]);

  return (
    <div className="grid gap-4">
      <div>
        <Button onClick={onBack} className="rounded-full px-3.5 py-2 mb-2">&larr; Back</Button>
        <h1 className="m-0 text-[1.6rem] text-slate-900">Geographic map</h1>
        <p className="mt-1 mb-0 text-slate-600 text-[0.9rem]">
          Supplier locations shown at <strong>country level</strong> - each marker is that country's
          approximate capital-city coordinate, not a precise supplier address. Suppliers sharing a
          country are grouped at the same point; open a marker to see who's there.
        </p>
      </div>

      {loading ? <p className="m-0 text-slate-600">Loading map...</p> : null}
      {error ? <p className="m-0 text-red-700">{error}</p> : null}

      {!loading && !error && data ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.82rem]">
              {data.totalSuppliers} supplier(s) across {data.countriesRepresented} countr{data.countriesRepresented === 1 ? 'y' : 'ies'}
            </Badge>
            {data.unlocatableCount > 0 ? (
              <Badge className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.78rem]">
                {data.unlocatableCount} supplier(s) with an unrecognized country code, not shown
              </Badge>
            ) : null}
          </div>

          {countryGroups.length === 0 ? (
            <p className="m-0 text-slate-600">No locatable suppliers yet.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-300/60" style={{ height: 480 }}>
              <MapContainer center={[20, 0]} zoom={2} minZoom={1} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {countryGroups.map((group) => {
                  const avgRisk = Math.round(
                    group.suppliers.reduce((sum, s) => sum + s.riskScore, 0) / group.suppliers.length,
                  );
                  return (
                    <CircleMarker
                      key={group.country}
                      center={[group.lat, group.lng]}
                      radius={8 + Math.min(group.suppliers.length, 10) * 2}
                      pathOptions={{
                        color: riskColor(avgRisk), fillColor: riskColor(avgRisk), fillOpacity: 0.6, weight: 2,
                      }}
                    >
                      <Popup>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{group.countryName} ({group.country})</strong>
                          <span>{group.suppliers.length} supplier(s), avg risk {avgRisk}/100</span>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {group.suppliers.map((s) => (
                              <li key={s.supplierId}>{s.name} - risk {s.riskScore}, health {s.healthScore}</li>
                            ))}
                          </ul>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
