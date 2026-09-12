import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader.jsx'
import StatCard from '../components/common/StatCard.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import ItemThumb from '../components/common/ItemThumb.jsx'
import ScoreRing from '../components/common/ScoreRing.jsx'
import { useToast } from '../hooks/useToast.js'
import { supabase } from '../services/supabaseClient.js'
import { findMatches, MATCH_THRESHOLD } from '../services/matching.js'
import { REPORT_STATUS, deriveReportStatus, deriveMatchPairStatus } from '../utils/reportStatus.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'lost', label: 'Lost' },
  { key: 'found', label: 'Found' },
  { key: 'matched', label: 'Potential Match' },
  { key: 'in_verification', label: 'In Verification' },
  { key: 'verified', label: 'Verified' },
]

function capitalize(text) {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatDate(dateStr) {
  if (!dateStr) return 'unknown date'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatUpdatedAt(date) {
  if (!date) return null
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${day} · ${time}`
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-mist/60 ${className}`} />
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-mist bg-paper p-6 text-center text-sm text-slate">
      {message}
    </div>
  )
}

function statusMetaLine(derived) {
  switch (derived.status) {
    case REPORT_STATUS.VERIFIED:
      return 'Ready for handover'
    case REPORT_STATUS.IN_VERIFICATION:
      return 'Awaiting claimant answer'
    case REPORT_STATUS.VERIFICATION_FAILED:
      return "Last answer didn't match — can retry"
    case REPORT_STATUS.POTENTIAL_MATCH:
      return `${derived.matchCount} potential match${derived.matchCount === 1 ? '' : 'es'} · best ${derived.bestScore}%`
    default:
      return null
  }
}

