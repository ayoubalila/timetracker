import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { changePasswordApi, setTimezoneApi, logoutApi } from '../api/auth'
import { ApiError } from '../api/client'
import { listTags, createTag, deleteTag } from '../api/tags'

const PRESET_COLORS = [
  '#2563EB', '#059669', '#DC2626', '#D97706',
  '#7C3AED', '#DB2777', '#0891B2', '#EA580C',
  '#16A34A', '#6366F1', '#0D9488', '#9333EA',
]

interface SettingsPageProps {
  username: string
  onLogout: () => void
  timezone: string
  onTimezoneChange: (tz: string) => void
}

export function SettingsPage({ username, onLogout, timezone, onTimezoneChange }: SettingsPageProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [tzInput, setTzInput] = useState(timezone)
  const [tzError, setTzError] = useState<string | null>(null)
  const [tzSuccess, setTzSuccess] = useState<string | null>(null)
  const [tzLoading, setTzLoading] = useState(false)

  const queryClient = useQueryClient()
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: listTags })
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const [tagFormError, setTagFormError] = useState<string | null>(null)

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setNewTagName('')
      setTagFormError(null)
    },
    onError: (err: Error) => setTagFormError(err.message),
  })

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  })

  function handleCreateTag(e: React.FormEvent) {
    e.preventDefault()
    if (!newTagName.trim()) return
    createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor })
  }

  function handleLogout() {
    logoutApi()
    onLogout()
  }

  async function handleTimezoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTzError(null)
    setTzSuccess(null)
    setTzLoading(true)
    try {
      await setTimezoneApi(tzInput.trim())
      localStorage.setItem('tz', tzInput.trim())
      onTimezoneChange(tzInput.trim())
      setTzSuccess('Timezone updated')
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setTzError('Invalid timezone identifier')
      } else {
        setTzError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setTzLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setLoading(true)
    try {
      const result = await changePasswordApi(currentPassword, newPassword)
      setSuccess(result.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 401 || err.status === 403)) {
        setError('Current password is incorrect')
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg">⏱ TimeTracker</span>
        <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 text-sm" data-testid="nav-dashboard">
          Dashboard
        </Link>
        <Link to="/projects" className="text-gray-600 hover:text-blue-600 text-sm" data-testid="nav-projects">
          Projects
        </Link>
        <Link to="/settings" className="text-blue-600 font-medium text-sm" data-testid="nav-settings">
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

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-6">Settings</h1>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-base font-medium mb-4">Change Password</h2>

          <form data-testid="change-password-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                data-testid="current-password-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                data-testid="new-password-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm new password
              </label>
              <input
                data-testid="confirm-password-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            {error && (
              <p data-testid="settings-error" className="text-red-600 text-sm">
                {error}
              </p>
            )}

            {success && (
              <p data-testid="settings-success" className="text-green-600 text-sm">
                {success}
              </p>
            )}

            <button
              data-testid="change-password-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg border p-6 mt-6">
          <h2 className="text-base font-medium mb-1">Preferred Time Zone</h2>
          <p className="text-xs text-gray-500 mb-4">
            Task timestamps are displayed in this timezone. New tasks are pre-filled using it.
          </p>

          <form data-testid="timezone-form" onSubmit={handleTimezoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone (IANA identifier, e.g. Europe/Berlin)
              </label>
              <input
                data-testid="timezone-input"
                type="text"
                value={tzInput}
                onChange={(e) => setTzInput(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="UTC"
              />
            </div>

            {tzError && (
              <p data-testid="timezone-error" className="text-red-600 text-sm">
                {tzError}
              </p>
            )}

            {tzSuccess && (
              <p data-testid="timezone-success" className="text-green-600 text-sm">
                {tzSuccess}
              </p>
            )}

            <button
              data-testid="timezone-submit"
              type="submit"
              disabled={tzLoading}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {tzLoading ? 'Saving…' : 'Save timezone'}
            </button>
          </form>
        </div>
        <div className="bg-white rounded-lg border p-6 mt-6" data-testid="tags-section">
          <h2 className="text-base font-medium mb-1">Personal Tags</h2>
          <p className="text-xs text-gray-500 mb-4">
            Tags are personal — only you see them, even on shared projects.
          </p>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-5 pb-5 border-b" data-testid="tags-list">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  data-testid={`tag-chip-${tag.id}`}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    type="button"
                    data-testid={`delete-tag-${tag.id}`}
                    onClick={() => deleteTagMutation.mutate(tag.id)}
                    disabled={deleteTagMutation.isPending}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-xs leading-none transition-colors disabled:opacity-50"
                    aria-label={`Delete ${tag.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-5 pb-5 border-b" data-testid="tags-empty">
              No tags yet. Create one below.
            </p>
          )}

          <form onSubmit={handleCreateTag} className="space-y-3" data-testid="tag-create-form">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag name</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g. Deep work, Client, Admin…"
                maxLength={50}
                className="w-full border rounded px-3 py-2 text-sm"
                data-testid="tag-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    data-testid={`color-swatch-${color.slice(1)}`}
                    onClick={() => setNewTagColor(color)}
                    className="w-7 h-7 rounded-full transition-all focus:outline-none"
                    style={{
                      backgroundColor: color,
                      outline: newTagColor === color ? `3px solid ${color}` : 'none',
                      outlineOffset: '2px',
                      transform: newTagColor === color ? 'scale(1.2)' : 'scale(1)',
                    }}
                    aria-label={`Select color ${color}`}
                    aria-pressed={newTagColor === color}
                  />
                ))}
              </div>
            </div>

            {newTagName.trim() && (
              <div className="flex items-center gap-2" data-testid="tag-preview">
                <span className="text-xs text-gray-500">Preview:</span>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: newTagColor }}
                >
                  {newTagName.trim()}
                </span>
              </div>
            )}

            {tagFormError && (
              <p className="text-red-600 text-sm" data-testid="tag-form-error">
                {tagFormError}
              </p>
            )}

            <button
              type="submit"
              disabled={createTagMutation.isPending || !newTagName.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
              data-testid="create-tag-submit"
            >
              {createTagMutation.isPending ? 'Adding…' : '+ Add tag'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
