const Supplier = require('../models/Supplier');
const { scoreCandidate, buildAssessmentFlags } = require('./similarityService');

// Phase 9 Step 4 - Concentration & Redundancy View. NOT a supply-chain
// dependency graph - there is no parent/child, upstream/downstream, or
// tiering data anywhere in this schema (confirmed by the pre-build audit),
// and this must never be labeled as one anywhere user-facing. Every node is
// a real supplier; every edge is one of exactly two REAL, traceable
// relationships that already exist in this app's data:
//   - same-category pairs, weighted by similarityService.js's real
//     cross-supplier scoring (reused, not duplicated - the same function
//     Phase 7's Alternative Supplier Recommendations already uses)
//   - same-country-but-different-category pairs, a plain grouping fact
//     with no score (similarityService only scores within a category)
// isSoleCategorySource/isSoleCountrySource per node use the exact same
// definition as simulationService.js's computeConcentrationRisk (Phase 7) -
// computed directly here from the already-loaded full supplier list rather
// than calling that function per supplier, which would re-query the whole
// org's suppliers N times. Same real meaning either way: "sole source" here
// means the same thing it does in the Scenario Simulator.
exports.getConcentrationGraph = async (orgId) => {
  const suppliers = await Supplier.find({ orgId }).lean();

  const nodes = suppliers.map((s) => {
    const categoryPeerCount = s.category
      ? suppliers.filter((other) => other._id !== s._id && other.category === s.category).length
      : null;
    const countryPeerCount = suppliers.filter((other) => other._id !== s._id && other.country === s.country).length;

    return {
      id: String(s._id),
      name: s.name,
      category: s.category,
      country: s.country,
      riskScore: s.riskScore,
      healthScore: s.healthScore,
      isSoleCategorySource: s.category ? categoryPeerCount === 0 : null,
      isSoleCountrySource: countryPeerCount === 0,
    };
  });

  // Assessment flags (real history exists or not) computed once per
  // supplier up front, same "don't assume a never-touched default is real
  // signal" gate similarityService.js already applies - reused here rather
  // than re-deriving.
  const flagsById = new Map(
    await Promise.all(suppliers.map(async (s) => [String(s._id), await buildAssessmentFlags(s)])),
  );

  const byCategory = new Map();
  for (const s of suppliers) {
    if (!s.category) continue;
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category).push(s);
  }

  const edges = [];
  const edgeKey = (a, b) => [String(a), String(b)].sort().join('::');
  const drawnPairs = new Set();

  // Same-category edges - weighted by the real similarity score, every pair
  // within a category (not threshold-gated on existence - "shares this
  // category" is a real, ground-truth fact for every such pair; the score
  // communicates strength, not whether the edge is real at all).
  for (const [category, members] of byCategory) {
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        const { score, comparedOn } = scoreCandidate(a, flagsById.get(String(a._id)), b, flagsById.get(String(b._id)));
        edges.push({
          source: String(a._id),
          target: String(b._id),
          type: 'similarity',
          reason: `Same category (${category})`,
          similarityScore: score,
          comparedOn,
        });
        drawnPairs.add(edgeKey(a._id, b._id));
      }
    }
  }

  // Same-country, different-category edges - a plain grouping fact (no
  // similarity score, since similarityService only compares within a
  // shared category) - skipped for any pair already drawn above so a
  // same-category-and-same-country pair isn't double-connected.
  const byCountry = new Map();
  for (const s of suppliers) {
    if (!byCountry.has(s.country)) byCountry.set(s.country, []);
    byCountry.get(s.country).push(s);
  }
  for (const [country, members] of byCountry) {
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        if (drawnPairs.has(edgeKey(a._id, b._id))) continue;
        edges.push({
          source: String(a._id),
          target: String(b._id),
          type: 'same_country',
          reason: `Both based in ${country}`,
          similarityScore: null,
          comparedOn: ['country'],
        });
        drawnPairs.add(edgeKey(a._id, b._id));
      }
    }
  }

  return {
    label: 'Concentration & Redundancy View',
    scope: 'Visualizes real category/country grouping and similarity-score proximity between suppliers already in your org - NOT a supply-chain dependency graph. There is no upstream/downstream or parent/child supplier data anywhere in this app.',
    nodes,
    edges,
    soleSourceCount: nodes.filter((n) => n.isSoleCategorySource || n.isSoleCountrySource).length,
  };
};
