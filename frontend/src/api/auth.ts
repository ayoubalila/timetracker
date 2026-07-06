import { apiRequest, setToken, clearToken } from './client'

export interface AuthResponse {
  token: string
  username: string
  timezone: string
}

export interface MessageResponse {
  message: string
}

export async function loginApi(username: string, password: string): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.token)
  localStorage.setItem('tz', data.timezone)
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
  localStorage.setItem('tz', data.timezone)
  return data
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function setTimezoneApi(timezone: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/api/auth/timezone', {
    method: 'PUT',
    body: JSON.stringify({ timezone }),
  })
}

export async function logoutApi(): Promise<void> {
  clearToken()
  localStorage.removeItem('tz')
}
