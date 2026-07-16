interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  testId?: string
}

export function EmptyState({ icon, title, description, action, testId }: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
    >
      <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-xs text-sm text-slate-400">{description}</p>}
      {action}
    </div>
  )
}
