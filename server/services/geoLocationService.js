const Supplier = require('../models/Supplier');
const countryCentroids = require('../data/countryCentroids.json');

// Phase 9 Step 2 - Geographic Map. `country` is every supplier's guaranteed
// fallback location (server/data/countryCentroids.json, same static-lookup-
// table pattern as countryRisk.json - no geocoding API/key), still used
// whenever a supplier has no precise location set. Since the later
// per-supplier geocoding addition (Supplier.location), a supplier that HAS
// geocoded or manually-entered coordinates renders at its own exact point
// instead - this is the single place that decides which one wins, so it's
// never duplicated in the frontend. `locationPrecision` reports which kind
// of point each supplier got, so callers can render them differently.
//
// Supplier.country's own validator only checks the SHAPE (`/^[A-Z]{2}$/`),
// not that it's a real ISO code - a supplier with an unrecognized 2-letter
// code AND no precise location is reported honestly as unlocatable
// (`lat`/`lng`: null) rather than silently dropped or placed at a made-up point.
exports.getSupplierLocations = async (orgId) => {
  const suppliers = await Supplier.find({ orgId })
    .select('name category country riskScore healthScore location')
    .lean();

  const located = suppliers.map((s) => {
    const hasPreciseLocation = Number.isFinite(s.location?.lat) && Number.isFinite(s.location?.lng);
    const centroid = countryCentroids[s.country] || null;
    return {
      supplierId: s._id,
      name: s.name,
      category: s.category,
      country: s.country,
      countryName: centroid?.name || null,
      riskScore: s.riskScore,
      healthScore: s.healthScore,
      lat: hasPreciseLocation ? s.location.lat : (centroid?.lat ?? null),
      lng: hasPreciseLocation ? s.location.lng : (centroid?.lng ?? null),
      locatable: hasPreciseLocation || !!centroid,
      locationPrecision: hasPreciseLocation ? 'exact' : 'country',
    };
  });

  const countriesRepresented = new Set(located.filter((s) => s.locatable).map((s) => s.country)).size;
  const unlocatableCount = located.filter((s) => !s.locatable).length;
  const exactCount = located.filter((s) => s.locationPrecision === 'exact').length;

  return {
    suppliers: located,
    totalSuppliers: located.length,
    countriesRepresented,
    unlocatableCount,
    exactCount,
    // 'country_centroid' when no supplier has a precise location yet (the
    // original, still-common case), 'mixed' once at least one does - never
    // claims blanket precision that isn't there.
    granularity: exactCount > 0 ? 'mixed' : 'country_centroid',
  };
};
