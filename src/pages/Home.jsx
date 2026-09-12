import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/common/StatCard.jsx'
import { supabase } from '../services/supabaseClient.js'
import { findMatches, MATCH_THRESHOLD } from '../services/matching.js'

const flow = [
  {
    step: '01',
    title: 'Report',
    body: 'File a lost or found report with a photo, location, and a few identifying details.',
  },
  {
    step: '02',
    title: 'Match',
    body: 'A multi-signal algorithm compares category, name, description, location, and timing.',
  },
  {
    step: '03',
    title: 'Verify',
    body: 'The claimant answers a private ownership question before anything changes hands.',
  },
  {
    step: '04',
    title: 'Reclaim',
    body: 'A verified match is marked ready for handover back to its owner.',
  },
]

export default function Home() {
  const [lostItems, setLostItems] = useState([])
  const [foundItems, setFoundItems] = useState([])
  const [verifiedCount, setVerifiedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      try {
        const [lostRes, foundRes, verifiedRes] = await Promise.all([
          supabase.from('lost_items').select('*'),
          supabase.from('found_items').select('*'),
          supabase
            .from('match_verifications')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'verified'),
        ])

        if (!isMounted) return
        if (!lostRes.error) setLostItems(lostRes.data ?? [])
        if (!foundRes.error) setFoundItems(foundRes.data ?? [])
        if (!verifiedRes.error) setVerifiedCount(verifiedRes.count ?? 0)
      } catch (err) {
        console.error('Failed to load home stats', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadStats()

    return () => {
      isMounted = false
    }
  }, [])

  const matchCount = useMemo(() => findMatches(lostItems, foundItems).length, [lostItems, foundItems])

  const stats = [
    { label: 'Lost Reports', value: loading ? '–' : lostItems.length, hint: 'Filed by students' },
    { label: 'Found Reports', value: loading ? '–' : foundItems.length, hint: 'Logged by finders & desks' },
    {
      label: 'Potential Matches',
      value: loading ? '–' : matchCount,
      hint: `At ${MATCH_THRESHOLD}%+ confidence`,
    },
    { label: 'Verified Recoveries', value: loading ? '–' : verifiedCount, hint: 'Ownership confirmed' },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-[28px] bg-ink px-6 py-12 text-sand sm:px-10 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber">
          College lost &amp; found
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
          Lost shouldn&apos;t mean gone.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-sand/75 sm:text-lg">
          RECLAIM is a campus platform for reporting lost and found belongings, spotting
          likely matches with a real matching engine, and verifying ownership before
          anything is handed back.
        </p>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          <Link
            to="/report-lost"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-sand/15 bg-sand/5 px-6 py-5 transition hover:-translate-y-0.5 hover:border-amber/50 hover:bg-sand/10"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber">
                Students
              </p>
              <p className="mt-1 font-display text-xl font-semibold">I Lost Something</p>
              <p className="mt-1 text-sm text-sand/60">Tell us what went missing.</p>
            </div>
            <span className="text-2xl text-sand/40 transition-transform group-hover:translate-x-1 group-hover:text-amber">
              →
            </span>
          </Link>
          <Link
            to="/report-found"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-sand/15 bg-sand/5 px-6 py-5 transition hover:-translate-y-0.5 hover:border-leaf/60 hover:bg-sand/10"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf">
                Finders &amp; desks
              </p>
              <p className="mt-1 font-display text-xl font-semibold">I Found Something</p>
              <p className="mt-1 text-sm text-sand/60">Log it so an owner can claim it.</p>
            </div>
            <span className="text-2xl text-sand/40 transition-transform group-hover:translate-x-1 group-hover:text-leaf">
              →
            </span>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
            How it works
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
            Report → Match → Verify → Reclaim
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {flow.map((item, index) => (
            <div key={item.step} className="group relative">
              <article className="h-full rounded-2xl border border-mist bg-paper p-6 transition hover:-translate-y-1 hover:border-pine/40 hover:shadow-[0_12px_28px_rgba(16,35,31,0.08)]">
                <p className="font-display text-3xl text-pine transition-colors group-hover:text-leaf">
                  {item.step}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{item.body}</p>
              </article>
              {index < flow.length - 1 ? (
                <span className="pointer-events-none absolute right-[-14px] top-1/2 hidden -translate-y-1/2 text-xl text-mist lg:block">
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
