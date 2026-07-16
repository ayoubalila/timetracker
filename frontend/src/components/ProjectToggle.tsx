import type { ProjectResponse } from '../types/project'

interface ProjectToggleProps {
  project: ProjectResponse
  checked: boolean
  onChange: () => void
  testId: string
}

export function ProjectToggle({ project, checked, onChange, testId }: ProjectToggleProps) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" data-testid={testId} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium text-white opacity-55 ring-2 ring-transparent ring-offset-1 transition-all peer-checked:opacity-100 peer-checked:ring-slate-900 peer-focus-visible:ring-accent"
        style={{ backgroundColor: project.color || '#6b7280' }}
      >
        {project.name}
      </span>
    </label>
  )
}
