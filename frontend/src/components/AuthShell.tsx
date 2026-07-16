import { useEffect, useState } from 'react'

const FEATURES = [
  'Nest projects into subprojects — totals roll up automatically.',
  'Share projects with your team and see who logged what.',
  'Set budgets and hourly rates to catch overruns early.',
]

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return now
}

function BrandPanel() {
  const now = useClock()
  const time = now.toLocaleTimeString(undefined, { hour12: false })
  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-ink px-12 py-12 lg:flex lg:w-[44%] lg:flex-col lg:justify-between xl:w-2/5"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
        backgroundSize: '20px 20px',
      }}
    >
      <span className="text-lg font-semibold tracking-tight text-white">
        ⏱ TimeTracker
      </span>

      <div className="max-w-sm">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
          See exactly where your time goes.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Organize work into projects and subprojects, track hours as you go, and
          keep budgets and billing on track.
        </p>
        <ul className="mt-8 space-y-3">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-accent" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
          Local time
        </p>
        <p className="mt-1 font-mono text-2xl tabular-nums text-slate-300">{time}</p>
        <p className="mt-1 text-xs text-slate-500">{date}</p>
      </div>
    </div>
  )
}

interface AuthShellProps {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-white lg:bg-slate-50">
      <BrandPanel />
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <span className="mb-8 text-lg font-semibold tracking-tight text-slate-900 lg:hidden">
          ⏱ TimeTracker
        </span>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
