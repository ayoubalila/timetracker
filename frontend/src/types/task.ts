export interface TaskResponse {
  id: string
  description: string | null
  startTime: string
  endTime: string | null
  projectIds: string[]
  ownerUsername: string
  createdAt: string
  updatedAt: string
}

export interface StartTaskRequest {
  description?: string
  projectIds?: string[]
}

export interface CreateTaskRequest {
  description?: string
  startTime: string
  endTime?: string
  projectIds?: string[]
}

export interface UpdateTaskRequest {
  description?: string
  startTime: string
  endTime?: string
  projectIds?: string[]
}
