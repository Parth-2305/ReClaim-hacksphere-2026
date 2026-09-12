import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import ItemThumb from '../components/common/ItemThumb.jsx'
import ScoreRing from '../components/common/ScoreRing.jsx'
import { useToast } from '../hooks/useToast.js'
import { supabase } from '../services/supabaseClient.js'
import { computeMatchScore, checkAnswerMatch } from '../services/matching.js'

function formatDate(dateStr) {
  if (!dateStr) return 'an unknown date'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Verification() {
  const [searchParams] = useSearchParams()
  const lostId = searchParams.get('lost')
  const foundId = searchParams.get('found')
  const showToast = useToast()

  const [loading, setLoading] = useState(Boolean(lostId && foundId))
  const [loadError, setLoadError] = useState(null)
  const [lostItem, setLostItem] = useState(null)
  const [foundItem, setFoundItem] = useState(null)

  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  // null = not yet decided, 'success' = ownership verified, 'failed' = last attempt failed
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!lostId || !foundId) return

    let isMounted = true

    async function loadMatch() {
      setLoading(true)
      setLoadError(null)
      try {
        const [lostRes, foundRes, verificationRes] = await Promise.all([
          supabase.from('lost_items').select('*').eq('id', lostId).maybeSingle(),
          supabase.from('found_items').select('*').eq('id', foundId).maybeSingle(),
          supabase
            .from('match_verifications')
            .select('*')
            .eq('lost_item_id', lostId)
            .eq('found_item_id', foundId)
            .maybeSingle(),
        ])

        if (lostRes.error) throw lostRes.error
        if (foundRes.error) throw foundRes.error
        if (verificationRes.error) throw verificationRes.error

        if (!isMounted) return

        if (!lostRes.data || !foundRes.data) {
          setLoadError('This lost or found report could not be found. It may have been removed.')
          return
        }

        setLostItem(lostRes.data)
        setFoundItem(foundRes.data)

        if (verificationRes.data?.status === 'verified') setResult('success')
        else if (verificationRes.data?.status === 'failed') setResult('failed')
        else if (!verificationRes.data) {
          // Mark this pair as "in progress" the moment someone opens it, so
          // Dashboard/Matches can reflect that a verification attempt has
          // started even before an answer is submitted. Best-effort only --
          // never blocks the page, never affects the answer-checking logic.
          supabase
            .from('match_verifications')
            .upsert(
              { lost_item_id: lostId, found_item_id: foundId, status: 'pending' },
              { onConflict: 'lost_item_id,found_item_id' },
            )
            .then(({ error: pendingError }) => {
              if (pendingError) console.error('Failed to mark verification pending', pendingError)
            })
        }
      } catch (err) {
        console.error('Failed to load match for verification', err)
        if (isMounted) {
          setLoadError(
            err instanceof Error ? err.message : 'Something went wrong while loading this match.',
          )
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadMatch()

    return () => {
      isMounted = false
    }
  }, [lostId, foundId])

  async function handleVerify(event) {
    event.preventDefault()
    if (submitting || result === 'success') return

    const trimmedAnswer = answer.trim()
    if (!trimmedAnswer) {
      setFormError('Please describe a distinctive feature before submitting.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const { isMatch } = checkAnswerMatch(lostItem, trimmedAnswer)
      const nextStatus = isMatch ? 'verified' : 'failed'

      const { error: upsertError } = await supabase.from('match_verifications').upsert(
        {
          lost_item_id: lostItem.id,
          found_item_id: foundItem.id,
          status: nextStatus,
          verified_at: isMatch ? new Date().toISOString() : null,
        },
        { onConflict: 'lost_item_id,found_item_id' },
      )

      if (upsertError) throw upsertError

      setResult(isMatch ? 'success' : 'failed')
      if (!isMatch) setAnswer('')
      showToast(
        isMatch ? 'Ownership verified' : 'Verification failed',
        isMatch ? 'success' : 'error',
      )
    } catch (err) {
      console.error('Failed to save verification result', err)
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while checking your answer. Please try again.'
      setFormError(message)
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  let content

  if (!lostId || !foundId) {
    content = (
      <div className="rounded-2xl border border-mist bg-paper p-8">
        <p className="text-sm text-slate">
          No match selected. Choose a match from the Matches page to start ownership
          verification.
        </p>
        <Link
          to="/matches"
          className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand transition hover:opacity-90"
        >
          Go to matches
        </Link>
      </div>
    )
  } else if (loading) {
    content = (
      <div className="grid gap-4 rounded-2xl border border-mist bg-paper p-6 sm:p-8">
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
  } else if (loadError) {
    content = (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm font-medium text-red-700">
        {loadError}
      </div>
    )
  } else if (lostItem && foundItem) {
    const score = computeMatchScore(lostItem, foundItem).score
    const status =
      result === 'success' ? 'Ownership Verified' : result === 'failed' ? 'Verification Failed' : 'Potential Match'

    content = (
      <div className="grid gap-6">
        <div className="rounded-3xl border border-mist bg-paper p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StatusBadge status={status} />
            <ScoreRing score={score} size={64} />
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="flex gap-4">
              <ItemThumb imageUrl={lostItem.image_url} label={`Lost: ${lostItem.item_name}`} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber">
                  Lost
                </p>
                <p className="mt-1 truncate font-display text-lg font-semibold text-ink">
                  {lostItem.item_name}
                </p>
                <p className="mt-1 text-sm text-slate">{lostItem.category}</p>
                <p className="truncate text-sm text-slate">
                  {lostItem.campus} · {lostItem.location}
                </p>
                <p className="mt-1 text-xs text-slate">Lost {formatDate(lostItem.date_lost)}</p>
              </div>
            </div>

            <div className="hidden justify-center sm:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-lg text-slate">
                ↔
              </span>
            </div>

            <div className="flex gap-4 sm:flex-row-reverse sm:text-right">
              <ItemThumb imageUrl={foundItem.image_url} label={`Found: ${foundItem.item_name}`} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf">
                  Found
                </p>
                <p className="mt-1 truncate font-display text-lg font-semibold text-ink">
                  {foundItem.item_name}
                </p>
                <p className="mt-1 text-sm text-slate">{foundItem.category}</p>
                <p className="truncate text-sm text-slate">
                  {foundItem.campus} · {foundItem.location}
                </p>
                <p className="mt-1 text-xs text-slate">Found {formatDate(foundItem.date_found)}</p>
              </div>
            </div>
          </div>
        </div>

        {result === 'success' ? (
          <div
            className="rounded-3xl border border-pine/30 bg-pine p-6 text-sand sm:p-8"
            style={{ animation: 'fade-in-up 0.3s ease-out' }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-sand/15 text-2xl"
              style={{ animation: 'pop-in 0.35s ease-out' }}
            >
              ✓
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-leaf">
              Ownership verified
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              The claimant passed the ownership check
            </h2>
            <p className="mt-2 max-w-xl text-sand/80">
              This match is ready for handover. Staff can proceed to release the found
              item to the claimant.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleVerify}
            className="grid gap-4 rounded-3xl border border-mist bg-paper p-6 sm:p-8"
          >
            <div>
              <h3 className="text-lg font-semibold text-ink">Ownership check</h3>
              <p className="mt-1 text-sm text-slate">
                The claimant is whoever filed the original lost report. Their answer is
                checked against the distinguishing detail they gave when reporting it
                lost — it is not shown here.
              </p>
            </div>

            <label className="grid gap-2 text-sm font-medium text-ink">
              What distinctive feature does your item have?
              <textarea
                rows="3"
                required
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Describe a mark, sticker, damage, or other identifying detail..."
                className="rounded-xl border border-mist bg-sand px-3 py-2.5 font-normal outline-none transition-shadow ring-pine/30 focus:ring-2"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate">Only the claimant should answer this.</p>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <span
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sand/40 border-t-sand"
                    aria-hidden="true"
                  />
                ) : null}
                {submitting ? 'Checking…' : 'Verify ownership'}
              </button>
            </div>

            {result === 'failed' ? (
              <p
                className="rounded-xl border border-clay/30 bg-clay/10 px-3 py-2.5 text-sm font-medium text-clay"
                style={{ animation: 'fade-in-up 0.2s ease-out' }}
              >
                Verification failed. That description doesn&apos;t match our records for
                this item. You can try again.
              </p>
            ) : null}

            {formError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                {formError}
              </p>
            ) : null}
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Handover"
        title="Ownership verification"
        description="Confirms the claimant who filed the lost report is the true owner of the matched found item before handover."
      />
      {content}
    </div>
  )
}
