import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ItemThumb from '../components/ItemThumb.jsx'
import ScoreRing from '../components/ScoreRing.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { findMatches } from '../lib/matching.js'
import { deriveMatchPairStatus } from '../lib/reportStatus.js'

const SIGNAL_LABELS = [
  ['categorySim', 'Category'],
  ['nameSim', 'Item name'],
  ['descriptionSim', 'Description'],
  ['locationSim', 'Location'],
  ['campusSim', 'Campus'],
  ['dateSim', 'Date'],
  ['attributeSim', 'Attributes'],
]

function formatDate(dateStr) {
  if (!dateStr) return 'unknown date'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function SkeletonCard() {
  return (
    <div className="grid gap-4 rounded-3xl border border-mist bg-paper p-6 sm:p-8">
      <div className="flex justify-between">
        <div className="h-6 w-32 animate-pulse rounded-full bg-mist/60" />
        <div className="h-16 w-16 animate-pulse rounded-full bg-mist/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-2xl bg-mist/60" />
        <div className="h-24 animate-pulse rounded-2xl bg-mist/60" />
      </div>
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <div className="rounded-3xl border border-dashed border-mist bg-paper p-10 text-center text-sm text-slate">
      {children}
    </div>
  )
}

function SideDetails({ role, item, dateLabel, dateValue }) {
  const isLost = role === 'Lost'
  return (
    <div className={`flex gap-4 ${isLost ? '' : 'sm:flex-row-reverse sm:text-right'}`}>
      <ItemThumb imageUrl={item.image_url} label={`${role}: ${item.item_name}`} size="lg" />
      <div className="min-w-0">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.16em] ${isLost ? 'text-amber' : 'text-leaf'}`}
        >
          {role}
        </p>
        <p className="mt-1 truncate font-display text-lg font-semibold text-ink">
          {item.item_name}
        </p>
        <p className="mt-1 text-sm text-slate">{item.category}</p>
        <p className="truncate text-sm text-slate">
          {item.campus} · {item.location}
        </p>
        <p className="mt-1 text-xs text-slate">
          {dateLabel} {formatDate(dateValue)}
        </p>
      </div>
    </div>
  )
}

function MatchCard({ lostItem, foundItem, score, reasons, breakdown, verification }) {
  const status = deriveMatchPairStatus(score, verification)

  return (
    <article className="group overflow-hidden rounded-3xl border border-mist bg-paper transition hover:-translate-y-1 hover:border-pine/30 hover:shadow-[0_18px_40px_rgba(16,35,31,0.1)]">
      <div className="grid gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusBadge status={status} />
          <ScoreRing score={score} size={64} />
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <SideDetails role="Lost" item={lostItem} dateLabel="Lost" dateValue={lostItem.date_lost} />
          <div className="hidden justify-center sm:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-lg text-slate transition group-hover:bg-pine/10 group-hover:text-pine">
              ↔
            </span>
          </div>
          <SideDetails
            role="Found"
            item={foundItem}
            dateLabel="Found"
            dateValue={foundItem.date_found}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
            Signal breakdown
          </p>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {SIGNAL_LABELS.map(([key, label]) => {
              const value = Math.round((breakdown[key] ?? 0) * 100)
              return (
                <div key={key} className="flex items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 text-slate">{label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
                    <span
                      className="block h-full rounded-full bg-pine transition-[width] duration-500 ease-out"
                      style={{ width: `${value}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-semibold text-ink">{value}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
            Why this looks like a match
          </p>
          <ul className="flex flex-wrap gap-2">
            {reasons.map((reason) => (
              <li
                key={reason}
                className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink"
              >
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <Link
            to={`/verification?lost=${encodeURIComponent(lostItem.id)}&found=${encodeURIComponent(foundItem.id)}&score=${score}`}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:opacity-90 active:scale-[0.98]"
          >
            View match / Verify ownership
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function Matches() {
  const [lostItems, setLostItems] = useState([])
  const [foundItems, setFoundItems] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      setLoading(true)
      setError(null)
      try {
        const [lostResult, foundResult, verificationResult] = await Promise.all([
          supabase.from('lost_items').select('*').order('created_at', { ascending: false }),
          supabase.from('found_items').select('*').order('created_at', { ascending: false }),
          supabase.from('match_verifications').select('*'),
        ])

        if (lostResult.error) throw lostResult.error
        if (foundResult.error) throw foundResult.error
        if (verificationResult.error) throw verificationResult.error

        if (isMounted) {
          setLostItems(lostResult.data ?? [])
          setFoundItems(foundResult.data ?? [])
          setVerifications(verificationResult.data ?? [])
        }
      } catch (err) {
        console.error('Failed to load reports for matching', err)
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong while loading reports.',
          )
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadReports()

    return () => {
      isMounted = false
    }
  }, [])

  const matches = useMemo(() => findMatches(lostItems, foundItems), [lostItems, foundItems])
  const verificationByPair = useMemo(() => {
    const map = new Map()
    for (const verification of verifications) {
      map.set(`${verification.lost_item_id}_${verification.found_item_id}`, verification)
    }
    return map
  }, [verifications])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Review"
        title="Potential matches"
        description="Calculated live from current lost and found reports using category, name, description, location, campus, and timing signals."
        actions={
          <Link
            to="/verification"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand transition hover:opacity-90"
          >
            Go to verification
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm font-medium text-red-700">
          Couldn&apos;t load reports: {error}
        </div>
      ) : lostItems.length === 0 && foundItems.length === 0 ? (
        <EmptyState>No lost or found reports yet. Matches will appear here once reports come in.</EmptyState>
      ) : matches.length === 0 ? (
        <EmptyState>
          No potential matches yet from the current {lostItems.length} lost and{' '}
          {foundItems.length} found report{foundItems.length === 1 ? '' : 's'}.
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          {matches.map(({ lostItem, foundItem, score, reasons, breakdown }) => (
            <MatchCard
              key={`${lostItem.id}-${foundItem.id}`}
              lostItem={lostItem}
              foundItem={foundItem}
              score={score}
              reasons={reasons}
              breakdown={breakdown}
              verification={verificationByPair.get(`${lostItem.id}_${foundItem.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
