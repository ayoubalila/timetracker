import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LiveTimer } from '../components/LiveTimer'
import { TaskForm } from '../components/TaskForm'
import { getCurrentTask, listTasks, startTask, stopTask, createTask, updateTask, deleteTask } from '../api/tasks'
import { listProjects } from '../api/projects'
import { logoutApi } from '../api/auth'
import type { TaskResponse } from '../types/task'

interface DashboardPageProps {
  username: string
  onLogout: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(startIso: string, endIso: string | null): string {
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const secs = Math.floor((end - new Date(startIso).getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function DashboardPage({ username, onLogout }: DashboardPageProps) {
  const queryClient = useQueryClient()
  const [showStartForm, setShowStartForm] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null)
  const [startDescription, setStartDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: currentTaskData } = useQuery({
    queryKey: ['current-task'],
    queryFn: getCurrentTask,
  })
  const currentTask = currentTaskData && typeof currentTaskData === 'object' && 'id' in currentTaskData
    ? currentTaskData
    : null

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks(),
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const startMutation = useMutation({
    mutationFn: startTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-task'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowStartForm(false)
      setStartDescription('')
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const stopMutation = useMutation({
    mutationFn: stopTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-task'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowAddForm(false)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTask>[1] }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['current-task'] })
      setEditingTask(null)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['current-task'] })
    },
  })

  function handleLogout() {
    logoutApi()
    onLogout()
  }

  function handleStart(e: React.FormEvent) {
    e.preventDefault()
    startMutation.mutate({ description: startDescription || undefined })
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this task?')) {
      deleteMutation.mutate(id)
    }
  }

  const completedTasks = Array.isArray(tasks)
    ? tasks.filter((t: TaskResponse) => t.endTime !== null)
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg">⏱ TimeTracker</span>
        <Link to="/dashboard" className="text-blue-600 font-medium text-sm" data-testid="nav-dashboard">
          Dashboard
        </Link>
        <Link to="/projects" className="text-gray-600 hover:text-blue-600 text-sm" data-testid="nav-projects">
          Projects
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-600">{username}</span>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Current task */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Current Task
          </h2>
          {currentTask ? (
            <div
              data-testid="current-task-panel"
              className="bg-white border rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <p data-testid="current-task-description" className="font-medium">
                  {currentTask.description || '(no description)'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Started {formatTime(currentTask.startTime)}
                </p>
              </div>
              <LiveTimer startTime={currentTask.startTime} />
              <button
                data-testid="stop-button"
                onClick={() => stopMutation.mutate(currentTask.id)}
                disabled={stopMutation.isPending}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Stop
              </button>
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-4">
              {showStartForm ? (
                <form data-testid="start-form" onSubmit={handleStart} className="flex gap-2">
                  <input
                    data-testid="start-description"
                    type="text"
                    value={startDescription}
                    onChange={(e) => setStartDescription(e.target.value)}
                    placeholder="What are you working on?"
                    className="flex-1 border rounded px-3 py-1.5 text-sm"
                    autoFocus
                  />
                  <button
                    type="submit"
                    data-testid="start-submit"
                    disabled={startMutation.isPending}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    data-testid="start-cancel"
                    onClick={() => setShowStartForm(false)}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {formError && (
                    <p data-testid="start-error" className="text-red-600 text-sm">{formError}</p>
                  )}
                </form>
              ) : (
                <button
                  data-testid="start-task-button"
                  onClick={() => setShowStartForm(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ▶ Start new task
                </button>
              )}
            </div>
          )}
        </section>

        {/* Task list */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tasks
            </h2>
            <button
              data-testid="add-task-button"
              onClick={() => { setShowAddForm(true); setFormError(null) }}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add task
            </button>
          </div>

          {tasksLoading ? (
            <p className="text-sm text-gray-500" data-testid="tasks-loading">Loading…</p>
          ) : completedTasks.length === 0 ? (
            <p className="text-sm text-gray-500" data-testid="tasks-empty">No completed tasks yet.</p>
          ) : (
            <ul data-testid="task-list" className="space-y-2">
              {completedTasks.map((task: TaskResponse) => (
                <li
                  key={task.id}
                  data-testid={`task-item-${task.id}`}
                  className="bg-white border rounded-lg px-4 py-3 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {task.description || '(no description)'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(task.startTime)} – {task.endTime ? formatTime(task.endTime) : '—'}{' '}
                      · {formatDuration(task.startTime, task.endTime)}
                    </p>
                  </div>
                  <button
                    data-testid={`edit-task-${task.id}`}
                    onClick={() => { setEditingTask(task); setFormError(null) }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    data-testid={`delete-task-${task.id}`}
                    onClick={() => handleDelete(task.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Task form modal (add manual) */}
      {showAddForm && (
        <TaskForm
          task={null}
          projects={projects}
          onSave={(data) =>
            createMutation.mutate({
              description: data.description || undefined,
              startTime: data.startTime,
              endTime: data.endTime,
              projectIds: data.projectIds,
            })
          }
          onCancel={() => { setShowAddForm(false); setFormError(null) }}
          error={formError}
          isPending={createMutation.isPending}
        />
      )}

      {/* Task form modal (edit) */}
      {editingTask && (
        <TaskForm
          task={editingTask}
          projects={projects}
          onSave={(data) =>
            updateMutation.mutate({
              id: editingTask.id,
              data: {
                description: data.description || undefined,
                startTime: data.startTime,
                endTime: data.endTime,
                projectIds: data.projectIds,
              },
            })
          }
          onCancel={() => { setEditingTask(null); setFormError(null) }}
          error={formError}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}
