const Supplier = require('../models/Supplier');
const countryCentroids = require('../data/countryCentroids.json');

// Phase 9 Step 2 - Geographic Map. No lat/long or address field exists
// anywhere in this schema (confirmed by the pre-build audit) - `country` is
// the only location data any supplier has, and it's a 2-letter ISO code.
// This maps each supplier to its COUNTRY's approximate capital-city
// coordinate (server/data/countryCentroids.json, same static-lookup-table
// pattern as countryRisk.json - no geocoding API/key). Every supplier from
// the same country renders at the same point - this is a real, honest
// country-level approximation, never a precise supplier location. See
// TODO.md for per-supplier geocoding as a possible future enhancement.
//
// Supplier.country's own validator only checks the SHAPE (`/^[A-Z]{2}$/`),
// not that it's a real ISO code - a supplier with an unrecognized 2-letter
// code is reported honestly as unlocatable (`lat`/`lng`: null) rather than
// silently dropped or placed at a made-up point.
exports.getSupplierLocations = async (orgId) => {
  const suppliers = await Supplier.find({ orgId })
    .select('name category country riskScore healthScore')
    .lean();

  const located = suppliers.map((s) => {
    const centroid = countryCentroids[s.country] || null;
    return {
      supplierId: s._id,
      name: s.name,
      category: s.category,
      country: s.country,
      countryName: centroid?.name || null,
      riskScore: s.riskScore,
      healthScore: s.healthScore,
      lat: centroid?.lat ?? null,
      lng: centroid?.lng ?? null,
      locatable: !!centroid,
    };
  });

  const countriesRepresented = new Set(located.filter((s) => s.locatable).map((s) => s.country)).size;
  const unlocatableCount = located.filter((s) => !s.locatable).length;

  return {
    suppliers: located,
    totalSuppliers: located.length,
    countriesRepresented,
    unlocatableCount,
    granularity: 'country_centroid',
  };
};
