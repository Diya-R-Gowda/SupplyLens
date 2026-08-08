import Card from './Card';
import Badge from './Badge';
import Button from './Button';

const factorBadgeClass = 'px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.85rem]';
const aiBadgeClass = 'px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.78rem] uppercase tracking-[0.08em]';
const estimateBadgeClass = 'px-2.5 py-1 bg-violet-100 text-violet-800 text-[0.78rem] uppercase tracking-[0.08em]';
const realBadgeClass = 'px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[0.78rem] uppercase tracking-[0.08em]';

const COMPLETENESS_STYLE = {
  low: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  high: 'bg-green-100 text-green-800',
};

// Phase 7 - Scenario Simulator. Step 1 (failure simulation) ships here first;
// Steps 2-5 (mitigation strategies, alternatives, business impact, recovery
// estimate) extend this same panel as they're built, rather than each living
// as a disconnected feature - a user runs one simulation and sees the whole
// picture in one place. Every AI-derived section carries the same
// "AI-generated - verify independently" badge convention already established
// for enrichment/ESG/logistics; every real-data section is labeled Real data
// so the two are never visually ambiguous.
export default function ScenarioSimulatorPanel({ simulation, onRunSimulation, simulating, simulationError }) {
  return (
    <div className="grid gap-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="m-0 text-slate-500 text-[0.85rem] max-w-[520px]">
          Simulates what losing this supplier would actually mean, computed only from real data
          already on file - current scores, contract status, documents, news, and how replaceable
          this supplier is within your current supplier base.
        </p>
        <Button onClick={onRunSimulation} loading={simulating} loadingText="Simulating...">
          {simulation ? 'Re-run simulation' : 'Simulate failure'}
        </Button>
      </div>

      {simulationError ? <p className="m-0 text-red-700">{simulationError}</p> : null}

      {simulation ? (
        <>
          <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
            <div className="flex items-center gap-2">
              <Badge className={realBadgeClass}>Real data</Badge>
              <p className="m-0 font-semibold text-slate-800">Summary</p>
            </div>
            <p className="m-0 text-slate-900 text-[0.92rem]">{simulation.summary}</p>
          </Card>

          <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
            <p className="m-0 font-semibold text-slate-800">Concentration risk</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={factorBadgeClass}>
                {simulation.supplier.category
                  ? `${simulation.concentrationRisk.isSoleCategorySource ? 'Only' : `1 of ${simulation.concentrationRisk.categoryPeerCount + 1}`} in "${simulation.supplier.category}"`
                  : 'No category set'}
              </Badge>
              <Badge className={factorBadgeClass}>
                {simulation.concentrationRisk.isSoleCountrySource ? 'Only' : `1 of ${simulation.concentrationRisk.countryPeerCount + 1}`} in {simulation.supplier.country}
              </Badge>
              <Badge className={factorBadgeClass}>{simulation.concentrationRisk.totalOrgSuppliers} suppliers total in org</Badge>
            </div>
          </Card>

          <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
            <p className="m-0 font-semibold text-slate-800">Current risk &amp; health context</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={factorBadgeClass}>Risk {simulation.currentRiskHealth.riskScore}/100</Badge>
              <Badge className={factorBadgeClass}>Health {simulation.currentRiskHealth.healthScore}/100</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={factorBadgeClass}>News {simulation.currentRiskHealth.riskFactors.newsScore}</Badge>
              <Badge className={factorBadgeClass}>Contract {simulation.currentRiskHealth.riskFactors.expiryScore}</Badge>
              <Badge className={factorBadgeClass}>Documents {simulation.currentRiskHealth.riskFactors.docScore}</Badge>
              <Badge className={factorBadgeClass}>Country {simulation.currentRiskHealth.riskFactors.countryScore}</Badge>
            </div>
          </Card>

          <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="m-0 font-semibold text-slate-800">Data completeness</p>
              <Badge className={`text-[0.78rem] ${COMPLETENESS_STYLE[simulation.dataCompleteness.level]}`}>
                {simulation.dataCompleteness.level}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={factorBadgeClass}>{simulation.dataCompleteness.documentCount} document(s)</Badge>
              <Badge className={factorBadgeClass}>Enrichment {simulation.dataCompleteness.hasEnrichment ? 'on file' : 'not on file'}</Badge>
              <Badge className={factorBadgeClass}>ESG {simulation.dataCompleteness.hasEsg ? 'on file' : 'not on file'}</Badge>
              <Badge className={factorBadgeClass}>Logistics {simulation.dataCompleteness.hasLogistics ? 'on file' : 'not on file'}</Badge>
            </div>
            <p className="m-0 text-slate-600 text-[0.85rem]">{simulation.dataCompleteness.note}</p>
          </Card>

          <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
            <p className="m-0 font-semibold text-slate-800">Recent news</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="px-2.5 py-1 bg-green-100 text-green-800 text-[0.85rem]">Positive {simulation.recentNews.sentimentCounts.positive}</Badge>
              <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.85rem]">Neutral {simulation.recentNews.sentimentCounts.neutral}</Badge>
              <Badge className="px-2.5 py-1 bg-red-100 text-red-800 text-[0.85rem]">Negative {simulation.recentNews.sentimentCounts.negative}</Badge>
            </div>
          </Card>
        </>
      ) : (
        <p className="m-0 text-slate-600">Run a simulation to see what losing this supplier would mean, based on real data on file.</p>
      )}
    </div>
  );
}

export { factorBadgeClass, aiBadgeClass, estimateBadgeClass, realBadgeClass };
