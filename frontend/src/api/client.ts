const TOKEN_KEY = 'tt_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)
export const isAuthenticated = (): boolean => getToken() !== null

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text()
    // Start from the status-based fallback so we never leak raw JSON blobs.
    let message = `HTTP ${response.status}`
    try {
      const json = JSON.parse(text)
      // Spring Boot includes a human-readable message when include-message=always.
      if (typeof json.message === 'string' && json.message) {
        message = json.message
      }
    } catch {
      // Not JSON — use the raw text if the body is non-empty.
      if (text) message = text
    }
    // Expired / invalid JWT: Spring Security returns 401 via our custom AuthenticationEntryPoint.
    if (response.status === 401 && !path.includes('/api/auth/')) {
      clearToken()
      window.dispatchEvent(new Event('auth:expired'))
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
