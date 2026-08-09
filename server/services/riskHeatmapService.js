const { getSupplierLocations } = require('./geoLocationService');

// Phase 9 Step 3 - Risk Heatmap. Reuses Step 2's getSupplierLocations()
// rather than re-querying Supplier directly, so "which suppliers are
// locatable" is never defined two different ways in two files. Aggregation
// granularity is capped at whatever the location data itself supports -
// country-level, same honest ceiling as the map (see TODO.md for why a
// finer-grained heatmap isn't possible without new geocoding
// infrastructure this app doesn't have).
exports.getRiskHeatmap = async (orgId) => {
  const { suppliers, granularity } = await getSupplierLocations(orgId);

  const byCountry = new Map();
  for (const s of suppliers) {
    if (!s.locatable) continue;
    if (!byCountry.has(s.country)) {
      byCountry.set(s.country, {
        country: s.country, countryName: s.countryName, lat: s.lat, lng: s.lng, supplierCount: 0, riskSum: 0, healthSum: 0,
      });
    }
    const entry = byCountry.get(s.country);
    entry.supplierCount += 1;
    entry.riskSum += s.riskScore;
    entry.healthSum += s.healthScore;
  }

  const countries = [...byCountry.values()]
    .map((c) => ({
      country: c.country,
      countryName: c.countryName,
      lat: c.lat,
      lng: c.lng,
      supplierCount: c.supplierCount,
      averageRiskScore: Math.round(c.riskSum / c.supplierCount),
      averageHealthScore: Math.round(c.healthSum / c.supplierCount),
    }))
    .sort((a, b) => b.averageRiskScore - a.averageRiskScore);

  return {
    countries,
    countriesRepresented: countries.length,
    granularity,
  };
};
