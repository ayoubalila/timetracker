import { useState, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAuthenticated, getToken } from './api/client'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'
import { Toaster } from './components/Toaster'

const queryClient = new QueryClient()

function parseUsername(): string {
  const token = getToken()
  if (!token) return ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return (payload.sub as string) ?? ''
  } catch {
    return ''
  }
}

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated)
  const [username, setUsername] = useState<string>(() => parseUsername())
  const [timezone, setTimezone] = useState<string>(() => localStorage.getItem('tz') ?? 'UTC')

  function handleLogin(name: string, tz: string) {
    setUsername(name)
    setTimezone(tz)
    setLoggedIn(true)
  }

  function handleLogout() {
    setLoggedIn(false)
    setUsername('')
    setTimezone('UTC')
  }

  useEffect(() => {
    const onExpired = () => {
      setLoggedIn(false)
      setUsername('')
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              loggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              !loggedIn ? (
                <Navigate to="/login" replace />
              ) : (
                <DashboardPage username={username} onLogout={handleLogout} timezone={timezone} />
              )
            }
          />
          <Route
            path="/projects"
            element={
              !loggedIn ? (
                <Navigate to="/login" replace />
              ) : (
                <ProjectsPage username={username} onLogout={handleLogout} timezone={timezone} />
              )
            }
          />
          <Route
            path="/settings"
            element={
              !loggedIn ? (
                <Navigate to="/login" replace />
              ) : (
                <SettingsPage
                  username={username}
                  onLogout={handleLogout}
                  timezone={timezone}
                  onTimezoneChange={setTimezone}
                />
              )
            }
          />
          <Route
            path="*"
            element={<Navigate to={loggedIn ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
