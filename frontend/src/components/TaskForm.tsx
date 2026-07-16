import { useEffect, useState } from 'react'
import type { TaskResponse } from '../types/task'
import type { ProjectResponse } from '../types/project'
import type { TagResponse } from '../types/tag'
import { TagPicker } from './TagPicker'
import { ProjectToggle } from './ProjectToggle'
import { Alert } from './Alert'
import { SpinnerIcon } from './icons'
import { toDatetimeLocalInTz, fromDatetimeLocalInTz } from '../utils/timezone'

interface TaskFormProps {
  task: TaskResponse | null
  projects: ProjectResponse[]
  tags: TagResponse[]
  onSave: (data: {
    description: string
    startTime: string
    endTime: string | undefined
    projectIds: string[]
    tagIds: string[]
  }) => void
  onCancel: () => void
  error: string | null
  isPending: boolean
  timezone?: string
}

const fieldClasses =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft'

export function TaskForm({ task, projects, tags, onSave, onCancel, error, isPending, timezone }: TaskFormProps) {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  const toLocal = (iso: string) => toDatetimeLocalInTz(iso, tz)
  const fromLocal = (value: string) => fromDatetimeLocalInTz(value, tz)
  const defaultStart = toDatetimeLocalInTz(new Date().toISOString(), tz)

  const [description, setDescription] = useState(task?.description ?? '')
  const [startTime, setStartTime] = useState(task ? toLocal(task.startTime) : defaultStart)
  const [endTime, setEndTime] = useState(task?.endTime ? toLocal(task.endTime) : '')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(task?.projectIds ?? [])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(task?.tags?.map((t) => t.id) ?? [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  function toggleProject(id: string) {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      description,
      startTime: fromLocal(startTime),
      endTime: endTime ? fromLocal(endTime) : undefined,
      projectIds: selectedProjectIds,
      tagIds: selectedTagIds,
    })
  }

  return (
    <div
      data-testid="task-form-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <form
        data-testid="task-form"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="task-form-title" className="text-lg font-semibold tracking-tight text-slate-900">
          {task ? 'Edit Task' : 'Add Task'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {task ? 'Update the details of this time entry.' : 'Log a task with an exact start and end time.'}
        </p>

        <div className="mt-5 space-y-4">
          {error && <Alert variant="error" message={error} testId="form-error" />}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <input
              data-testid="task-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className={fieldClasses}
              placeholder="What are you working on?"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Start time</span>
              <input
                data-testid="task-start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className={fieldClasses}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                End time{task !== null ? ' (leave empty if still running)' : ''}
              </span>
              <input
                data-testid="task-end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required={task === null}
                className={fieldClasses}
              />
            </label>
          </div>

          {projects.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-slate-700">Projects</legend>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <ProjectToggle
                    key={p.id}
                    project={p}
                    checked={selectedProjectIds.includes(p.id)}
                    onChange={() => toggleProject(p.id)}
                    testId={`project-checkbox-${p.id}`}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <TagPicker tags={tags} selected={selectedTagIds} onChange={setSelectedTagIds} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            data-testid="task-form-cancel"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="task-form-save"
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && <SpinnerIcon className="h-4 w-4" />}
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
