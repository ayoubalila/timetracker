import { apiRequest } from './client'
import type { ProjectResponse, CreateProjectRequest, UpdateProjectRequest } from '../types/project'

export async function listProjects(): Promise<ProjectResponse[]> {
  return apiRequest<ProjectResponse[]>('/api/projects')
}

export async function getProject(id: string): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>(`/api/projects/${id}`)
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
