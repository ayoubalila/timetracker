import { useEffect, useState } from 'react'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function LiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)),
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return <span data-testid="live-timer">{formatDuration(elapsed)}</span>
}
