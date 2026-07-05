export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  color: string | null
  parentId: string | null
  ownerUsername: string
  createdAt: string
  totalSeconds: number
}

export interface MemberResponse {
  userId: string
  username: string
  role: string
}

export interface CreateProjectRequest {
  name: string
  description?: string | null
  color?: string | null
  parentId?: string | null
}

export interface UpdateProjectRequest {
  name: string
  description?: string | null
  color?: string | null
}
