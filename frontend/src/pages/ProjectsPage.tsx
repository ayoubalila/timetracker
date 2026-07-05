import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProjectTree } from '../components/ProjectTree'
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  getProject,
  getProjectTasks,
  exportProjectCsv,
} from '../api/projects'
import { getMembers, inviteMember, removeMember } from '../api/members'
import { logoutApi } from '../api/auth'
import { ApiError } from '../api/client'
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>
  return <span className="text-blue-600 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

interface ProjectsPageProps {
  username: string
  onLogout: () => void
}

export function ProjectsPage({ username, onLogout }: ProjectsPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('startTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const fromIso = dateFrom ? new Date(dateFrom).toISOString() : undefined
  const toIso = dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined

  const { data: selectedDetail } = useQuery({
    queryKey: ['project-detail', selectedProjectId, fromIso, toIso],
    queryFn: () => getProject(selectedProjectId!, fromIso, toIso),
    enabled: selectedProjectId !== null,
  })

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project-tasks', selectedProjectId, fromIso, toIso],
    queryFn: () => getProjectTasks(selectedProjectId!, fromIso, toIso),
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
      setShowCreateForm(false)
      setNewName('')
      setNewParentId(null)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(projectErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateProject(id, { name, description: editingProject?.description, color: editingProject?.color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setEditingProject(null)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(projectErrorMessage(err)),
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

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    createMutation.mutate({ name: newName.trim(), parentId: newParentId })
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProject || !editName.trim()) return
    updateMutation.mutate({ id: editingProject.id, name: editName.trim() })
  }

  function startEdit(project: ProjectResponse) {
    setEditingProject(project)
    setEditName(project.name)
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
  }

  function handleClearDateRange() {
    setDateFrom('')
    setDateTo('')
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null
  const displayProject = selectedProject
  const isOwner = displayProject?.ownerUsername === username

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <h1 className="text-lg font-bold">⏱ TimeTracker</h1>
        <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 text-sm" data-testid="nav-dashboard">
          Dashboard
        </Link>
        <Link to="/projects" className="text-blue-600 font-medium text-sm" data-testid="nav-projects">
          Projects
        </Link>
        <Link to="/settings" className="text-gray-600 hover:text-blue-600 text-sm" data-testid="nav-settings">
          Settings
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-600">{username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
            data-testid="logout-button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-50 border-r p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Projects</h2>
            <button
              onClick={() => {
                setShowCreateForm(true)
                setNewParentId(null)
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              data-testid="new-project-button"
            >
              + New
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <ProjectTree
              projects={projects}
              onSelect={handleSelectProject}
              selectedId={selectedProjectId ?? undefined}
            />
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Create form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg border p-4 mb-6 max-w-md" data-testid="create-form">
              <h3 className="font-medium mb-3">New Project</h3>
              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Project name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                  className="w-full border rounded px-3 py-2 text-sm"
                  data-testid="create-name-input"
                />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Parent project (optional)</label>
                  <select
                    value={newParentId ?? ''}
                    onChange={(e) => setNewParentId(e.target.value || null)}
                    className="w-full border rounded px-3 py-2 text-sm"
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
                {formError && (
                  <p className="text-red-600 text-sm" data-testid="form-error">
                    {formError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                    data-testid="create-submit"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setFormError(null)
                    }}
                    className="px-4 py-2 rounded text-sm border"
                    data-testid="create-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit form */}
          {editingProject && (
            <div className="bg-white rounded-lg border p-4 mb-6 max-w-md" data-testid="edit-form">
              <h3 className="font-medium mb-3">Rename Project</h3>
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                  className="w-full border rounded px-3 py-2 text-sm"
                  data-testid="edit-name-input"
                />
                {formError && <p className="text-red-600 text-sm">{formError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                    data-testid="edit-submit"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(null)
                      setFormError(null)
                    }}
                    className="px-4 py-2 rounded text-sm border"
                    data-testid="edit-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Selected project detail */}
          {displayProject && !editingProject && (
            <div data-testid="project-detail">
              {/* Project header */}
              <div className="bg-white rounded-lg border p-6 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{displayProject.name}</h2>
                    {!isOwner && (
                      <span
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                        data-testid="shared-badge"
                      >
                        Shared by {displayProject.ownerUsername}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate('/dashboard', {
                          state: { startProjectIds: [displayProject.id], autoOpen: true },
                        })
                      }
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                      data-testid="start-task-for-project-button"
                    >
                      ▶ Start task
                    </button>
                    {isOwner && (
                      <>
                        <button
                          onClick={() => startEdit(displayProject)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                          data-testid="edit-button"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(displayProject)}
                          className="text-sm text-red-600 hover:text-red-800"
                          data-testid="delete-button"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {displayProject.description && (
                  <p className="text-gray-600 text-sm mb-3">{displayProject.description}</p>
                )}

                {/* Total time */}
                <div
                  data-testid="project-total-time"
                  className="text-sm text-gray-700"
                >
                  Total time:{' '}
                  <span className="font-semibold text-blue-700">
                    {formatDuration(selectedDetail?.totalSeconds ?? 0)}
                  </span>
                </div>

                {/* Per-user breakdown (shared projects) */}
                {selectedDetail && Array.isArray(selectedDetail.userBreakdown) && selectedDetail.userBreakdown.length > 1 && (
                  <div className="mt-2" data-testid="user-breakdown">
                    {selectedDetail.userBreakdown.map((u) => (
                      <div key={u.userId} className="text-xs text-gray-500 flex justify-between" data-testid={`breakdown-${u.username}`}>
                        <span>{u.username}</span>
                        <span>{formatDuration(u.seconds)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Date range filter */}
                <div className="mt-4 flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                      data-testid="date-from"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                      data-testid="date-to"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={handleClearDateRange}
                      className="text-xs text-gray-500 hover:text-gray-700 pb-1"
                      data-testid="clear-date-range"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {isOwner && (
                  <button
                    onClick={() => {
                      setShowCreateForm(true)
                      setNewParentId(displayProject.id)
                    }}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                    data-testid="add-subproject-button"
                  >
                    + Add subproject
                  </button>
                )}

                <button
                  onClick={async () => {
                    try {
                      const blob = await exportProjectCsv(displayProject.id)
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${displayProject.name}-export.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch {
                      // silent — browser handles errors
                    }
                  }}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                  data-testid="export-csv-button"
                >
                  ↓ Export CSV
                </button>
              </div>

              {/* Members panel */}
              <div className="bg-white rounded-lg border p-4 mb-4" data-testid="members-panel">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Members</h3>
                {members.length === 0 ? (
                  <p className="text-sm text-gray-400" data-testid="members-empty">No members yet.</p>
                ) : (
                  <ul className="space-y-1 mb-3" data-testid="members-list">
                    {members.map((m) => (
                      <li key={m.userId} className="flex items-center justify-between text-sm">
                        <span data-testid={`member-${m.username}`}>{m.username}</span>
                        {isOwner && (
                          <button
                            onClick={() =>
                              removeMemberMutation.mutate({
                                projectId: displayProject.id,
                                userId: m.userId,
                              })
                            }
                            className="text-xs text-red-500 hover:text-red-700"
                            data-testid={`remove-member-${m.username}`}
                          >
                            Remove
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
                    className="flex gap-2 mt-2"
                    data-testid="invite-form"
                  >
                    <input
                      type="text"
                      placeholder="Username to invite"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      data-testid="invite-username-input"
                    />
                    <button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                      data-testid="invite-submit"
                    >
                      Invite
                    </button>
                  </form>
                )}
                {inviteError && (
                  <p className="text-red-600 text-xs mt-1" data-testid="invite-error">
                    {inviteError}
                  </p>
                )}
              </div>

              {/* Task list */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Tasks</h3>
                  <span className="text-xs text-gray-400">
                    {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                    {(dateFrom || dateTo) ? ' (filtered)' : ''}
                  </span>
                </div>

                {sortedTasks.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500" data-testid="project-tasks-empty">
                    No tasks associated with this project.
                  </p>
                ) : (
                  <>
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <button
                        className="text-left flex items-center"
                        onClick={() => handleSort('description')}
                        data-testid="proj-sort-description"
                      >
                        Description
                        <SortIcon active={sortKey === 'description'} dir={sortDir} />
                      </button>
                      <button
                        className="text-right flex items-center justify-end"
                        onClick={() => handleSort('startTime')}
                        data-testid="proj-sort-start"
                      >
                        Start
                        <SortIcon active={sortKey === 'startTime'} dir={sortDir} />
                      </button>
                      <button
                        className="text-right flex items-center justify-end"
                        onClick={() => handleSort('endTime')}
                        data-testid="proj-sort-end"
                      >
                        End
                        <SortIcon active={sortKey === 'endTime'} dir={sortDir} />
                      </button>
                      <button
                        className="text-right flex items-center justify-end"
                        onClick={() => handleSort('duration')}
                        data-testid="proj-sort-duration"
                      >
                        Duration
                        <SortIcon active={sortKey === 'duration'} dir={sortDir} />
                      </button>
                    </div>

                    {/* Rows */}
                    <ul data-testid="project-task-list">
                      {sortedTasks.map((task) => (
                        <li
                          key={task.id}
                          data-testid={`proj-task-${task.id}`}
                          className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-3 border-b last:border-0 text-sm items-center"
                        >
                          <span className="truncate">
                            {task.description || '(no description)'}
                            {task.ownerUsername !== username && (
                              <span className="ml-2 text-xs text-gray-400" data-testid={`task-owner-${task.id}`}>
                                by {task.ownerUsername}
                              </span>
                            )}
                          </span>
                          <span className="text-gray-500 text-right whitespace-nowrap">
                            {formatTime(task.startTime)}
                          </span>
                          <span className="text-gray-500 text-right whitespace-nowrap">
                            {task.endTime ? formatTime(task.endTime) : <em className="text-green-600">Running</em>}
                          </span>
                          <span className="text-gray-700 font-medium text-right whitespace-nowrap">
                            {formatDuration(durationSeconds(task))}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Total row */}
                    <div className="px-4 py-2 border-t text-right text-sm text-gray-600" data-testid="proj-total-duration">
                      Total:{' '}
                      <span className="font-semibold">
                        {formatDuration(sortedTasks.reduce((s, t) => s + durationSeconds(t), 0))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!displayProject && !showCreateForm && !editingProject && (
            <div className="text-gray-500 text-sm" data-testid="empty-state">
              {projects.length === 0
                ? 'Create your first project using the "+ New" button.'
                : 'Select a project from the sidebar.'}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
