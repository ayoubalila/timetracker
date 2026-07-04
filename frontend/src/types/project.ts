export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  color: string | null
  parentId: string | null
  createdAt: string
  totalSeconds: number
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
