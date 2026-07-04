import { apiRequest } from './client'
import type { ProjectResponse, CreateProjectRequest, UpdateProjectRequest } from '../types/project'
import type { TaskResponse } from '../types/task'

export async function listProjects(): Promise<ProjectResponse[]> {
  return apiRequest<ProjectResponse[]>('/api/projects')
}

export async function getProject(id: string, from?: string, to?: string): Promise<ProjectResponse> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return apiRequest<ProjectResponse>(`/api/projects/${id}${query ? `?${query}` : ''}`)
}

export async function getProjectTasks(id: string, from?: string, to?: string): Promise<TaskResponse[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return apiRequest<TaskResponse[]>(`/api/projects/${id}/tasks${query ? `?${query}` : ''}`)
}

export async function createProject(request: CreateProjectRequest): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function updateProject(id: string, request: UpdateProjectRequest): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export async function deleteProject(id: string): Promise<void> {
  return apiRequest<void>(`/api/projects/${id}`, { method: 'DELETE' })
}
