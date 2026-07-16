import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { changePasswordApi, setTimezoneApi, logoutApi } from '../api/auth'
import { ApiError } from '../api/client'
import { listTags, createTag, deleteTag } from '../api/tags'
import { AppHeader } from '../components/AppHeader'
import { SettingsSection } from '../components/SettingsSection'
import {
  LockIcon,
  GlobeIcon,
  TagIcon,
  EyeIcon,
  EyeOffIcon,
  AlertIcon,
  CheckIcon,
  SpinnerIcon,
} from '../components/icons'

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

const fieldClasses =
  'w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft'

function ErrorAlert({ testId, message }: { testId: string; message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <p className="text-sm text-red-700" data-testid={testId}>
        {message}
      </p>
    </div>
  )
}

function SuccessAlert({ testId, message }: { testId: string; message: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <p className="text-sm text-emerald-700" data-testid={testId}>
        {message}
      </p>
    </div>
  )
}

export function SettingsPage({ username, onLogout, timezone, onTimezoneChange }: SettingsPageProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
    <div className="min-h-screen bg-slate-50">
      <AppHeader active="settings" username={username} onLogout={handleLogout} />

      <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage your account security, time zone, and personal tags.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          <SettingsSection
            icon={<LockIcon />}
            title="Password"
            description="Update your password to keep your account secure."
          >
            <form data-testid="change-password-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Current password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <LockIcon />
                  </span>
                  <input
                    id="current-password"
                    data-testid="current-password-input"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${fieldClasses} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  New password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <LockIcon />
                  </span>
                  <input
                    id="new-password"
                    data-testid="new-password-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={`${fieldClasses} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Must be at least 8 characters.</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <LockIcon />
                  </span>
                  <input
                    id="confirm-password"
                    data-testid="confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={`${fieldClasses} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && <ErrorAlert testId="settings-error" message={error} />}
              {success && <SuccessAlert testId="settings-success" message={success} />}

              <button
                data-testid="change-password-submit"
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <SpinnerIcon />}
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </SettingsSection>

          <SettingsSection
            icon={<GlobeIcon />}
            title="Time zone"
            description="Task times are displayed and new tasks are pre-filled using this time zone."
          >
            <form data-testid="timezone-form" onSubmit={handleTimezoneSubmit} className="space-y-4">
              <div>
                <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-slate-700">
                  IANA time zone identifier
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <GlobeIcon />
                  </span>
                  <input
                    id="timezone"
                    data-testid="timezone-input"
                    type="text"
                    value={tzInput}
                    onChange={(e) => setTzInput(e.target.value)}
                    required
                    className={fieldClasses}
                    placeholder="UTC"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">e.g. Europe/Berlin, America/New_York</p>
              </div>

              {tzError && <ErrorAlert testId="timezone-error" message={tzError} />}
              {tzSuccess && <SuccessAlert testId="timezone-success" message={tzSuccess} />}

              <button
                data-testid="timezone-submit"
                type="submit"
                disabled={tzLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {tzLoading && <SpinnerIcon />}
                {tzLoading ? 'Saving…' : 'Save time zone'}
              </button>
            </form>
          </SettingsSection>

          <SettingsSection
            icon={<TagIcon />}
            title="Personal tags"
            description="Tags are personal — only you see them, even on shared projects."
            testId="tags-section"
          >
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-5" data-testid="tags-list">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    data-testid={`tag-chip-${tag.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      data-testid={`delete-tag-${tag.id}`}
                      onClick={() => deleteTagMutation.mutate(tag.id)}
                      disabled={deleteTagMutation.isPending}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-xs leading-none transition-colors hover:bg-white/40 disabled:opacity-50"
                      aria-label={`Delete ${tag.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="border-b border-slate-100 pb-5 text-sm text-slate-400" data-testid="tags-empty">
                No tags yet. Create one below.
              </p>
            )}

            <form onSubmit={handleCreateTag} className="mt-5 space-y-3" data-testid="tag-create-form">
              <div>
                <label htmlFor="tag-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tag name
                </label>
                <input
                  id="tag-name"
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. Deep work, Client, Admin…"
                  maxLength={50}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
                  data-testid="tag-name-input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      data-testid={`color-swatch-${color.slice(1)}`}
                      onClick={() => setNewTagColor(color)}
                      className="h-7 w-7 rounded-full transition-transform focus:outline-none"
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
                  <span className="text-xs text-slate-500">Preview:</span>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: newTagColor }}
                  >
                    {newTagName.trim()}
                  </span>
                </div>
              )}

              {tagFormError && <ErrorAlert testId="tag-form-error" message={tagFormError} />}

              <button
                type="submit"
                disabled={createTagMutation.isPending || !newTagName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="create-tag-submit"
              >
                {createTagMutation.isPending && <SpinnerIcon />}
                {createTagMutation.isPending ? 'Adding…' : '+ Add tag'}
              </button>
            </form>
          </SettingsSection>
        </div>
      </main>
    </div>
  )
}
