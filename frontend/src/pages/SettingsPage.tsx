import { useState } from 'react'
import { Link } from 'react-router-dom'
import { changePasswordApi, logoutApi } from '../api/auth'
import { ApiError } from '../api/client'

interface SettingsPageProps {
  username: string
  onLogout: () => void
}

export function SettingsPage({ username, onLogout }: SettingsPageProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleLogout() {
    logoutApi()
    onLogout()
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
      if (err instanceof ApiError && (err.status === 400 || err.status === 403)) {
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
      </main>
    </div>
  )
}
