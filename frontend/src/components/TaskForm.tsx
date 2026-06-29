import { useState } from 'react'
import type { TaskResponse } from '../types/task'
import type { ProjectResponse } from '../types/project'

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString()
}

interface TaskFormProps {
  task: TaskResponse | null
  projects: ProjectResponse[]
  onSave: (data: {
    description: string
    startTime: string
    endTime: string | undefined
    projectIds: string[]
  }) => void
  onCancel: () => void
  error: string | null
  isPending: boolean
}

export function TaskForm({ task, projects, onSave, onCancel, error, isPending }: TaskFormProps) {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

  const [description, setDescription] = useState(task?.description ?? '')
  const [startTime, setStartTime] = useState(task ? toDatetimeLocal(task.startTime) : defaultStart)
  const [endTime, setEndTime] = useState(task?.endTime ? toDatetimeLocal(task.endTime) : '')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(task?.projectIds ?? [])

  function toggleProject(id: string) {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      description,
      startTime: fromDatetimeLocal(startTime),
      endTime: endTime ? fromDatetimeLocal(endTime) : undefined,
      projectIds: selectedProjectIds,
    })
  }

  return (
    <div
      data-testid="task-form-overlay"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <form
        data-testid="task-form"
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
      >
        <h2 className="text-lg font-semibold mb-4">{task ? 'Edit Task' : 'Add Task'}</h2>

        {error && (
          <p data-testid="form-error" className="text-red-600 text-sm mb-3">
            {error}
          </p>
        )}

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Description</span>
          <input
            data-testid="task-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="mt-1 block w-full border rounded px-3 py-2 text-sm"
            placeholder="What are you working on?"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Start time</span>
          <input
            data-testid="task-start-time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="mt-1 block w-full border rounded px-3 py-2 text-sm"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">End time (leave empty if still running)</span>
          <input
            data-testid="task-end-time"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2 text-sm"
          />
        </label>

        {projects.length > 0 && (
          <fieldset className="mb-4">
            <legend className="text-sm font-medium text-gray-700 mb-1">Projects</legend>
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    data-testid={`project-checkbox-${p.id}`}
                    type="checkbox"
                    checked={selectedProjectIds.includes(p.id)}
                    onChange={() => toggleProject(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-testid="task-form-cancel"
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="task-form-save"
            disabled={isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
