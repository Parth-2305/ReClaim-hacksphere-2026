import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/report-lost', label: 'Report Lost' },
  { to: '/report-found', label: 'Report Found' },
  { to: '/matches', label: 'Matches' },
  { to: '/verification', label: 'Verification' },
  { to: '/dashboard', label: 'Dashboard' },
]

function linkClass({ isActive }) {
  return [
    'group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
    isActive
      ? 'bg-white/10 text-sand shadow-[inset_2px_0_0_0_var(--color-leaf)]'
      : 'text-sand/70 hover:translate-x-0.5 hover:bg-white/5 hover:text-sand',
  ].join(' ')
}

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="flex h-full flex-col bg-ink text-sand">
      <Link
        to="/"
        onClick={onNavigate}
        className="block border-b border-white/10 px-5 py-6 transition-opacity hover:opacity-80"
      >
        <p className="font-display text-2xl font-semibold tracking-tight">RECLAIM</p>
        <p className="mt-1 text-sm text-sand/60">Lost shouldn&apos;t mean gone.</p>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={linkClass}
            onClick={onNavigate}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-t border-white/10 p-5 text-xs leading-5 text-sand/55">
        <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
        Live on HackSphere 2026
      </div>
    </aside>
  )
}
