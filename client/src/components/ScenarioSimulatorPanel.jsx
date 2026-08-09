import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import Input from './Input';

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
const bizInputClass = 'border border-slate-300 rounded-lg px-2.5 py-2 text-[0.88rem] bg-white/92';
const bizLabelClass = 'grid gap-1 text-[0.82rem] font-semibold text-slate-700';

export default function ScenarioSimulatorPanel({
  simulation, onRunSimulation, simulating, simulationError,
  mitigation, onGenerateMitigation, mitigating, mitigationError,
  alternatives, onFindAlternatives, findingAlternatives, alternativesError,
  isAdmin,
  businessFieldsForm, onBusinessFieldChange, onSaveBusinessFields, savingBusinessFields, businessFieldsError,
  businessImpact, onCheckBusinessImpact, businessImpactLoading, businessImpactError,
  recoveryEstimate, onGetRecoveryEstimate, recoveryLoading, recoveryError,
}) {
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
            <p className="m-0 text-slate-500 text-[0.78rem]">
              See the dashboard's "Concentration &amp; redundancy" view for this same real relationship data across your whole org, visualized as a graph.
            </p>
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

          <Card className="grid gap-2.5 p-4 rounded-2xl bg-white/72">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="m-0 font-semibold text-slate-800">Mitigation strategies</p>
              <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onGenerateMitigation} loading={mitigating} loadingText="Generating...">
                {mitigation ? 'Regenerate' : 'Generate with AI'}
              </Button>
            </div>
            {mitigationError ? <p className="m-0 text-red-700 text-[0.85rem]">{mitigationError}</p> : null}
            {mitigation ? (
              <>
                <Badge className={aiBadgeClass}>AI-generated - verify independently</Badge>
                <div className="grid gap-2.5">
                  {mitigation.strategies.map((item, index) => (
                    <div key={index} className="grid gap-1 p-3 rounded-xl bg-white/80 border border-slate-300/50">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="m-0 font-semibold text-slate-900 text-[0.92rem]">{item.strategy}</p>
                        {typeof item.confidence === 'number' ? (
                          <Badge className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[0.75rem]">
                            Confidence {Math.round(item.confidence * 100)}%
                          </Badge>
                        ) : null}
                      </div>
                      <p className="m-0 text-slate-600 text-[0.85rem]">{item.rationale}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="m-0 text-slate-600 text-[0.85rem]">Generate AI-suggested mitigation strategies based on this supplier's real profile above.</p>
            )}
          </Card>

          <Card className="grid gap-2.5 p-4 rounded-2xl bg-white/72">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="m-0 font-semibold text-slate-800">Alternative suppliers</p>
              <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onFindAlternatives} loading={findingAlternatives} loadingText="Searching...">
                {alternatives ? 'Re-check' : 'Find alternatives'}
              </Button>
            </div>
            {alternativesError ? <p className="m-0 text-red-700 text-[0.85rem]">{alternativesError}</p> : null}
            {alternatives ? (
              alternatives.status === 'no_alternatives_found' ? (
                <>
                  <Badge className={realBadgeClass}>Real data - honest result</Badge>
                  <p className="m-0 text-slate-600 text-[0.85rem]">{alternatives.message}</p>
                </>
              ) : (
                <>
                  <Badge className={realBadgeClass}>Real data</Badge>
                  <p className="m-0 text-slate-600 text-[0.85rem]">{alternatives.message}</p>
                  <div className="grid gap-2">
                    {alternatives.alternatives.map((alt) => (
                      <div key={alt.supplierId} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 border border-slate-300/50">
                        <div>
                          <p className="m-0 font-semibold text-slate-900 text-[0.9rem]">{alt.name}</p>
                          <p className="m-0 text-slate-500 text-[0.78rem]">{alt.category} | {alt.country} | compared on: {alt.comparedOn.join(', ')}</p>
                        </div>
                        <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.8rem]">Score {alt.similarityScore}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : (
              <p className="m-0 text-slate-600 text-[0.85rem]">Check for alternative suppliers already in your org that could replace this one.</p>
            )}
          </Card>
        </>
      ) : (
        <p className="m-0 text-slate-600">Run a simulation to see what losing this supplier would mean, based on real data on file.</p>
      )}

      <Card className="grid gap-3 p-4 rounded-2xl bg-white/72">
        <p className="m-0 font-semibold text-slate-800">Business impact</p>

        {isAdmin ? (
          <div className="grid grid-cols-2 gap-2.5">
            <label className={bizLabelClass}>
              Contract value
              <div className="flex gap-1.5">
                <Input
                  type="number" min="0" step="0.01"
                  value={businessFieldsForm.contractValueAmount}
                  onChange={onBusinessFieldChange('contractValueAmount')}
                  className={`${bizInputClass} flex-1`}
                  placeholder="e.g. 250000"
                />
                <Input
                  value={businessFieldsForm.contractValueCurrency}
                  onChange={onBusinessFieldChange('contractValueCurrency')}
                  className={`${bizInputClass} w-16`}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
            </label>
            <Input
              label="Estimated annual spend"
              labelClassName={bizLabelClass}
              type="number" min="0" step="0.01"
              value={businessFieldsForm.estimatedAnnualSpend}
              onChange={onBusinessFieldChange('estimatedAnnualSpend')}
              className={bizInputClass}
              placeholder="e.g. 80000"
            />
            <label className={bizLabelClass}>
              Criticality (1-5)
              <select
                value={businessFieldsForm.criticalityRating}
                onChange={onBusinessFieldChange('criticalityRating')}
                className={bizInputClass}
              >
                <option value="">(not set)</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <Input
              label="Dependency notes"
              labelClassName={bizLabelClass}
              value={businessFieldsForm.dependencyNotes}
              onChange={onBusinessFieldChange('dependencyNotes')}
              className={bizInputClass}
              maxLength={500}
            />
            <div className="col-span-2 flex items-center gap-2.5">
              <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onSaveBusinessFields} loading={savingBusinessFields} loadingText="Saving...">
                Save real values
              </Button>
              {businessFieldsError ? <p className="m-0 text-red-700 text-[0.82rem]">{businessFieldsError}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="m-0 text-slate-600 text-[0.85rem]">Real values above compute directly; left blank, Gemini provides a labeled estimate.</p>
          <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onCheckBusinessImpact} loading={businessImpactLoading} loadingText="Checking...">
            Check impact
          </Button>
        </div>
        {businessImpactError ? <p className="m-0 text-red-700 text-[0.85rem]">{businessImpactError}</p> : null}
        {businessImpact ? (
          businessImpact.mode === 'real' ? (
            <>
              <Badge className={realBadgeClass}>Real calculation</Badge>
              <p className="m-0 text-slate-900 text-[0.9rem]">{businessImpact.summary}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={estimateBadgeClass}>{businessImpact.label}</Badge>
                {typeof businessImpact.confidence === 'number' ? (
                  <Badge className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[0.75rem]">Confidence {Math.round(businessImpact.confidence * 100)}%</Badge>
                ) : null}
              </div>
              {businessImpact.estimatedAnnualSpendRange ? (
                <p className="m-0 text-slate-900 text-[0.9rem]">
                  Estimated annual spend: {businessImpact.estimatedAnnualSpendRange.low.toLocaleString()} - {businessImpact.estimatedAnnualSpendRange.high.toLocaleString()} {businessImpact.estimatedAnnualSpendRange.currency}
                  {businessImpact.criticalityRating ? ` | Estimated criticality: ${businessImpact.criticalityRating}/5` : ''}
                </p>
              ) : (
                <p className="m-0 text-slate-600 text-[0.9rem]">Gemini had no reasonable basis to estimate spend for this supplier.</p>
              )}
              {businessImpact.reasoning ? <p className="m-0 text-slate-600 text-[0.85rem]">{businessImpact.reasoning}</p> : null}
            </>
          )
        ) : null}
      </Card>

      <Card className="grid gap-2.5 p-4 rounded-2xl bg-white/72">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="m-0 font-semibold text-slate-800">Recovery planning</p>
          <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onGetRecoveryEstimate} loading={recoveryLoading} loadingText="Estimating...">
            {recoveryEstimate ? 'Regenerate' : 'Estimate recovery time'}
          </Button>
        </div>
        {recoveryError ? <p className="m-0 text-red-700 text-[0.85rem]">{recoveryError}</p> : null}
        {recoveryEstimate ? (
          <>
            <Badge className={estimateBadgeClass}>AI-estimated range - not a calculation</Badge>
            <p className="m-0 text-slate-900 text-[0.95rem] font-semibold">{recoveryEstimate.estimatedRange}</p>
            <p className="m-0 text-slate-600 text-[0.85rem]">{recoveryEstimate.reasoning}</p>
            {typeof recoveryEstimate.confidence === 'number' ? (
              <Badge className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[0.75rem] w-fit">Confidence {Math.round(recoveryEstimate.confidence * 100)}%</Badge>
            ) : null}
          </>
        ) : (
          <p className="m-0 text-slate-600 text-[0.85rem]">Get an AI-estimated range for how long recovery might take if this supplier failed - always a range, never a precise figure.</p>
        )}
      </Card>
    </div>
  );
}

export { factorBadgeClass, aiBadgeClass, estimateBadgeClass, realBadgeClass };
