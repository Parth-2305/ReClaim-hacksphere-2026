import { useCallback, useState } from 'react'
import { ToastContext } from '../../hooks/toastContext.js'

let idCounter = 0

const ICONS = {
  success: '✓',
  error: '!',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = (idCounter += 1)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3400)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_12px_28px_rgba(16,35,31,0.18)] ${
              toast.type === 'error'
                ? 'border-clay/30 bg-paper text-clay'
                : 'border-pine/20 bg-ink text-sand'
            }`}
            style={{ animation: 'toast-in 0.25s ease-out' }}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                toast.type === 'error' ? 'bg-clay/15 text-clay' : 'bg-leaf/25 text-sand'
              }`}
            >
              {ICONS[toast.type] ?? ICONS.success}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
