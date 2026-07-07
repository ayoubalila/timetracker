import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LiveTimer } from '../components/LiveTimer'
import { TaskForm } from '../components/TaskForm'
import {
  getCurrentTask,
  listTasks,
  startTask,
  stopTask,
  createTask,
  updateTask,
  deleteTask,
  getOverviewDay,
  getOverviewWeek,
  getOverviewMonth,
} from '../api/tasks'
import { listTags } from '../api/tags'
import { listProjects } from '../api/projects'
import { logoutApi } from '../api/auth'
import { ApiError } from '../api/client'
import { toast } from '../lib/toast'
import { formatTimeInTz, formatDateInTz } from '../utils/timezone'
import type { TaskResponse } from '../types/task'

type Tab = 'all' | 'day' | 'week' | 'month'
type SortKey = 'startTime' | 'endTime' | 'duration' | 'description'
type SortDir = 'asc' | 'desc'

interface DashboardPageProps {
  username: string
  onLogout: () => void
  timezone: string
}

function durationSeconds(task: TaskResponse): number {
  const end = task.endTime ? new Date(task.endTime).getTime() : Date.now()
  return Math.max(0, Math.floor((end - new Date(task.startTime).getTime()) / 1000))
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function totalDuration(tasks: TaskResponse[]): string {
  const secs = tasks.reduce((sum, t) => sum + durationSeconds(t), 0)
  return formatDuration(secs)
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>
  return <span className="text-blue-600 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export function DashboardPage({ username, onLogout, timezone }: DashboardPageProps) {
  const formatTime = (iso: string) => formatTimeInTz(iso, timezone)
  const formatDate = (iso: string) => formatDateInTz(iso, timezone)
  const queryClient = useQueryClient()
  const location = useLocation()
  const locationState = location.state as { startProjectIds?: string[]; autoOpen?: boolean } | null
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [showStartForm, setShowStartForm] = useState(locationState?.autoOpen === true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null)
  const [startDescription, setStartDescription] = useState('')
  const [startProjectIds, setStartProjectIds] = useState<string[]>(locationState?.startProjectIds ?? [])
  const [formError, setFormError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('startTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterTagId, setFilterTagId] = useState<string | null>(null)

  const { data: currentTaskData, isLoading: currentTaskLoading } = useQuery({
    queryKey: ['current-task'],
    queryFn: getCurrentTask,
  })
  const currentTask =
    currentTaskData && typeof currentTaskData === 'object' && 'id' in currentTaskData
      ? currentTaskData
      : null

  const { data: allTasks = [], isLoading: allLoading } = useQuery({
    queryKey: ['tasks', filterTagId],
    queryFn: () => listTasks(undefined, undefined, filterTagId ?? undefined),
    enabled: activeTab === 'all',
  })

  const { data: dayTasks = [], isLoading: dayLoading } = useQuery({
    queryKey: ['overview-day', filterTagId],
    queryFn: () => getOverviewDay(filterTagId ?? undefined),
    enabled: activeTab === 'day',
  })

  const { data: weekTasks = [], isLoading: weekLoading } = useQuery({
    queryKey: ['overview-week', filterTagId],
    queryFn: () => getOverviewWeek(filterTagId ?? undefined),
    enabled: activeTab === 'week',
  })

  const { data: monthTasks = [], isLoading: monthLoading } = useQuery({
    queryKey: ['overview-month', filterTagId],
    queryFn: () => getOverviewMonth(filterTagId ?? undefined),
    enabled: activeTab === 'month',
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  })

  const rawTasks: TaskResponse[] =
    activeTab === 'day'
      ? dayTasks
      : activeTab === 'week'
        ? weekTasks
        : activeTab === 'month'
          ? monthTasks
          : allTasks

  const isLoading = activeTab === 'day' ? dayLoading : activeTab === 'week' ? weekLoading : activeTab === 'month' ? monthLoading : allLoading

  const completedTasks = rawTasks.filter((t) => t.endTime !== null)

  const sortedTasks = [...completedTasks].sort((a, b) => {
    let diff = 0
    if (sortKey === 'startTime') diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    else if (sortKey === 'endTime') diff = new Date(a.endTime!).getTime() - new Date(b.endTime!).getTime()
    else if (sortKey === 'duration') diff = durationSeconds(a) - durationSeconds(b)
    else if (sortKey === 'description') diff = (a.description ?? '').localeCompare(b.description ?? '')
    return sortDir === 'asc' ? diff : -diff
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const startMutation = useMutation({
    mutationFn: startTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-task'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['overview-day'] })
      setShowStartForm(false)
      setStartDescription('')
      setStartProjectIds([])
      setFormError(null)
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('A task is already running. Stop it before starting a new one.')
        queryClient.invalidateQueries({ queryKey: ['current-task'] })
      } else {
        setFormError(err.message)
      }
    },
  })

  const stopMutation = useMutation({
    mutationFn: stopTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-task'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['overview-day'] })
      queryClient.invalidateQueries({ queryKey: ['overview-week'] })
      queryClient.invalidateQueries({ queryKey: ['overview-month'] })
    },
    onError: (err: Error) => toast(err.message || 'Failed to stop task'),
  })

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['overview-day'] })
      queryClient.invalidateQueries({ queryKey: ['overview-week'] })
      queryClient.invalidateQueries({ queryKey: ['overview-month'] })
      setShowAddForm(false)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTask>[1] }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['current-task'] })
      queryClient.invalidateQueries({ queryKey: ['overview-day'] })
      queryClient.invalidateQueries({ queryKey: ['overview-week'] })
      queryClient.invalidateQueries({ queryKey: ['overview-month'] })
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
      queryClient.invalidateQueries({ queryKey: ['overview-day'] })
      queryClient.invalidateQueries({ queryKey: ['overview-week'] })
      queryClient.invalidateQueries({ queryKey: ['overview-month'] })
    },
    onError: (err: Error) => toast(err.message || 'Failed to delete task'),
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (currentTask) {
          stopMutation.mutate(currentTask.id)
        } else if (!showStartForm) {
          setShowStartForm(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTask, showStartForm, stopMutation])

  function handleLogout() {
    logoutApi()
    onLogout()
  }

  function handleStart(e: React.FormEvent) {
    e.preventDefault()
    startMutation.mutate({ description: startDescription || undefined, projectIds: startProjectIds })
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this task?')) {
      deleteMutation.mutate(id)
    }
  }

  const tabLabels: Record<Tab, string> = {
    all: 'All',
    day: 'Today',
    week: 'This week',
    month: 'This month',
  }

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
        <Link to="/settings" className="text-gray-600 hover:text-blue-600 text-sm" data-testid="nav-settings">
          Settings
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

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Current task */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Current Task</h2>
          {currentTaskLoading ? (
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-400" data-testid="current-task-loading">Loading…</p>
            </div>
          ) : currentTask ? (
            <div
              data-testid="current-task-panel"
              className="bg-white border rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <p data-testid="current-task-description" className="font-medium">
                  {currentTask.description || '(no description)'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Started {formatTime(currentTask.startTime)}</p>
                {(currentTask.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentTask.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
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
                <form data-testid="start-form" onSubmit={handleStart} className="space-y-2">
                  <div className="flex gap-2">
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
                      onClick={() => {
                        setShowStartForm(false)
                        setStartProjectIds([])
                        setFormError(null)
                      }}
                      className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {projects.length > 0 && (
                    <fieldset>
                      <legend className="text-xs text-gray-500 mb-1">Projects (optional)</legend>
                      <div className="flex flex-wrap gap-2">
                        {projects.map((p) => (
                          <label key={p.id} className="flex items-center gap-1 text-sm cursor-pointer">
                            <input
                              data-testid={`start-project-${p.id}`}
                              type="checkbox"
                              checked={startProjectIds.includes(p.id)}
                              onChange={() =>
                                setStartProjectIds(
                                  startProjectIds.includes(p.id)
                                    ? startProjectIds.filter((id) => id !== p.id)
                                    : [...startProjectIds, p.id],
                                )
                              }
                            />
                            <span
                              className="px-2 py-0.5 rounded text-xs text-white"
                              style={{ backgroundColor: p.color || '#6b7280' }}
                            >
                              {p.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {formError && (
                    <p data-testid="start-error" className="text-red-600 text-sm">
                      {formError}
                    </p>
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

        {/* Task overview tabs */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-1">
              {(['all', 'day', 'week', 'month'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  data-testid={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-sm rounded ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {tags.length > 0 && (
                <select
                  value={filterTagId ?? ''}
                  onChange={(e) => setFilterTagId(e.target.value || null)}
                  className="border rounded px-2 py-1 text-xs"
                  data-testid="tag-filter-select"
                >
                  <option value="">All tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                data-testid="add-task-button"
                onClick={() => {
                  setShowAddForm(true)
                  setFormError(null)
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add task
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500" data-testid="tasks-loading">
              Loading…
            </p>
          ) : sortedTasks.length === 0 ? (
            <p className="text-sm text-gray-500" data-testid="tasks-empty">
              No completed tasks{activeTab !== 'all' ? ` for ${tabLabels[activeTab].toLowerCase()}` : ''}.
            </p>
          ) : (
            <>
              <div className="bg-white border rounded-lg overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <button
                    className="text-left flex items-center"
                    onClick={() => handleSort('description')}
                    data-testid="sort-description"
                  >
                    Description
                    <SortIcon active={sortKey === 'description'} dir={sortDir} />
                  </button>
                  <button
                    className="text-right flex items-center justify-end"
                    onClick={() => handleSort('startTime')}
                    data-testid="sort-start"
                  >
                    Start
                    <SortIcon active={sortKey === 'startTime'} dir={sortDir} />
                  </button>
                  <button
                    className="text-right flex items-center justify-end"
                    onClick={() => handleSort('endTime')}
                    data-testid="sort-end"
                  >
                    End
                    <SortIcon active={sortKey === 'endTime'} dir={sortDir} />
                  </button>
                  <button
                    className="text-right flex items-center justify-end"
                    onClick={() => handleSort('duration')}
                    data-testid="sort-duration"
                  >
                    Duration
                    <SortIcon active={sortKey === 'duration'} dir={sortDir} />
                  </button>
                  <span className="text-right">Actions</span>
                </div>

                {/* Task rows */}
                <ul data-testid="task-list">
                  {sortedTasks.map((task) => (
                    <li
                      key={task.id}
                      data-testid={`task-item-${task.id}`}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 border-b last:border-0 items-center text-sm"
                    >
                      <span className="truncate font-medium">
                        {task.description || '(no description)'}
                        {(task.tags?.length ?? 0) > 0 && (
                          <span className="ml-2 inline-flex gap-1 flex-wrap">
                            {task.tags?.map((tag) => (
                              <span
                                key={tag.id}
                                data-testid={`task-tag-${task.id}-${tag.id}`}
                                className="px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="text-gray-500 text-right whitespace-nowrap">
                        {activeTab !== 'day' && (
                          <span className="mr-1 text-xs text-gray-400">{formatDate(task.startTime)}</span>
                        )}
                        {formatTime(task.startTime)}
                      </span>
                      <span className="text-gray-500 text-right whitespace-nowrap">
                        {task.endTime ? formatTime(task.endTime) : '—'}
                      </span>
                      <span className="text-gray-700 text-right font-medium whitespace-nowrap">
                        {formatDuration(durationSeconds(task))}
                      </span>
                      <span className="flex gap-2 justify-end">
                        <button
                          data-testid={`edit-task-${task.id}`}
                          onClick={() => {
                            setEditingTask(task)
                            setFormError(null)
                          }}
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
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Total row */}
              <div className="mt-2 text-right text-sm text-gray-600" data-testid="total-duration">
                Total: <span className="font-semibold">{totalDuration(completedTasks)}</span>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Task form modal (add manual) */}
      {showAddForm && (
        <TaskForm
          task={null}
          projects={projects}
          tags={tags}
          timezone={timezone}
          onSave={(data) =>
            createMutation.mutate({
              description: data.description || undefined,
              startTime: data.startTime,
              endTime: data.endTime,
              projectIds: data.projectIds,
              tagIds: data.tagIds,
            })
          }
          onCancel={() => {
            setShowAddForm(false)
            setFormError(null)
          }}
          error={formError}
          isPending={createMutation.isPending}
        />
      )}

      {/* Task form modal (edit) */}
      {editingTask && (
        <TaskForm
          task={editingTask}
          projects={projects}
          tags={tags}
          timezone={timezone}
          onSave={(data) =>
            updateMutation.mutate({
              id: editingTask.id,
              data: {
                description: data.description || undefined,
                startTime: data.startTime,
                endTime: data.endTime,
                projectIds: data.projectIds,
                tagIds: data.tagIds,
              },
            })
          }
          onCancel={() => {
            setEditingTask(null)
            setFormError(null)
          }}
          error={formError}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}
