import StatusBadge from './StatusBadge.jsx'

export default function ItemCard({ item }) {
  return (
    <article className="rounded-2xl border border-mist bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">
            {item.id} · {item.category}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{item.title}</h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-slate">
        <div className="flex justify-between gap-4">
          <dt>Type</dt>
          <dd className="font-medium capitalize text-ink">{item.type}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Location</dt>
          <dd className="text-right font-medium text-ink">{item.location}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Reported</dt>
          <dd className="font-medium text-ink">{item.date}</dd>
        </div>
      </dl>
    </article>
  )
}
