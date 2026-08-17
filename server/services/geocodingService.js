const axios = require('axios');
const logger = require('../config/logger');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

// Keyless (OpenStreetMap Nominatim) - same no-new-signup pattern already used
// for the Geographic Map's tile layer (Phase 9). Its usage policy caps public
// use at 1 request/second and requires a descriptive User-Agent identifying
// the app; callers of this function are responsible for staying on-demand
// (one geocode per supplier edit) rather than looping over many suppliers at
// once - this module does not rate-limit or queue, it just makes one honest
// call. No SLA either: any failure (timeout, no match, non-200) resolves to
// null rather than throwing, so a caller can always fall back to the
// existing country-centroid point instead of blocking a supplier save.
exports.geocodeAddress = async (address) => {
  if (!address || !address.trim()) return null;

  try {
    const response = await axios.get(NOMINATIM_BASE_URL, {
      params: { q: address, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'SupplyLens/1.0 (supplier location geocoding)' },
      timeout: 5000,
    });

    const [result] = response.data || [];
    if (!result) return null;

    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    logger.warn({ address, message: err.message }, 'Geocoding failed');
    return null;
  }
};
