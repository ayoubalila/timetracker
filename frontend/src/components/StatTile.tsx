interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: string
  active?: boolean
  onClick?: () => void
  testId?: string
}

export function StatTile({ icon, label, value, active, onClick, testId }: StatTileProps) {
  const className = `rounded-xl border bg-white p-4 text-left transition-colors sm:p-5 ${
    active ? 'border-accent ring-1 ring-accent' : 'border-slate-200 hover:border-slate-300'
  }`

  const content = (
    <>
      <div className="flex items-center gap-2 text-slate-500">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className="mt-3 font-mono text-2xl font-semibold tabular-nums text-slate-900 sm:text-3xl"
        data-testid={testId ? `${testId}-value` : undefined}
      >
        {value}
      </p>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} data-testid={testId} className={className}>
        {content}
      </button>
    )
  }

  return (
    <div data-testid={testId} className={className}>
      {content}
    </div>
  )
}
