import { useState } from 'react'
import { loginApi, registerApi } from '../api/auth'
import { ApiError } from '../api/client'

interface LoginPageProps {
  onLogin: (username: string, timezone: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'login') {
        const data = await loginApi(username, password)
        onLogin(data.username, data.timezone)
      } else {
        const data = await registerApi(username, email, password)
        onLogin(data.username, data.timezone)
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError('Wrong username or password')
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">⏱ TimeTracker</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded text-sm font-medium ${tab === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            data-testid="tab-login"
          >
            Login
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded text-sm font-medium ${tab === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            data-testid="tab-register"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm"
              data-testid="input-username"
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm"
                data-testid="input-email"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm"
              data-testid="input-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm" data-testid="error-message">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium disabled:opacity-50"
            data-testid="submit-button"
          >
            {loading ? 'Please wait…' : tab === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}
