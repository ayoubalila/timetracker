import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LiveTimer } from '../components/LiveTimer'
import { TagPicker } from '../components/TagPicker'
import { TaskForm } from '../components/TaskForm'
import { ProjectToggle } from '../components/ProjectToggle'
import { AppHeader } from '../components/AppHeader'
import { StatTile } from '../components/StatTile'
import { EmptyState } from '../components/EmptyState'
import { Alert } from '../components/Alert'
import {
  PlayIcon,
  StopIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
  BarChartIcon,
  InboxIcon,
  AlertIcon,
  SpinnerIcon,
} from '../components/icons'
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
import { listProjects, getProject } from '../api/projects'
import { logoutApi } from '../api/auth'
import { ApiError } from '../api/client'
import { toast } from '../lib/toast'
import { formatTimeInTz, formatDateInTz } from '../utils/timezone'
import type { TaskResponse } from '../types/task'
import type { ProjectResponse } from '../types/project'

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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function totalDuration(tasks: TaskResponse[]): string {
  const secs = tasks.reduce((sum, t) => sum + durationSeconds(t), 0)
  return formatDuration(secs)
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>
  return <span className="ml-1 text-accent">{dir === 'asc' ? '↑' : '↓'}</span>
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
  const [startTagIds, setStartTagIds] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('startTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterTagId, setFilterTagId] = useState<string | null>(null)
  const [budgetAlerts, setBudgetAlerts] = useState<{ name: string; percent: number; exceeded: boolean }[]>([])
  const preStopProjectIds = useRef<string[]>([])

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

  // Day/week/month overviews are always fetched (not just when their tab is active) so the
  // stats strip can show live totals no matter which tab the user is currently viewing.
  const { data: dayTasks = [], isLoading: dayLoading } = useQuery({
    queryKey: ['overview-day', filterTagId],
    queryFn: () => getOverviewDay(filterTagId ?? undefined),
  })

  const { data: weekTasks = [], isLoading: weekLoading } = useQuery({
    queryKey: ['overview-week', filterTagId],
    queryFn: () => getOverviewWeek(filterTagId ?? undefined),
  })

  const { data: monthTasks = [], isLoading: monthLoading } = useQuery({
    queryKey: ['overview-month', filterTagId],
    queryFn: () => getOverviewMonth(filterTagId ?? undefined),
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
  const todayTotal = totalDuration(dayTasks.filter((t) => t.endTime !== null))
  const weekTotal = totalDuration(weekTasks.filter((t) => t.endTime !== null))
  const monthTotal = totalDuration(monthTasks.filter((t) => t.endTime !== null))

  const currentProjectChips: ProjectResponse[] = (currentTask?.projectIds ?? [])
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is ProjectResponse => Boolean(p))

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
      setStartTagIds([])
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
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      const projectIds = preStopProjectIds.current
      if (projectIds.length > 0) {
        Promise.all(projectIds.map((pid) => getProject(pid)))
          .then((details) => {
            const alerts = details
              .filter((d) => d.budgetPercent != null && d.budgetPercent >= 80)
              .map((d) => ({ name: d.name, percent: Math.round(d.budgetPercent!), exceeded: d.budgetPercent! >= 100 }))
            if (alerts.length > 0) setBudgetAlerts(alerts)
          })
          .catch(() => {})
      }
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
          preStopProjectIds.current = currentTask.projectIds ?? []
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
    startMutation.mutate({ description: startDescription || undefined, projectIds: startProjectIds, tagIds: startTagIds })
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
    <div className="min-h-screen bg-slate-50">
      <AppHeader active="dashboard" username={username} onLogout={handleLogout} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
        {/* Hero: active timer / start focus area */}
        {currentTaskLoading ? (
          <div data-testid="current-task-loading" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-7 w-56 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-10 w-40 animate-pulse rounded bg-slate-200" />
          </div>
        ) : currentTask ? (
          <div
            data-testid="current-task-panel"
            className="rounded-2xl border border-slate-200 border-l-4 border-l-accent bg-white p-6 sm:p-8"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" aria-hidden="true" />
                  Recording
                </span>
                <p
                  data-testid="current-task-description"
                  className="mt-2 truncate text-xl font-semibold text-slate-900 sm:text-2xl"
                >
                  {currentTask.description || '(no description)'}
                </p>
                <p className="mt-1 text-sm text-slate-500">Started at {formatTime(currentTask.startTime)}</p>
                {(currentProjectChips.length > 0 || (currentTask.tags?.length ?? 0) > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {currentProjectChips.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: p.color || '#6b7280' }}
                      >
                        {p.name}
                      </span>
                    ))}
                    {currentTask.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-5xl">
                  <LiveTimer startTime={currentTask.startTime} />
                </span>
                <button
                  data-testid="stop-button"
                  onClick={() => {
                    preStopProjectIds.current = currentTask.projectIds ?? []
                    stopMutation.mutate(currentTask.id)
                  }}
                  disabled={stopMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {stopMutation.isPending ? <SpinnerIcon className="h-4 w-4" /> : <StopIcon className="h-4 w-4" />}
                  Stop
                </button>
                <span className="hidden text-xs text-slate-400 sm:block">
                  Press <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">Space</kbd> to stop
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            {showStartForm ? (
              <form data-testid="start-form" onSubmit={handleStart} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">New task</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      data-testid="start-description"
                      type="text"
                      value={startDescription}
                      onChange={(e) => setStartDescription(e.target.value)}
                      placeholder="What are you working on?"
                      className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        data-testid="start-submit"
                        disabled={startMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {startMutation.isPending ? <SpinnerIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                        Start
                      </button>
                      <button
                        type="button"
                        data-testid="start-cancel"
                        onClick={() => {
                          setShowStartForm(false)
                          setStartProjectIds([])
                          setStartTagIds([])
                          setFormError(null)
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>

                {projects.length > 0 && (
                  <fieldset>
                    <legend className="mb-1.5 text-sm font-medium text-slate-700">Projects (optional)</legend>
                    <div className="flex flex-wrap gap-2">
                      {projects.map((p) => (
                        <ProjectToggle
                          key={p.id}
                          project={p}
                          checked={startProjectIds.includes(p.id)}
                          onChange={() =>
                            setStartProjectIds(
                              startProjectIds.includes(p.id)
                                ? startProjectIds.filter((id) => id !== p.id)
                                : [...startProjectIds, p.id],
                            )
                          }
                          testId={`start-project-${p.id}`}
                        />
                      ))}
                    </div>
                  </fieldset>
                )}

                <TagPicker tags={tags} selected={startTagIds} onChange={setStartTagIds} />

                {formError && <Alert variant="error" message={formError} testId="start-error" />}
              </form>
            ) : (
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nothing running</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">Ready to track your time?</p>
                </div>
                <div className="flex flex-col items-start gap-1.5 sm:items-end">
                  <button
                    data-testid="start-task-button"
                    onClick={() => setShowStartForm(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Start tracking
                  </button>
                  <span className="text-xs text-slate-400">
                    Press <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">Space</kbd> to start
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key metrics strip */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatTile
            icon={<ClockIcon className="h-4 w-4" />}
            label="Today"
            value={todayTotal}
            active={activeTab === 'day'}
            onClick={() => setActiveTab('day')}
            testId="stat-today"
          />
          <StatTile
            icon={<CalendarIcon className="h-4 w-4" />}
            label="This week"
            value={weekTotal}
            active={activeTab === 'week'}
            onClick={() => setActiveTab('week')}
            testId="stat-week"
          />
          <StatTile
            icon={<BarChartIcon className="h-4 w-4" />}
            label="This month"
            value={monthTotal}
            active={activeTab === 'month'}
            onClick={() => setActiveTab('month')}
            testId="stat-month"
          />
        </div>

        {/* Budget alerts after stopping a task */}
        {budgetAlerts.length > 0 && (
          <div className="space-y-2" data-testid="budget-alerts">
            {budgetAlerts.map((alert) => (
              <div
                key={alert.name}
                data-testid={`budget-alert-${alert.exceeded ? 'exceeded' : 'warning'}`}
                className={`flex items-start justify-between gap-4 rounded-xl border-l-4 px-4 py-3.5 text-sm ${
                  alert.exceeded ? 'border-l-red-500 bg-red-50 text-red-800' : 'border-l-amber-500 bg-amber-50 text-amber-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{alert.name}</strong>{' '}
                    {alert.exceeded
                      ? `has exceeded its budget (${alert.percent}% used).`
                      : `is approaching its budget limit (${alert.percent}% used).`}
                  </span>
                </div>
                <button
                  onClick={() => setBudgetAlerts((prev) => prev.filter((a) => a.name !== alert.name))}
                  className="shrink-0 text-current opacity-60 transition-opacity hover:opacity-100"
                  aria-label="Dismiss"
                  data-testid="budget-alert-dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Task overview */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Task period" className="inline-flex rounded-lg bg-slate-100 p-1">
              {(['all', 'day', 'week', 'month'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  data-testid={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
                  data-testid="tag-filter-select"
                  aria-label="Filter by tag"
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
              >
                <PlusIcon className="h-4 w-4" />
                Add task
              </button>
            </div>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div data-testid="tasks-loading" className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
                ))}
              </div>
            ) : sortedTasks.length === 0 ? (
              <EmptyState
                testId="tasks-empty"
                icon={<InboxIcon className="h-5 w-5" />}
                title="No completed tasks"
                description={`Nothing tracked${activeTab !== 'all' ? ` ${tabLabels[activeTab].toLowerCase()}` : ' yet'}.`}
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] table-fixed text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th scope="col" className="px-4 py-2.5 text-left">
                            <button
                              className="inline-flex items-center"
                              onClick={() => handleSort('description')}
                              data-testid="sort-description"
                            >
                              Description
                              <SortIcon active={sortKey === 'description'} dir={sortDir} />
                            </button>
                          </th>
                          <th scope="col" className="w-32 px-4 py-2.5 text-right">
                            <button
                              className="inline-flex items-center justify-end"
                              onClick={() => handleSort('startTime')}
                              data-testid="sort-start"
                            >
                              Start
                              <SortIcon active={sortKey === 'startTime'} dir={sortDir} />
                            </button>
                          </th>
                          <th scope="col" className="w-32 px-4 py-2.5 text-right">
                            <button
                              className="inline-flex items-center justify-end"
                              onClick={() => handleSort('endTime')}
                              data-testid="sort-end"
                            >
                              End
                              <SortIcon active={sortKey === 'endTime'} dir={sortDir} />
                            </button>
                          </th>
                          <th scope="col" className="w-24 px-4 py-2.5 text-right">
                            <button
                              className="inline-flex items-center justify-end"
                              onClick={() => handleSort('duration')}
                              data-testid="sort-duration"
                            >
                              Duration
                              <SortIcon active={sortKey === 'duration'} dir={sortDir} />
                            </button>
                          </th>
                          <th scope="col" className="w-24 px-4 py-2.5 text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody data-testid="task-list">
                        {sortedTasks.map((task) => (
                          <tr
                            key={task.id}
                            data-testid={`task-item-${task.id}`}
                            className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                          >
                            <td className="px-4 py-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium text-slate-800">
                                  {task.description || '(no description)'}
                                </span>
                                {(task.tags?.length ?? 0) > 0 && (
                                  <span className="flex shrink-0 flex-wrap gap-1">
                                    {task.tags?.map((tag) => (
                                      <span
                                        key={tag.id}
                                        data-testid={`task-tag-${task.id}-${tag.id}`}
                                        className="rounded-full px-1.5 py-0.5 text-xs font-medium text-white"
                                        style={{ backgroundColor: tag.color }}
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                              {activeTab !== 'day' && (
                                <span className="mr-1 text-xs text-slate-400">{formatDate(task.startTime)}</span>
                              )}
                              {formatTime(task.startTime)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                              {task.endTime ? formatTime(task.endTime) : '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums font-medium text-slate-700">
                              {formatDuration(durationSeconds(task))}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  data-testid={`edit-task-${task.id}`}
                                  onClick={() => {
                                    setEditingTask(task)
                                    setFormError(null)
                                  }}
                                  aria-label="Edit task"
                                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  data-testid={`delete-task-${task.id}`}
                                  onClick={() => handleDelete(task.id)}
                                  aria-label="Delete task"
                                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  className="mt-3 flex items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600"
                  data-testid="total-duration"
                >
                  Total:
                  <span className="font-mono font-semibold tabular-nums text-slate-900">{totalDuration(completedTasks)}</span>
                </div>
              </>
            )}
          </div>
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
