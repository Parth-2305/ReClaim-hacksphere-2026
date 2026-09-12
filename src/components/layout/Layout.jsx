import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-svh bg-sand lg:grid lg:grid-cols-[260px_1fr]">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-svh">
          <Sidebar />
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-svh flex-col">
        <Header onMenuClick={() => setOpen(true)} />
        <main className="flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
