const TOKEN_KEY = 'tt_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)
export const isAuthenticated = (): boolean => getToken() !== null

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
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
    let message = text || `HTTP ${response.status}`
    try {
      const json = JSON.parse(text)
      if (typeof json.message === 'string' && json.message) {
        message = json.message
      }
    } catch {
      // not JSON — use raw text as-is
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
