export interface UserTimeBreakdown {
  userId: string
  username: string
  seconds: number
}

export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  color: string | null
  parentId: string | null
  ownerUsername: string
  ownerUserId?: string
  createdAt: string
  totalSeconds: number
  userBreakdown: UserTimeBreakdown[]
  budgetSeconds?: number | null
  budgetPeriod?: string | null
  usedSeconds?: number
  budgetPercent?: number | null
}

export interface MemberResponse {
  userId: string
  username: string
  role: string
  inherited?: boolean
}

export interface CreateProjectRequest {
  name: string
  description?: string | null
  color?: string | null
  parentId?: string | null
  budgetSeconds?: number | null
  budgetPeriod?: string | null
}

export interface UpdateProjectRequest {
  name: string
  description?: string | null
  color?: string | null
  budgetSeconds?: number | null
  budgetPeriod?: string | null
}
