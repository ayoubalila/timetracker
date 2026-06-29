import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAuthenticated, getToken } from './api/client'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'

const queryClient = new QueryClient()

function parseUsername(): string | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub as string
  } catch {
    return null
  }
}

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated)
  const [username, setUsername] = useState<string>(() => parseUsername() ?? '')

  function handleLogin(name: string) {
    setUsername(name)
    setLoggedIn(true)
  }

  function handleLogout() {
    setLoggedIn(false)
    setUsername('')
  }

  return (
    <QueryClientProvider client={queryClient}>
      {loggedIn ? (
        <ProjectsPage username={username} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </QueryClientProvider>
  )
}

export default App
