import { useEffect, useState } from 'react'
import type { ToastEvent, ToastType } from '../lib/toast'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const COLOR: Record<ToastType, string> = {
  error: 'bg-red-600',
  success: 'bg-green-600',
  info: 'bg-blue-600',
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handleToast(e: Event) {
      const { id, message, type } = (e as CustomEvent<ToastEvent>).detail
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
    }
    window.addEventListener('app:toast', handleToast)
    return () => window.removeEventListener('app:toast', handleToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      data-testid="toaster"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid={`toast-${t.id}`}
          className={`${COLOR[t.type]} text-white text-sm px-4 py-2 rounded shadow-lg max-w-sm`}
          role="alert"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
