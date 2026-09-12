import { Link, useLocation } from 'react-router-dom'

const titles = {
  '/': 'Campus lost & found',
  '/report-lost': 'Report a lost item',
  '/report-found': 'Report a found item',
  '/matches': 'Potential matches',
  '/verification': 'Ownership verification',
  '/dashboard': 'Operations dashboard',
}

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-mist bg-paper/90 px-4 py-3 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-mist px-3 py-2 text-sm font-medium lg:hidden"
          aria-label="Open navigation"
        >
          Menu
        </button>
        <Link to="/" className="transition-opacity hover:opacity-70">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">
            RECLAIM
          </p>
          <p className="text-sm font-semibold text-ink">
            {titles[pathname] ?? 'RECLAIM'}
          </p>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full bg-leaf/15 px-3 py-1 text-xs font-semibold text-pine sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
          Live data
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-sand">
          PM
        </div>
      </div>
    </header>
  )
}
