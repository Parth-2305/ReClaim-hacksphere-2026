import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useToast } from '../hooks/useToast.js'

const locations = [
  'Classroom',
  'Canteen',
  'Laboratory / Lab',
  'Computer Lab',
  'Library',
  'Reception',
  'Seminar Hall',
  'Auditorium',
  'College Office',
  'Security Desk',
  'Parking Area',
  'Playground / Sports Ground',
  'Washroom',
  'Staircase',
  'Corridor',
  'Other',
]
const categories = ['Bags', 'Electronics', 'IDs', 'Accessories', 'Personal', 'Other']

const inputClass =
  'rounded-xl border border-mist bg-sand px-3 py-2.5 font-normal outline-none transition-shadow ring-pine/30 focus:ring-2'

function Spinner() {
  return (
    <span
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sand/40 border-t-sand"
      aria-hidden="true"
    />
  )
}

export default function ReportForm({ type }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [locationValue, setLocationValue] = useState(locations[0])
  const isLost = type === 'lost'
  const showToast = useToast()

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return file ? URL.createObjectURL(file) : null
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) return
    setSubmitting(true)
    setError(null)

    const form = event.target
    const formData = new FormData(form)
    const itemName = formData.get('itemName')?.toString().trim()
    const category = formData.get('category')?.toString()
    const location = formData.get('location')?.toString().trim()
    const campusSelection = formData.get('campus')?.toString()
    const campus =
      campusSelection === 'Other'
        ? formData.get('campusOther')?.toString().trim() || 'Other'
        : campusSelection
    const date = formData.get('date')?.toString()
    const distinguishingDetail = formData.get('distinguishingDetail')?.toString().trim()
    const description = formData.get('description')?.toString().trim()
    const imageFile = formData.get('image')

    try {
      let imageUrl = null

      if (imageFile && imageFile.size > 0) {
        const fileExt = imageFile.name.split('.').pop()
        const filePath = `${isLost ? 'lost' : 'found'}/${crypto.randomUUID()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath)
        imageUrl = publicUrlData.publicUrl
      }

      const payload = {
        item_name: itemName,
        category,
        location,
        campus,
        distinguishing_detail: distinguishingDetail || null,
        description: description || null,
        image_url: imageUrl,
      }

      if (isLost) {
        payload.date_lost = date
      } else {
        payload.date_found = date
      }

      const { error: insertError } = await supabase
        .from(isLost ? 'lost_items' : 'found_items')
        .insert(payload)

      if (insertError) throw insertError

      form.reset()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setLocationValue(locations[0])
      setSubmitted(true)
      showToast(`${isLost ? 'Lost' : 'Found'} report saved`, 'success')
    } catch (err) {
      console.error(`Failed to submit ${isLost ? 'lost' : 'found'} report`, err)
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while submitting your report. Please try again.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-mist bg-paper p-8"
        style={{ animation: 'fade-in-up 0.3s ease-out' }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf/15 text-xl text-pine"
          style={{ animation: 'pop-in 0.35s ease-out' }}
        >
          ✓
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-pine">
          Submitted
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
          Report received
        </h2>
        <p className="mt-2 max-w-xl text-slate">
          Your {isLost ? 'lost' : 'found'} item report has been saved.{' '}
          {isLost
            ? "We'll check it against found reports and show potential matches on the Matches page."
            : 'It will now be checked against open lost reports for a potential match.'}
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand transition hover:opacity-90 active:scale-[0.98]"
        >
          File another report
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 rounded-2xl border border-mist bg-paper p-6 sm:p-8"
    >
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          Item details
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Item name
            <input
              required
              name="itemName"
              placeholder={isLost ? 'e.g. Navy backpack' : 'e.g. Silver calculator'}
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Category
            <select required name="category" defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            {isLost ? 'Where did you lose it?' : 'Where did you find it?'}
            <input
              required
              name="location"
              placeholder="Building, floor, or landmark"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Location
            <select
              required
              name="campus"
              value={locationValue}
              onChange={(event) => setLocationValue(event.target.value)}
              className={inputClass}
            >
              {locations.map((location) => (
                <option key={location}>{location}</option>
              ))}
            </select>
          </label>
          {locationValue === 'Other' ? (
            <label className="grid gap-2 text-sm font-medium text-ink">
              Specify location
              <input
                required
                name="campusOther"
                placeholder="e.g. Cafeteria rooftop"
                className={inputClass}
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-medium text-ink">
            Date
            <input required type="date" name="date" className={inputClass} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Distinguishing detail
            <input
              name="distinguishingDetail"
              placeholder="Color, sticker, initials, damage..."
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="h-px bg-mist" />

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          Description &amp; photo
        </p>
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Description
            <textarea
              rows="4"
              name="description"
              placeholder="Short description to help with a later match."
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Photo (optional)
            <div className="flex flex-wrap items-center gap-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected item preview"
                  className="h-16 w-16 shrink-0 rounded-xl border border-mist object-cover"
                />
              ) : null}
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                className={`${inputClass} flex-1 file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sand file:transition hover:file:opacity-90`}
              />
            </div>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate">
          Adding a photo is optional but helps with a later match.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Spinner /> : null}
          {submitting ? 'Submitting…' : `Submit ${isLost ? 'lost' : 'found'} report`}
        </button>
      </div>
      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
          style={{ animation: 'fade-in-up 0.2s ease-out' }}
        >
          {error}
        </p>
      )}
    </form>
  )
}
