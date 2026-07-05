import { apiRequest } from './client'
import type { MemberResponse } from '../types/project'

export async function getMembers(projectId: string): Promise<MemberResponse[]> {
  return apiRequest<MemberResponse[]>(`/api/projects/${projectId}/members`)
}

export async function inviteMember(
  projectId: string,
  request: { username: string },
): Promise<MemberResponse> {
  return apiRequest<MemberResponse>(`/api/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  return apiRequest<void>(`/api/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  })
}
