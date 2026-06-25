import { apiRequest, setToken, clearToken } from './client'

export interface AuthResponse {
  token: string
  username: string
}

export async function loginApi(username: string, password: string): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.token)
  return data
}

export async function registerApi(
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })
  setToken(data.token)
  return data
}

export async function logoutApi(): Promise<void> {
  clearToken()
}
