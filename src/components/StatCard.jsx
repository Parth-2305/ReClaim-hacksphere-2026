export default function StatCard({ label, value, hint }) {
  return (
    <article className="group rounded-2xl border border-mist bg-paper p-5 shadow-[0_1px_0_rgba(16,35,31,0.04)] transition hover:-translate-y-0.5 hover:border-pine/30 hover:shadow-[0_10px_24px_rgba(16,35,31,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink transition-colors group-hover:text-pine">
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-slate">{hint}</p> : null}
    </article>
  )
}
