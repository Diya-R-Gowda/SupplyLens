import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { RiskBadge } from './RiskBadge';
import { HealthBadge } from './HealthBadge';

const unverifiedBadgeClass = 'px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.78rem] uppercase tracking-[0.08em]';
const factorBadgeClass = 'px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.85rem]';

const CONTRACT_STATUS_STYLE = {
  active: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  unknown: 'bg-slate-200 text-slate-700',
};

const CONTRACT_STATUS_LABEL = {
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  unknown: 'Unknown',
};

// Consolidated "what is true about this supplier right now" synthesis -
// distinct from the Timeline component (chronological history) and the
// individual News/Documents/Enrichment sections (which stay as their own
// detail views). This is a rollup on top of those, not a replacement.
// readOnly hides the ESG/logistics refresh actions - used when rendering a
// historical snapshot's state (Phase 4 Step 3), where "refresh" wouldn't
// make sense (there's nothing to refresh, it's a point-in-time record).
export default function DigitalTwinPanel({
  twin,
  onEsgRefresh,
  esgRefreshing,
  esgError,
  onLogisticsRefresh,
  logisticsRefreshing,
  logisticsError,
  readOnly = false,
}) {
  if (!twin) return null;

  const { risk, health, enrichment, esg, logistics, documents, news, contract } = twin;

  return (
    <div className="grid gap-3.5">
      <Card className="grid gap-3 p-4 rounded-2xl bg-white/72">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="m-0 font-semibold text-slate-800">Risk score</p>
          <RiskBadge score={risk.score} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={factorBadgeClass}>News {risk.currentFactors.newsScore}</Badge>
          <Badge className={factorBadgeClass}>Contract expiry {risk.currentFactors.expiryScore}</Badge>
          <Badge className={factorBadgeClass}>Documents {risk.currentFactors.docScore}</Badge>
          <Badge className={factorBadgeClass}>Country {risk.currentFactors.countryScore}</Badge>
        </div>
        {risk.lastChange ? (
          <p className="m-0 text-[0.85rem] text-slate-500">
            {risk.lastChange.delta > 0 ? '+' : ''}{risk.lastChange.delta} from {risk.lastChange.previousScore} on{' '}
            {new Date(risk.lastChange.timestamp).toLocaleDateString()} ({risk.lastChange.reason?.replace(/_/g, ' ')})
          </p>
        ) : null}
      </Card>

      {health ? (
        <Card className="grid gap-3 p-4 rounded-2xl bg-white/72">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="m-0 font-semibold text-slate-800">Health score</p>
            <HealthBadge score={health.score} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={factorBadgeClass}>ESG {health.currentFactors.esgScore}</Badge>
            <Badge className={factorBadgeClass}>Logistics {health.currentFactors.logisticsScore}</Badge>
            <Badge className={factorBadgeClass}>Documents {health.currentFactors.docCompletenessScore}</Badge>
            <Badge className={factorBadgeClass}>Contract {health.currentFactors.contractHealthScore}</Badge>
            <Badge className={factorBadgeClass}>Risk-inverse {health.currentFactors.riskComponent}</Badge>
          </div>
          {health.lastChange ? (
            <p className="m-0 text-[0.85rem] text-slate-500">
              {health.lastChange.delta > 0 ? '+' : ''}{health.lastChange.delta} from {health.lastChange.previousScore} on{' '}
              {new Date(health.lastChange.timestamp).toLocaleDateString()} ({health.lastChange.reason?.replace(/_/g, ' ')})
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
        <p className="m-0 font-semibold text-slate-800">Contract status</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`px-2.5 py-1 text-[0.85rem] ${CONTRACT_STATUS_STYLE[contract.status]}`}>
            {CONTRACT_STATUS_LABEL[contract.status]}
          </Badge>
          {contract.expiry ? (
            <span className="text-slate-600 text-[0.9rem]">
              {new Date(contract.expiry).toLocaleDateString()}
              {contract.daysRemaining !== null ? ` (${contract.daysRemaining} days)` : ''}
            </span>
          ) : (
            <span className="text-slate-500 text-[0.9rem]">No contract expiry on file</span>
          )}
        </div>
      </Card>

      <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
        <p className="m-0 font-semibold text-slate-800">Company enrichment</p>
        {enrichment ? (
          <>
            <Badge className={unverifiedBadgeClass}>AI-generated - verify independently</Badge>
            <p className="m-0 text-slate-900 text-[0.92rem]">{enrichment.summary || 'No summary available.'}</p>
          </>
        ) : (
          <p className="m-0 text-slate-500 text-[0.9rem]">Not yet enriched.</p>
        )}
      </Card>

      <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 font-semibold text-slate-800">ESG</p>
          {readOnly ? null : (
            <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onEsgRefresh} loading={esgRefreshing} loadingText="Refreshing...">
              {esg ? 'Refresh' : 'Refresh with AI'}
            </Button>
          )}
        </div>
        {esgError ? <p className="m-0 text-red-700 text-[0.85rem]">{esgError}</p> : null}
        {esg ? (
          <>
            <Badge className={unverifiedBadgeClass}>AI-generated - verify independently</Badge>
            <div className="flex flex-wrap gap-2">
              <Badge className={factorBadgeClass}>Environmental {esg.environmentalScore ?? '—'}</Badge>
              <Badge className={factorBadgeClass}>Social {esg.socialScore ?? '—'}</Badge>
              <Badge className={factorBadgeClass}>Governance {esg.governanceScore ?? '—'}</Badge>
            </div>
            <p className="m-0 text-slate-900 text-[0.92rem]">{esg.summary || 'No summary available.'}</p>
          </>
        ) : (
          <p className="m-0 text-slate-500 text-[0.9rem]">Not yet refreshed.</p>
        )}
      </Card>

      <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 font-semibold text-slate-800">Logistics</p>
          {readOnly ? null : (
            <Button className="rounded-full px-3 py-1.5 text-[0.85rem]" onClick={onLogisticsRefresh} loading={logisticsRefreshing} loadingText="Refreshing...">
              {logistics ? 'Refresh' : 'Refresh with AI'}
            </Button>
          )}
        </div>
        {logisticsError ? <p className="m-0 text-red-700 text-[0.85rem]">{logisticsError}</p> : null}
        {logistics ? (
          <>
            <Badge className={unverifiedBadgeClass}>AI-generated - verify independently</Badge>
            <div className="flex flex-wrap gap-2">
              <Badge className={factorBadgeClass}>
                On-time delivery {logistics.onTimeDeliveryRate !== null ? `${logistics.onTimeDeliveryRate}%` : 'unknown'}
              </Badge>
              <Badge className={factorBadgeClass}>
                Lead time {logistics.averageLeadTimeDays !== null ? `${logistics.averageLeadTimeDays}d` : 'unknown'}
              </Badge>
            </div>
            <p className="m-0 text-slate-900 text-[0.92rem]">{logistics.logisticsNotes || 'No notes available.'}</p>
          </>
        ) : (
          <p className="m-0 text-slate-500 text-[0.9rem]">Not yet refreshed.</p>
        )}
      </Card>

      <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
        <p className="m-0 font-semibold text-slate-800">Documents</p>
        <p className="m-0 text-slate-900 text-[0.92rem]">
          {documents.count} document{documents.count === 1 ? '' : 's'} on file
          {documents.mostRecent ? ` - most recent: ${documents.mostRecent.fileName}` : ''}
        </p>
      </Card>

      <Card className="grid gap-2 p-4 rounded-2xl bg-white/72">
        <p className="m-0 font-semibold text-slate-800">News sentiment</p>
        <div className="flex flex-wrap gap-2">
          <Badge className="px-2.5 py-1 bg-green-100 text-green-800 text-[0.85rem]">Positive {news.sentimentSummary.positive}</Badge>
          <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.85rem]">Neutral {news.sentimentSummary.neutral}</Badge>
          <Badge className="px-2.5 py-1 bg-red-100 text-red-800 text-[0.85rem]">Negative {news.sentimentSummary.negative}</Badge>
          {news.sentimentSummary.unclassified > 0 ? (
            <Badge className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[0.85rem]">Unclassified {news.sentimentSummary.unclassified}</Badge>
          ) : null}
        </div>
        {news.mostRecent ? (
          <p className="m-0 text-slate-900 text-[0.92rem]">
            Most recent: {news.mostRecent.headline}
          </p>
        ) : (
          <p className="m-0 text-slate-500 text-[0.9rem]">No news cached yet.</p>
        )}
      </Card>
    </div>
  );
}