function ReportCard({ report, derived }) {
  const isLost = report.__type === 'lost'
  const date = isLost ? report.date_lost : report.date_found
  const isVerified = derived.status === REPORT_STATUS.VERIFIED
  const metaLine = statusMetaLine(derived)

  return (
    <Link
      to={isLost ? '/report-lost' : '/report-found'}
      className={`group flex gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(16,35,31,0.08)] ${
        isVerified
          ? 'border-pine/30 bg-pine/5 hover:border-pine/50'
          : 'border-mist bg-paper hover:border-pine/40'
      }`}
    >
      <ItemThumb imageUrl={report.image_url} label={report.item_name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-ink group-hover:text-pine">
            {report.item_name}
          </p>
          <StatusBadge status={derived.status} />
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
          {report.category}
        </p>
        <p className="mt-2 truncate text-sm text-slate">{report.location}</p>
        <p className="mt-1 text-xs text-slate">{formatDate(date)}</p>
        {metaLine ? (
          <p className={`mt-2 text-xs font-medium ${isVerified ? 'text-pine' : 'text-slate'}`}>
            {metaLine}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const [lostItems, setLostItems] = useState([])
  const [foundItems, setFoundItems] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [filter, setFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const showToast = useToast()

  useEffect(() => {
    const isInitialLoad = refreshKey === 0
    let isMounted = true

    async function loadData() {
      if (isInitialLoad) setLoading(true)
      else setRefreshing(true)
      setError(null)

      try {
        const [lostRes, foundRes, verificationRes] = await Promise.all([
          supabase.from('lost_items').select('*').order('created_at', { ascending: false }),
          supabase.from('found_items').select('*').order('created_at', { ascending: false }),
          supabase.from('match_verifications').select('*').order('created_at', { ascending: false }),
        ])

        if (lostRes.error) throw lostRes.error
        if (foundRes.error) throw foundRes.error
        if (verificationRes.error) throw verificationRes.error

        if (!isMounted) return

        setLostItems(lostRes.data ?? [])
        setFoundItems(foundRes.data ?? [])
        setVerifications(verificationRes.data ?? [])
        setLastUpdated(new Date())
        if (!isInitialLoad) showToast('Dashboard refreshed', 'success')
      } catch (err) {
        console.error('Failed to load dashboard data', err)
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : 'Something went wrong while loading the dashboard.'
          setError(message)
          if (!isInitialLoad) showToast(message, 'error')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [refreshKey, showToast])

  const matches = useMemo(() => findMatches(lostItems, foundItems), [lostItems, foundItems])
  const verifiedCount = useMemo(
    () => verifications.filter((v) => v.status === 'verified').length,
    [verifications],
  )

  const lostById = useMemo(() => new Map(lostItems.map((item) => [item.id, item])), [lostItems])
  const foundById = useMemo(() => new Map(foundItems.map((item) => [item.id, item])), [foundItems])

  const verificationByPair = useMemo(() => {
    const map = new Map()
    for (const verification of verifications) {
      map.set(`${verification.lost_item_id}_${verification.found_item_id}`, verification)
    }
    return map
  }, [verifications])

  const combinedReports = useMemo(() => {
    const context = { matches, verifications }
    const lost = lostItems.map((item) => ({
      ...item,
      __type: 'lost',
      __derived: deriveReportStatus(item, 'lost', context),
    }))
    const found = foundItems.map((item) => ({
      ...item,
      __type: 'found',
      __derived: deriveReportStatus(item, 'found', context),
    }))
    return [...lost, ...found].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [lostItems, foundItems, matches, verifications])

  // Funnel counts for the recovery-progress visual: how many lost reports
  // have reached at least each stage of the lifecycle.
  const recoveryProgress = useMemo(() => {
    let matchedOrBeyond = 0
    let verificationOrBeyond = 0
    let verifiedCountLocal = 0

    for (const item of lostItems) {
      const derived = deriveReportStatus(item, 'lost', { matches, verifications })
      if (derived.status !== REPORT_STATUS.LOST) matchedOrBeyond += 1
      if (
        derived.status === REPORT_STATUS.IN_VERIFICATION ||
        derived.status === REPORT_STATUS.VERIFICATION_FAILED ||
        derived.status === REPORT_STATUS.VERIFIED
      ) {
        verificationOrBeyond += 1
      }
      if (derived.status === REPORT_STATUS.VERIFIED) verifiedCountLocal += 1
    }

    return {
      lost: lostItems.length,
      matched: matchedOrBeyond,
      inVerification: verificationOrBeyond,
      verified: verifiedCountLocal,
    }
  }, [lostItems, matches, verifications])

  const filteredReports = useMemo(() => {
    return combinedReports.filter((report) => {
      if (filter === 'all') return true
      if (filter === 'lost') return report.__type === 'lost'
      if (filter === 'found') return report.__type === 'found'
      if (filter === 'matched') return report.__derived.status === REPORT_STATUS.POTENTIAL_MATCH
      if (filter === 'in_verification') {
        return (
          report.__derived.status === REPORT_STATUS.IN_VERIFICATION ||
          report.__derived.status === REPORT_STATUS.VERIFICATION_FAILED
        )
      }
      if (filter === 'verified') return report.__derived.status === REPORT_STATUS.VERIFIED
      return true
    })
  }, [combinedReports, filter])

  const stats = [
    { label: 'Total Lost Reports', value: lostItems.length, hint: 'Filed by students' },
    { label: 'Total Found Reports', value: foundItems.length, hint: 'Logged by finders & desks' },
    { label: 'Potential Matches', value: matches.length, hint: `At ${MATCH_THRESHOLD}%+ confidence` },
    { label: 'Verified Matches / Recoveries', value: verifiedCount, hint: 'Ownership confirmed' },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Staff view"
        title="Dashboard"
        description="Live counts, reports, matches, and verifications pulled directly from Supabase."
        actions={
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading || refreshing}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            {lastUpdated ? (
              <p className="text-xs text-slate">Last updated {formatUpdatedAt(lastUpdated)}</p>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm font-medium text-red-700">
          Couldn&apos;t load the dashboard: {error}
        </div>
      ) : loading ? (
        <div className="grid gap-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-28" />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
              Recovery progress
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Lost', value: recoveryProgress.lost, tone: 'text-amber' },
                { label: 'Matched', value: recoveryProgress.matched, tone: 'text-leaf' },
                { label: 'In Verification', value: recoveryProgress.inVerification, tone: 'text-pine' },
                { label: 'Ready for Handover', value: recoveryProgress.verified, tone: 'text-pine' },
              ].map((stage, index, arr) => (
                <div key={stage.label} className="relative">
                  <div className="rounded-2xl border border-mist bg-paper p-4 text-center transition hover:-translate-y-0.5 hover:border-pine/30">
                    <p className={`font-display text-3xl font-semibold ${stage.tone}`}>
                      {stage.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
                      {stage.label}
                    </p>
                  </div>
                  {index < arr.length - 1 ? (
                    <span className="pointer-events-none absolute right-[-14px] top-1/2 hidden -translate-y-1/2 text-lg text-mist sm:block">
                      →
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-ink">Recent reports</h2>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      filter === f.key ? 'bg-ink text-sand' : 'bg-mist text-slate hover:text-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {combinedReports.length === 0 ? (
              <EmptyState message="No lost or found reports yet." />
            ) : filteredReports.length === 0 ? (
              <EmptyState message="No reports match this filter." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredReports.slice(0, 12).map((report) => (
                  <ReportCard
                    key={`${report.__type}-${report.id}`}
                    report={report}
                    derived={report.__derived}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
                Active lost items
                <span className="ml-2 text-base font-normal text-slate">({lostItems.length})</span>
              </h2>
              {lostItems.length === 0 ? (
                <EmptyState message="No lost reports yet" />
              ) : (
                <div className="grid gap-4">
                  {combinedReports
                    .filter((report) => report.__type === 'lost')
                    .map((report) => (
                      <ReportCard key={report.id} report={report} derived={report.__derived} />
                    ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
                Found items
                <span className="ml-2 text-base font-normal text-slate">({foundItems.length})</span>
              </h2>
              {foundItems.length === 0 ? (
                <EmptyState message="No found reports yet" />
              ) : (
                <div className="grid gap-4">
                  {combinedReports
                    .filter((report) => report.__type === 'found')
                    .map((report) => (
                      <ReportCard key={report.id} report={report} derived={report.__derived} />
                    ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
              Match activity
              <span className="ml-2 text-base font-normal text-slate">({matches.length})</span>
            </h2>
            {matches.length === 0 ? (
              <EmptyState message="No potential matches yet" />
            ) : (
              <div className="grid gap-4">
                {matches.slice(0, 8).map(({ lostItem, foundItem, score, reasons }) => {
                  const verification = verificationByPair.get(`${lostItem.id}_${foundItem.id}`)
                  return (
                    <Link
                      key={`${lostItem.id}-${foundItem.id}`}
                      to={`/verification?lost=${encodeURIComponent(lostItem.id)}&found=${encodeURIComponent(foundItem.id)}&score=${score}`}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mist bg-paper p-4 transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-[0_8px_20px_rgba(16,35,31,0.08)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <ItemThumb imageUrl={lostItem.image_url} label={lostItem.item_name} />
                          <ItemThumb imageUrl={foundItem.image_url} label={foundItem.item_name} />
                        </div>
                        <div>
                          <p className="font-semibold text-ink">
                            {lostItem.item_name}
                            <span className="mx-2 text-slate">→</span>
                            {foundItem.item_name}
                          </p>
                          <p className="mt-1 text-xs text-slate">{reasons.slice(0, 2).join(' • ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={deriveMatchPairStatus(score, verification)} />
                        <ScoreRing score={score} size={44} strokeWidth={4} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
              Verification activity
              <span className="ml-2 text-base font-normal text-slate">
                ({verifications.length})
              </span>
            </h2>
            {verifications.length === 0 ? (
              <EmptyState message="No verification attempts yet" />
            ) : (
              <div className="grid gap-4">
                {verifications.map((verification) => {
                  const lostItem = lostById.get(verification.lost_item_id)
                  const foundItem = foundById.get(verification.found_item_id)
                  if (!lostItem || !foundItem) return null

                  return (
                    <Link
                      key={verification.id}
                      to={`/verification?lost=${encodeURIComponent(lostItem.id)}&found=${encodeURIComponent(foundItem.id)}`}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mist bg-paper p-4 transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-[0_8px_20px_rgba(16,35,31,0.08)]"
                    >
                      <div>
                        <p className="font-semibold text-ink">
                          {lostItem.item_name}
                          <span className="mx-2 text-slate">→</span>
                          {foundItem.item_name}
                        </p>
                        <p className="mt-1 text-xs text-slate">
                          {verification.verified_at
                            ? `Verified ${formatDate(verification.verified_at)}`
                            : `Attempted ${formatDate(verification.created_at)}`}
                        </p>
                      </div>
                      <StatusBadge status={capitalize(verification.status)} />
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
