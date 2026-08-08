import Card from './Card';
import Badge from './Badge';
import Button from './Button';

// Phase 8 - "Agents" panel. Per the CONTRIBUTING.md audit: there is no
// multi-step tool-calling framework anywhere in this app, so "agent" here
// means a scoped, persona-focused Gemini call (or, for ESG/Logistics, a
// deterministic restatement of existing Phase 4 data with no new Gemini
// call at all). Each section's badge states plainly what kind of output it
// actually is - genuine synthesis, genuine extraction, a focused-lens
// restatement, or a hardcoded (never AI-generated) abstention - so nothing
// here reads as more independently substantial than it really is.
export const genuineBadgeClass = 'px-2.5 py-1 bg-sky-100 text-sky-800 text-[0.78rem] uppercase tracking-[0.08em]';
export const focusedLensBadgeClass = 'px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.78rem] uppercase tracking-[0.08em]';
export const abstainBadgeClass = 'px-2.5 py-1 bg-orange-100 text-orange-800 text-[0.78rem] uppercase tracking-[0.08em]';
const confidenceBadgeClass = 'px-2 py-0.5 bg-slate-200 text-slate-700 text-[0.75rem]';
const factorBadgeClass = 'px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.85rem]';

const ConfidenceBadge = ({ value }) => (
  typeof value === 'number' ? <Badge className={confidenceBadgeClass}>Confidence {Math.round(value * 100)}%</Badge> : null
);

export default function AgentsPanel({
  riskAnalyst, onRunRiskAnalyst, riskAnalystLoading, riskAnalystError,
  legal, onRunLegal, legalLoading, legalError,
}) {
  return (
    <div className="grid gap-3.5">
      <p className="m-0 text-slate-500 text-[0.85rem] max-w-[560px]">
        Each agent below is either genuine synthesis/extraction over real data nothing else in this
        app currently produces, or an explicitly-labeled focused-lens restatement of existing data -
        the badge on each section states which. No agent estimates a claim with no real data source;
        where that's true, it says so instead of guessing.
      </p>

      <Card className="grid gap-2.5 p-4 rounded-2xl bg-white/72">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="m-0 font-semibold text-slate-800">Risk Analyst</p>
          <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onRunRiskAnalyst} loading={riskAnalystLoading} loadingText="Analyzing...">
            {riskAnalyst ? 'Re-run analysis' : 'Run analysis'}
          </Button>
        </div>
        {riskAnalystError ? <p className="m-0 text-red-700 text-[0.85rem]">{riskAnalystError}</p> : null}
        {riskAnalyst ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={genuineBadgeClass}>Genuine synthesis of real data</Badge>
              <ConfidenceBadge value={riskAnalyst.confidence} />
            </div>
            <p className="m-0 text-slate-900 text-[0.92rem]">{riskAnalyst.assessment}</p>
            {riskAnalyst.keyConcerns.length ? (
              <ul className="m-0 pl-5 grid gap-1 text-slate-700 text-[0.85rem]">
                {riskAnalyst.keyConcerns.map((concern, index) => <li key={index}>{concern}</li>)}
              </ul>
            ) : (
              <p className="m-0 text-slate-500 text-[0.85rem]">No key concerns flagged from the real data available.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge className={factorBadgeClass}>Risk history {riskAnalyst.dataAvailability.riskHistoryPoints} pt(s)</Badge>
              <Badge className={factorBadgeClass}>Health history {riskAnalyst.dataAvailability.healthHistoryPoints} pt(s)</Badge>
              <Badge className={factorBadgeClass}>
                Forecast {riskAnalyst.dataAvailability.forecastAvailable.risk || riskAnalyst.dataAvailability.forecastAvailable.health ? 'available' : 'not available'}
              </Badge>
              <Badge className={factorBadgeClass}>Alerts {riskAnalyst.dataAvailability.alertsEnabled ? 'enabled' : 'disabled'}</Badge>
            </div>
          </>
        ) : (
          <p className="m-0 text-slate-600 text-[0.85rem]">Synthesize this supplier's real risk/health scores, history, forecast, and anomaly data into one written assessment.</p>
        )}
      </Card>

      <Card className="grid gap-2.5 p-4 rounded-2xl bg-white/72">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="m-0 font-semibold text-slate-800">Legal</p>
          <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onRunLegal} loading={legalLoading} loadingText="Reviewing...">
            {legal ? 'Re-run review' : 'Review documents'}
          </Button>
        </div>
        {legalError ? <p className="m-0 text-red-700 text-[0.85rem]">{legalError}</p> : null}
        {legal ? (
          legal.status === 'ok' ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={genuineBadgeClass}>Genuine extraction from real documents</Badge>
                <ConfidenceBadge value={legal.confidence} />
              </div>
              <p className="m-0 text-slate-600 text-[0.85rem]">{legal.summary}</p>
              <div className="grid gap-2">
                {legal.findings.map((f, index) => (
                  <div key={index} className="grid gap-1 p-3 rounded-xl bg-white/80 border border-slate-300/50">
                    <div className="flex items-center gap-2">
                      <Badge className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[0.75rem] capitalize">{f.topic}</Badge>
                    </div>
                    <p className="m-0 text-slate-900 text-[0.88rem]">{f.finding}</p>
                    {f.excerpt ? <p className="m-0 text-slate-500 text-[0.8rem] italic">&quot;{f.excerpt}&quot;</p> : null}
                  </div>
                ))}
              </div>
              {legal.missingStandardTerms.length ? (
                <p className="m-0 text-orange-700 text-[0.85rem]">Possibly missing: {legal.missingStandardTerms.join('; ')}</p>
              ) : null}
              <p className="m-0 text-slate-400 text-[0.78rem]">Reviewed: {legal.documentsReviewed.join(', ')}</p>
            </>
          ) : (
            <>
              <Badge className={focusedLensBadgeClass}>Real data - honest result</Badge>
              <p className="m-0 text-slate-600 text-[0.85rem]">{legal.summary}</p>
            </>
          )
        ) : (
          <p className="m-0 text-slate-600 text-[0.85rem]">Extract termination, renewal, compliance, liability, and payment findings from this supplier's real uploaded documents.</p>
        )}
      </Card>
    </div>
  );
}
