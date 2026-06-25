import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProjectTree } from '../components/ProjectTree'
import { listProjects, createProject, updateProject, deleteProject } from '../api/projects'
import { logoutApi } from '../api/auth'
import type { ProjectResponse } from '../types/project'

interface ProjectsPageProps {
  username: string
  onLogout: () => void
}

export function ProjectsPage({ username, onLogout }: ProjectsPageProps) {
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowCreateForm(false)
      setNewName('')
      setNewParentId(null)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateProject(id, { name, description: editingProject?.description, color: editingProject?.color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setEditingProject(null)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProject(null)
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">⏱ TimeTracker</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
            data-testid="logout-button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-50 border-r p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Projects</h2>
            <button
              onClick={() => { setShowCreateForm(true); setNewParentId(null) }}
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
              onSelect={setSelectedProject}
              selectedId={selectedProject?.id}
            />
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
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
                {formError && <p className="text-red-600 text-sm" data-testid="form-error">{formError}</p>}
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
                    onClick={() => { setShowCreateForm(false); setFormError(null) }}
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
                    onClick={() => { setEditingProject(null); setFormError(null) }}
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
          {selectedProject && !editingProject && (
            <div className="bg-white rounded-lg border p-6 max-w-lg" data-testid="project-detail">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(selectedProject)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    data-testid="edit-button"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(selectedProject)}
                    className="text-sm text-red-600 hover:text-red-800"
                    data-testid="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {selectedProject.description && (
                <p className="text-gray-600 text-sm">{selectedProject.description}</p>
              )}
              <button
                onClick={() => { setShowCreateForm(true); setNewParentId(selectedProject.id) }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                data-testid="add-subproject-button"
              >
                + Add subproject
              </button>
            </div>
          )}

          {!selectedProject && !showCreateForm && !editingProject && (
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
