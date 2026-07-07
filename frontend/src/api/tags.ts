import { apiRequest } from './client'
import type { TagResponse, CreateTagRequest } from '../types/tag'

export async function listTags(): Promise<TagResponse[]> {
  return apiRequest<TagResponse[]>('/api/tags')
}

export async function createTag(req: CreateTagRequest): Promise<TagResponse> {
  return apiRequest<TagResponse>('/api/tags', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function deleteTag(id: string): Promise<void> {
  await apiRequest<void>(`/api/tags/${id}`, { method: 'DELETE' })
}
