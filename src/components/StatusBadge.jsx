const styles = {
  Open: 'bg-amber/15 text-ink',
  Unclaimed: 'bg-mist text-pine',
  Matched: 'bg-leaf/15 text-pine',
  Returned: 'bg-pine text-sand',
  'Needs review': 'bg-amber/15 text-ink',
  'In verification': 'bg-leaf/15 text-pine',
  'In Verification': 'bg-leaf/15 text-pine',
  Verified: 'bg-pine text-sand',
  'Possible Match': 'bg-leaf/15 text-pine',
  'High Confidence': 'bg-pine text-sand',
  'Potential Match': 'bg-leaf/15 text-pine',
  'Ownership Verified': 'bg-pine text-sand',
  'Verification Failed': 'bg-clay/15 text-clay',
  Lost: 'bg-amber/15 text-ink',
  Found: 'bg-leaf/15 text-pine',
  Pending: 'bg-mist text-slate',
  Failed: 'bg-clay/15 text-clay',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? 'bg-mist text-slate'}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
      {status}
    </span>
  )
}
