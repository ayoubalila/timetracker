import { apiRequest } from './client'
import type { CreateTaskRequest, StartTaskRequest, TaskResponse, UpdateTaskRequest } from '../types/task'

export async function getCurrentTask(): Promise<TaskResponse | null> {
  const result = await apiRequest<TaskResponse | undefined>('/api/tasks/current')
  if (!result || typeof result !== 'object' || !('id' in result)) return null
  return result
}

export async function listTasks(from?: string, to?: string): Promise<TaskResponse[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return apiRequest<TaskResponse[]>(`/api/tasks${query ? `?${query}` : ''}`)
}

export async function startTask(req: StartTaskRequest): Promise<TaskResponse> {
  return apiRequest<TaskResponse>('/api/tasks/start', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function stopTask(id: string): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/api/tasks/${id}/stop`, { method: 'POST' })
}

export async function createTask(req: CreateTaskRequest): Promise<TaskResponse> {
  return apiRequest<TaskResponse>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getTask(id: string): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/api/tasks/${id}`)
}

export async function updateTask(id: string, req: UpdateTaskRequest): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  })
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/api/tasks/${id}`, { method: 'DELETE' })
}

export async function getOverviewDay(): Promise<TaskResponse[]> {
  return apiRequest<TaskResponse[]>('/api/overview/day')
}

export async function getOverviewWeek(): Promise<TaskResponse[]> {
  return apiRequest<TaskResponse[]>('/api/overview/week')
}

export async function getOverviewMonth(): Promise<TaskResponse[]> {
  return apiRequest<TaskResponse[]>('/api/overview/month')
}
