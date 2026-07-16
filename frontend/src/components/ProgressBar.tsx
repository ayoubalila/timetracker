interface ProgressBarProps {
  percent: number
  size?: 'sm' | 'md'
  testId?: string
}

export function ProgressBar({ percent, size = 'md', testId }: ProgressBarProps) {
  const color = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-yellow-400' : 'bg-blue-500'
  const height = size === 'sm' ? 'h-1' : 'h-2'
  return (
    <span data-testid={testId} className={`block w-full ${height} overflow-hidden rounded-full bg-slate-200`}>
      <span
        className={`block ${height} rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </span>
  )
}
