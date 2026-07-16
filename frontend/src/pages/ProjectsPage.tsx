import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProjectTree } from '../components/ProjectTree'
import { AppHeader } from '../components/AppHeader'
import { StatTile } from '../components/StatTile'
import { EmptyState } from '../components/EmptyState'
import { ProgressBar } from '../components/ProgressBar'
import { Alert } from '../components/Alert'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ClockIcon,
  BarChartIcon,
  InboxIcon,
  UsersIcon,
  DownloadIcon,
  SpinnerIcon,
} from '../components/icons'
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  getProject,
  getProjectTasks,
  exportProjectCsv,
} from '../api/projects'
import { listTags } from '../api/tags'
import { getMembers, inviteMember, removeMember } from '../api/members'
import { logoutApi } from '../api/auth'
import { ApiError } from '../api/client'
import { formatDateTimeInTz } from '../utils/timezone'
import type { ProjectResponse } from '../types/project'
import type { TaskResponse } from '../types/task'

type SortKey = 'startTime' | 'endTime' | 'duration' | 'description'
type SortDir = 'asc' | 'desc'

function projectErrorMessage(err: Error): string {
  if (err instanceof ApiError && err.status === 409) {
    return 'A project with this name already exists at this level'
  }
  return err.message
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

function formatCost(amount: number): string {
  return `€${amount.toFixed(2)}`
}

function taskCost(task: TaskResponse, hourlyRate: number | null | undefined): number | null {
  if (hourlyRate == null) return null
  return (durationSeconds(task) / 3600) * hourlyRate
}

function budgetTextColor(percent: number): string {
  if (percent >= 100) return 'text-red-600'
  if (percent >= 80) return 'text-amber-600'
  return 'text-accent'
}

function getAncestors(project: ProjectResponse, all: ProjectResponse[]): ProjectResponse[] {
  const chain: ProjectResponse[] = []
  let parentId = project.parentId
  while (parentId) {
    const parent = all.find((p) => p.id === parentId)
    if (!parent) break
    chain.unshift(parent)
    parentId = parent.parentId
  }
  return chain
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>
  return <span className="ml-1 text-accent">{dir === 'asc' ? '↑' : '↓'}</span>
}

interface ProjectsPageProps {
  username: string
  onLogout: () => void
  timezone: string
}

const fieldClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft'

const compactFieldClasses =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft'

export function ProjectsPage({ username, onLogout, timezone }: ProjectsPageProps) {
  const formatTime = (iso: string) => formatDateTimeInTz(iso, timezone)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState<string | null>(null)
  const [newBudgetHours, setNewBudgetHours] = useState('')
  const [newBudgetPeriod, setNewBudgetPeriod] = useState('')
  const [newHourlyRate, setNewHourlyRate] = useState('')
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [editBudgetHours, setEditBudgetHours] = useState('')
  const [editBudgetPeriod, setEditBudgetPeriod] = useState<string>('')
  const [editHourlyRate, setEditHourlyRate] = useState('')
  const [showBudgetEdit, setShowBudgetEdit] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('startTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterTagId, setFilterTagId] = useState<string | null>(null)
  const [exportMonth, setExportMonth] = useState('')
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  })

  const fromIso = dateFrom ? new Date(dateFrom).toISOString() : undefined
  const toIso = dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined

  const { data: selectedDetail } = useQuery({
    queryKey: ['project-detail', selectedProjectId, fromIso, toIso],
    queryFn: () => getProject(selectedProjectId!, fromIso, toIso),
    enabled: selectedProjectId !== null,
  })

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project-tasks', selectedProjectId, fromIso, toIso, filterUserId, filterTagId],
    queryFn: () => getProjectTasks(selectedProjectId!, fromIso, toIso, filterUserId ?? undefined, filterTagId ?? undefined),
    enabled: selectedProjectId !== null,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', selectedProjectId],
    queryFn: () => getMembers(selectedProjectId!),
    enabled: selectedProjectId !== null,
  })

  const sortedTasks = [...projectTasks].sort((a, b) => {
    let diff = 0
    if (sortKey === 'startTime') diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    else if (sortKey === 'endTime')
      diff = new Date(a.endTime ?? '').getTime() - new Date(b.endTime ?? '').getTime()
    else if (sortKey === 'duration') diff = durationSeconds(a) - durationSeconds(b)
    else if (sortKey === 'description') diff = (a.description ?? '').localeCompare(b.description ?? '')
    return sortDir === 'asc' ? diff : -diff
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      closeCreateForm()
    },
    onError: (err: Error) => setFormError(projectErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      name,
      budgetSeconds,
      budgetPeriod,
      hourlyRate,
    }: {
      id: string
      name: string
      budgetSeconds?: number | null
      budgetPeriod?: string | null
      hourlyRate?: number | null
    }) =>
      updateProject(id, {
        name,
        description: editingProject?.description,
        color: editingProject?.color,
        budgetSeconds: budgetSeconds !== undefined ? budgetSeconds : editingProject?.budgetSeconds,
        budgetPeriod: budgetPeriod !== undefined ? budgetPeriod : editingProject?.budgetPeriod,
        hourlyRate: hourlyRate !== undefined ? hourlyRate : editingProject?.hourlyRate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setEditingProject(null)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(projectErrorMessage(err)),
  })

  const budgetMutation = useMutation({
    mutationFn: ({ id, budgetSeconds, budgetPeriod }: { id: string; budgetSeconds: number | null; budgetPeriod: string | null }) =>
      updateProject(id, {
        name: selectedProject?.name ?? '',
        description: selectedProject?.description,
        color: selectedProject?.color,
        budgetSeconds,
        budgetPeriod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-detail', selectedProjectId] })
      setShowBudgetEdit(false)
      setBudgetError(null)
    },
    onError: (err: Error) => setBudgetError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProjectId(null)
    },
  })

  const inviteMutation = useMutation({
    mutationFn: ({ projectId, un }: { projectId: string; un: string }) =>
      inviteMember(projectId, { username: un }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', selectedProjectId] })
      setInviteUsername('')
      setInviteError(null)
    },
    onError: (err: Error) => setInviteError(err.message),
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      removeMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', selectedProjectId] })
    },
  })

  function handleLogout() {
    logoutApi()
    onLogout()
  }

  function closeCreateForm() {
    setShowCreateForm(false)
    setNewName('')
    setNewParentId(null)
    setNewBudgetHours('')
    setNewBudgetPeriod('')
    setNewHourlyRate('')
    setFormError(null)
  }

  function closeEditForm() {
    setEditingProject(null)
    setFormError(null)
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const hours = parseFloat(newBudgetHours)
    const hasBudget = newBudgetHours !== '' && newBudgetPeriod !== ''
    if (newBudgetHours !== '' && (!newBudgetPeriod || isNaN(hours) || hours <= 0)) {
      setFormError('Enter a valid number of hours and select a period.')
      return
    }
    const rate = parseFloat(newHourlyRate)
    if (newHourlyRate !== '' && (isNaN(rate) || rate <= 0)) {
      setFormError('Enter a valid hourly rate greater than 0.')
      return
    }
    createMutation.mutate({
      name: newName.trim(),
      parentId: newParentId,
      budgetSeconds: hasBudget ? Math.round(hours * 3600) : null,
      budgetPeriod: hasBudget ? newBudgetPeriod : null,
      hourlyRate: newHourlyRate !== '' ? rate : null,
    })
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProject || !editName.trim()) return
    const hours = parseFloat(editBudgetHours)
    const hasBudget = editBudgetHours !== '' && editBudgetPeriod !== ''
    if (editBudgetHours !== '' && (!editBudgetPeriod || isNaN(hours) || hours <= 0)) {
      setFormError('Enter a valid number of hours and select a period.')
      return
    }
    const rate = parseFloat(editHourlyRate)
    if (editHourlyRate !== '' && (isNaN(rate) || rate <= 0)) {
      setFormError('Enter a valid hourly rate greater than 0.')
      return
    }
    updateMutation.mutate({
      id: editingProject.id,
      name: editName.trim(),
      budgetSeconds: hasBudget ? Math.round(hours * 3600) : null,
      budgetPeriod: hasBudget ? editBudgetPeriod : null,
      hourlyRate: editHourlyRate !== '' ? rate : null,
    })
  }

  function startEdit(project: ProjectResponse) {
    setEditingProject(project)
    setEditName(project.name)
    setEditBudgetHours(project.budgetSeconds ? (project.budgetSeconds / 3600).toFixed(1) : '')
    setEditBudgetPeriod(project.budgetPeriod ?? '')
    setEditHourlyRate(project.hourlyRate != null ? String(project.hourlyRate) : '')
    setFormError(null)
  }

  function handleDelete(project: ProjectResponse) {
    if (window.confirm(`Delete "${project.name}" and all its subprojects?`)) {
      deleteMutation.mutate(project.id)
    }
  }

  function handleSelectProject(project: ProjectResponse) {
    setSelectedProjectId(project.id)
    setDateFrom('')
    setDateTo('')
    setFilterUserId(null)
    setFilterTagId(null)
    setExportMonth('')
    setShowBudgetEdit(false)
    setBudgetError(null)
  }

  function handleBudgetSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject) return
    const hours = parseFloat(editBudgetHours)
    if (!editBudgetPeriod || isNaN(hours) || hours <= 0) {
      setBudgetError('Enter a valid number of hours and select a period.')
      return
    }
    budgetMutation.mutate({
      id: selectedProject.id,
      budgetSeconds: Math.round(hours * 3600),
      budgetPeriod: editBudgetPeriod,
    })
  }

  function handleClearBudget() {
    if (!selectedProject) return
    budgetMutation.mutate({ id: selectedProject.id, budgetSeconds: null, budgetPeriod: null })
  }

  function startBudgetEdit() {
    if (!selectedProject) return
    setEditBudgetHours(
      selectedProject.budgetSeconds ? (selectedProject.budgetSeconds / 3600).toFixed(1) : ''
    )
    setEditBudgetPeriod(selectedProject.budgetPeriod ?? 'TOTAL')
    setShowBudgetEdit(true)
    setBudgetError(null)
  }

  function handleClearDateRange() {
    setDateFrom('')
    setDateTo('')
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null
  const displayProject = selectedProject
  const isOwner = displayProject?.ownerUsername === username
  const showCostColumn = selectedDetail?.effectiveHourlyRate != null
  const ancestors = displayProject ? getAncestors(displayProject, projects) : []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader active="projects" username={username} onLogout={handleLogout} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Sidebar: the project hierarchy */}
        <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto p-4 lg:h-full lg:max-h-none">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Projects</h2>
              <button
                onClick={() => {
                  setShowCreateForm(true)
                  setNewParentId(null)
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
                data-testid="new-project-button"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                New
              </button>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <ProjectTree
                projects={projects}
                onSelect={handleSelectProject}
                selectedId={selectedProjectId ?? undefined}
              />
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {displayProject ? (
            <div data-testid="project-detail" className="max-w-4xl space-y-6">
              {ancestors.length > 0 && (
                <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  {ancestors.map((a) => (
                    <span key={a.id} className="flex items-center gap-1.5">
                      <button onClick={() => handleSelectProject(a)} className="transition-colors hover:text-accent hover:underline">
                        {a.name}
                      </button>
                      <span aria-hidden="true">›</span>
                    </span>
                  ))}
                  <span className="font-medium text-slate-500">{displayProject.name}</span>
                </nav>
              )}

              {/* Project header card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-slate-900">{displayProject.name}</h1>
                    {!isOwner && (
                      <span
                        className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"
                        data-testid="shared-badge"
                      >
                        Shared by {displayProject.ownerUsername}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        navigate('/dashboard', {
                          state: { startProjectIds: [displayProject.id], autoOpen: true },
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
                      data-testid="start-task-for-project-button"
                    >
                      <PlayIcon className="h-3.5 w-3.5" />
                      Start task
                    </button>
                    {isOwner && (
                      <>
                        <button
                          onClick={() => startEdit(displayProject)}
                          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Rename project"
                          data-testid="edit-button"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(displayProject)}
                          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete project"
                          data-testid="delete-button"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {displayProject.description && (
                  <p className="mt-2 text-sm text-slate-500">{displayProject.description}</p>
                )}

                {/* Stat tiles */}
                <div className="mt-5 grid max-w-sm grid-cols-2 gap-3">
                  <StatTile
                    icon={<ClockIcon className="h-4 w-4" />}
                    label="Total time"
                    value={formatDuration(selectedDetail?.totalSeconds ?? 0)}
                    testId="project-total-time"
                  />
                  {selectedDetail?.effectiveHourlyRate != null && (
                    <StatTile
                      icon={<BarChartIcon className="h-4 w-4" />}
                      label="Total cost"
                      value={formatCost(selectedDetail.totalCost ?? 0)}
                      testId="project-total-cost"
                    />
                  )}
                </div>

                {/* Per-user breakdown (shared projects) */}
                {selectedDetail && Array.isArray(selectedDetail.userBreakdown) && selectedDetail.userBreakdown.length > 1 && (
                  <div className="mt-3 space-y-1" data-testid="user-breakdown">
                    {selectedDetail.userBreakdown.map((u) => (
                      <div
                        key={u.userId}
                        className="flex justify-between text-xs text-slate-500"
                        data-testid={`breakdown-${u.username}`}
                      >
                        <span>{u.username}</span>
                        <span className="tabular-nums">{formatDuration(u.seconds)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Budget */}
                {(selectedDetail?.budgetSeconds != null || isOwner) && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    {selectedDetail?.budgetSeconds != null && (
                      <div data-testid="budget-section">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Budget ({selectedDetail.budgetPeriod?.toLowerCase()}):{' '}
                            <span className="font-medium text-slate-700">
                              {formatDuration(selectedDetail.usedSeconds ?? 0)}
                            </span>
                            {' / '}
                            {formatDuration(selectedDetail.budgetSeconds)}
                          </span>
                          <span
                            className={`font-semibold ${budgetTextColor(selectedDetail.budgetPercent ?? 0)}`}
                            data-testid="budget-percent"
                          >
                            {Math.round(selectedDetail.budgetPercent ?? 0)}%
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <ProgressBar percent={selectedDetail.budgetPercent ?? 0} testId="budget-progress-bar" />
                        </div>
                        {(selectedDetail.budgetPercent ?? 0) >= 100 && (
                          <p className="mt-1.5 text-xs font-medium text-red-600" data-testid="budget-exceeded-alert">
                            Budget exceeded — consider adjusting your workload.
                          </p>
                        )}
                        {(selectedDetail.budgetPercent ?? 0) >= 80 && (selectedDetail.budgetPercent ?? 0) < 100 && (
                          <p className="mt-1.5 text-xs text-amber-600" data-testid="budget-warning-alert">
                            Approaching budget limit.
                          </p>
                        )}
                      </div>
                    )}

                    {isOwner && (
                      <div className={selectedDetail?.budgetSeconds != null ? 'mt-2' : ''}>
                        {!showBudgetEdit ? (
                          <button
                            onClick={startBudgetEdit}
                            className="text-xs font-medium text-slate-400 hover:text-accent"
                            data-testid="budget-edit-button"
                          >
                            {selectedDetail?.budgetSeconds != null ? 'Edit budget' : 'Set time budget'}
                          </button>
                        ) : (
                          <form
                            onSubmit={handleBudgetSubmit}
                            className="mt-2 flex flex-wrap items-end gap-2"
                            data-testid="budget-form"
                          >
                            <div>
                              <label className="mb-1 block text-xs text-slate-500">Hours</label>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={editBudgetHours}
                                onChange={(e) => setEditBudgetHours(e.target.value)}
                                className={`${compactFieldClasses} w-24`}
                                placeholder="e.g. 10"
                                data-testid="budget-hours-input"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-slate-500">Period</label>
                              <select
                                value={editBudgetPeriod}
                                onChange={(e) => setEditBudgetPeriod(e.target.value)}
                                className={compactFieldClasses}
                                data-testid="budget-period-select"
                              >
                                <option value="TOTAL">Total (all time)</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={budgetMutation.isPending}
                              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
                              data-testid="budget-save-button"
                            >
                              Save
                            </button>
                            {selectedDetail?.budgetSeconds != null && (
                              <button
                                type="button"
                                onClick={handleClearBudget}
                                disabled={budgetMutation.isPending}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                data-testid="budget-clear-button"
                              >
                                Remove
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setShowBudgetEdit(false); setBudgetError(null) }}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                              data-testid="budget-cancel-button"
                            >
                              Cancel
                            </button>
                            {budgetError && (
                              <p className="w-full text-xs text-red-600" data-testid="budget-form-error">{budgetError}</p>
                            )}
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Toolbar: date range, subproject, export */}
                <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-5">
                  <div>
                    <label htmlFor="date-from" className="mb-1 block text-xs font-medium text-slate-500">From</label>
                    <input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={compactFieldClasses}
                      data-testid="date-from"
                    />
                  </div>
                  <div>
                    <label htmlFor="date-to" className="mb-1 block text-xs font-medium text-slate-500">To</label>
                    <input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={compactFieldClasses}
                      data-testid="date-to"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={handleClearDateRange}
                      className="pb-2 text-xs font-medium text-slate-400 hover:text-slate-600"
                      data-testid="clear-date-range"
                    >
                      Clear
                    </button>
                  )}

                  <div className="ml-auto flex flex-wrap items-end gap-2">
                    {isOwner && (
                      <button
                        onClick={() => {
                          setShowCreateForm(true)
                          setNewParentId(displayProject.id)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        data-testid="add-subproject-button"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Subproject
                      </button>
                    )}
                    <input
                      type="month"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className={compactFieldClasses}
                      data-testid="export-month-input"
                      aria-label="Export month"
                      placeholder="All months"
                    />
                    <button
                      onClick={async () => {
                        try {
                          const blob = await exportProjectCsv(displayProject.id, exportMonth || undefined)
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${displayProject.name}${exportMonth ? `-${exportMonth}` : ''}-export.csv`
                          a.click()
                          URL.revokeObjectURL(url)
                        } catch {
                          // silent — browser handles errors
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      data-testid="export-csv-button"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      Export CSV{exportMonth ? ` (${exportMonth})` : ''}
                    </button>
                  </div>
                </div>
              </div>

              {/* Members panel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="members-panel">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-900">Members</h2>
                </div>
                {members.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400" data-testid="members-empty">No members yet.</p>
                ) : (
                  <ul className="mt-3 space-y-0.5" data-testid="members-list">
                    {members.map((m) => (
                      <li key={m.userId} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                        <span className="flex items-center gap-2 text-sm text-slate-700" data-testid={`member-${m.username}`}>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                            {(m.username ?? '?').charAt(0).toUpperCase()}
                          </span>
                          {m.username}
                        </span>
                        {isOwner && !m.inherited && (
                          <button
                            onClick={() =>
                              removeMemberMutation.mutate({
                                projectId: displayProject.id,
                                userId: m.userId,
                              })
                            }
                            className="rounded-md p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${m.username}`}
                            data-testid={`remove-member-${m.username}`}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {isOwner && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (inviteUsername.trim()) {
                        inviteMutation.mutate({ projectId: displayProject.id, un: inviteUsername.trim() })
                      }
                    }}
                    className="mt-4 flex gap-2"
                    data-testid="invite-form"
                  >
                    <input
                      type="text"
                      placeholder="Username to invite"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      className={`${compactFieldClasses} flex-1`}
                      data-testid="invite-username-input"
                    />
                    <button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
                      data-testid="invite-submit"
                    >
                      Invite
                    </button>
                  </form>
                )}
                {inviteError && (
                  <div className="mt-2">
                    <Alert variant="error" message={inviteError} testId="invite-error" />
                  </div>
                )}
              </div>

              {/* Task list */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {members.length > 0 && displayProject && (
                      <select
                        value={filterUserId ?? ''}
                        onChange={(e) => setFilterUserId(e.target.value || null)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
                        data-testid="user-filter-select"
                        aria-label="Filter tasks by user"
                      >
                        <option value="">All users</option>
                        {displayProject.ownerUserId && (
                          <option value={displayProject.ownerUserId}>
                            {displayProject.ownerUsername}
                          </option>
                        )}
                        {members.map((m, i) => (
                          <option key={m.userId ?? `m-${i}`} value={m.userId}>
                            {m.username}
                          </option>
                        ))}
                      </select>
                    )}
                    {tags.length > 0 && (
                      <select
                        value={filterTagId ?? ''}
                        onChange={(e) => setFilterTagId(e.target.value || null)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
                        data-testid="proj-tag-filter-select"
                        aria-label="Filter tasks by tag"
                      >
                        <option value="">All tags</option>
                        {tags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                      {(dateFrom || dateTo) ? ' (filtered)' : ''}
                    </span>
                  </div>
                </div>

                {sortedTasks.length === 0 ? (
                  <EmptyState
                    testId="project-tasks-empty"
                    icon={<InboxIcon className="h-5 w-5" />}
                    title="No tasks yet"
                    description="No tasks are associated with this project."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] table-fixed text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th scope="col" className="px-4 py-2.5 text-left">
                              <button
                                className="inline-flex items-center"
                                onClick={() => handleSort('description')}
                                data-testid="proj-sort-description"
                              >
                                Description
                                <SortIcon active={sortKey === 'description'} dir={sortDir} />
                              </button>
                            </th>
                            <th scope="col" className="w-32 px-4 py-2.5 text-right">
                              <button
                                className="inline-flex items-center justify-end"
                                onClick={() => handleSort('startTime')}
                                data-testid="proj-sort-start"
                              >
                                Start
                                <SortIcon active={sortKey === 'startTime'} dir={sortDir} />
                              </button>
                            </th>
                            <th scope="col" className="w-32 px-4 py-2.5 text-right">
                              <button
                                className="inline-flex items-center justify-end"
                                onClick={() => handleSort('endTime')}
                                data-testid="proj-sort-end"
                              >
                                End
                                <SortIcon active={sortKey === 'endTime'} dir={sortDir} />
                              </button>
                            </th>
                            <th scope="col" className="w-24 px-4 py-2.5 text-right">
                              <button
                                className="inline-flex items-center justify-end"
                                onClick={() => handleSort('duration')}
                                data-testid="proj-sort-duration"
                              >
                                Duration
                                <SortIcon active={sortKey === 'duration'} dir={sortDir} />
                              </button>
                            </th>
                            {showCostColumn && <th scope="col" className="w-24 px-4 py-2.5 text-right">Cost</th>}
                          </tr>
                        </thead>
                        <tbody data-testid="project-task-list">
                          {sortedTasks.map((task) => (
                            <tr
                              key={task.id}
                              data-testid={`proj-task-${task.id}`}
                              className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                            >
                              <td className="px-4 py-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="truncate text-slate-800">
                                    {task.description || '(no description)'}
                                  </span>
                                  {task.ownerUsername !== username && (
                                    <span className="shrink-0 text-xs text-slate-400" data-testid={`task-owner-${task.id}`}>
                                      by {task.ownerUsername}
                                    </span>
                                  )}
                                  {(task.tags?.length ?? 0) > 0 && (
                                    <span className="flex shrink-0 flex-wrap gap-1">
                                      {task.tags?.map((tag) => (
                                        <span
                                          key={tag.id}
                                          data-testid={`proj-task-tag-${task.id}-${tag.id}`}
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
                                {formatTime(task.startTime)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                                {task.endTime ? formatTime(task.endTime) : <em className="not-italic font-medium text-emerald-600">Running</em>}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums font-medium text-slate-700">
                                {formatDuration(durationSeconds(task))}
                              </td>
                              {showCostColumn && (
                                <td
                                  className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums font-medium text-emerald-700"
                                  data-testid={`proj-task-cost-${task.id}`}
                                >
                                  {formatCost(taskCost(task, selectedDetail?.effectiveHourlyRate) ?? 0)}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div
                      className="flex flex-wrap items-center justify-end gap-4 border-t border-slate-200 px-4 py-2.5 text-sm text-slate-600"
                      data-testid="proj-total-duration"
                    >
                      Total:
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {formatDuration(sortedTasks.reduce((s, t) => s + durationSeconds(t), 0))}
                      </span>
                      {showCostColumn && (
                        <span data-testid="proj-total-cost-row" className="flex items-center gap-1">
                          Cost:
                          <span className="font-mono font-semibold tabular-nums text-emerald-700">
                            {formatCost(
                              sortedTasks.reduce((s, t) => s + (taskCost(t, selectedDetail?.effectiveHourlyRate) ?? 0), 0),
                            )}
                          </span>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              testId="empty-state"
              icon={<InboxIcon className="h-5 w-5" />}
              title={projects.length === 0 ? 'No projects yet' : 'Select a project'}
              description={
                projects.length === 0
                  ? 'Create your first project using the "+ New" button.'
                  : 'Select a project from the sidebar.'
              }
            />
          )}
        </main>
      </div>

      {/* Create project modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeCreateForm()}
        >
          <div
            data-testid="create-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-form-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2 id="create-form-title" className="text-lg font-semibold tracking-tight text-slate-900">
              New project
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {newParentId ? 'Add a subproject to organize related work.' : 'Projects group your tracked time and can be shared with teammates.'}
            </p>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="create-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Project name
                </label>
                <input
                  id="create-name"
                  type="text"
                  placeholder="e.g. Client Website"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                  className={fieldClasses}
                  data-testid="create-name-input"
                />
              </div>
              <div>
                <label htmlFor="create-parent" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Parent project
                </label>
                <select
                  id="create-parent"
                  value={newParentId ?? ''}
                  onChange={(e) => setNewParentId(e.target.value || null)}
                  className={fieldClasses}
                  data-testid="create-parent-select"
                >
                  <option value="">— Top level —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Time budget</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="Hours"
                    value={newBudgetHours}
                    onChange={(e) => setNewBudgetHours(e.target.value)}
                    className={`${fieldClasses} w-24`}
                    data-testid="create-budget-hours-input"
                  />
                  <select
                    value={newBudgetPeriod}
                    onChange={(e) => setNewBudgetPeriod(e.target.value)}
                    className={`${fieldClasses} flex-1`}
                    data-testid="create-budget-period-select"
                  >
                    <option value="">— Period —</option>
                    <option value="TOTAL">Total (all time)</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Hourly rate <span className="font-normal text-slate-400">(optional, €/h)</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 45.00"
                  value={newHourlyRate}
                  onChange={(e) => setNewHourlyRate(e.target.value)}
                  className={`${fieldClasses} w-32`}
                  data-testid="create-hourly-rate-input"
                />
              </div>

              {formError && <Alert variant="error" message={formError} testId="form-error" />}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  data-testid="create-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="create-submit"
                >
                  {createMutation.isPending && <SpinnerIcon className="h-4 w-4" />}
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit project modal */}
      {editingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeEditForm()}
        >
          <div
            data-testid="edit-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-form-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2 id="edit-form-title" className="text-lg font-semibold tracking-tight text-slate-900">
              Edit project
            </h2>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Project name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                  className={fieldClasses}
                  data-testid="edit-name-input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Time budget</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="Hours"
                    value={editBudgetHours}
                    onChange={(e) => setEditBudgetHours(e.target.value)}
                    className={`${fieldClasses} w-24`}
                    data-testid="edit-budget-hours-input"
                  />
                  <select
                    value={editBudgetPeriod}
                    onChange={(e) => setEditBudgetPeriod(e.target.value)}
                    className={`${fieldClasses} flex-1`}
                    data-testid="edit-budget-period-select"
                  >
                    <option value="">— No budget —</option>
                    <option value="TOTAL">Total (all time)</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Hourly rate <span className="font-normal text-slate-400">(optional, €/h)</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 45.00"
                  value={editHourlyRate}
                  onChange={(e) => setEditHourlyRate(e.target.value)}
                  className={`${fieldClasses} w-32`}
                  data-testid="edit-hourly-rate-input"
                />
              </div>

              {formError && <Alert variant="error" message={formError} testId="edit-form-error" />}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  data-testid="edit-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="edit-submit"
                >
                  {updateMutation.isPending && <SpinnerIcon className="h-4 w-4" />}
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
