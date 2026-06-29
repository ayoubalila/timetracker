import { describe, it, expect, beforeEach, vi } from 'vitest'
import { listProjects, getProject, createProject, updateProject, deleteProject } from '../api/projects'

const project = {
  id: '123',
  name: 'Work',
  description: null,
  color: null,
  parentId: null,
  createdAt: '2026-06-24T00:00:00Z',
}

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    }),
  )
}

describe('projects api', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('listProjects returns array', async () => {
    mockFetch([project])
    const result = await listProjects()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Work')
  })

  it('getProject returns single project', async () => {
    mockFetch(project)
    const result = await getProject('123')
    expect(result.id).toBe('123')
  })

  it('createProject returns new project', async () => {
    mockFetch(project, 201)
    const result = await createProject({ name: 'Work' })
    expect(result.name).toBe('Work')
  })

  it('updateProject returns updated project', async () => {
    mockFetch({ ...project, name: 'Renamed' })
    const result = await updateProject('123', { name: 'Renamed' })
    expect(result.name).toBe('Renamed')
  })

  it('deleteProject resolves for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    await expect(deleteProject('123')).resolves.toBeUndefined()
  })

  it('createProject throws on 409', async () => {
    mockFetch('Conflict', 409)
    await expect(createProject({ name: 'Work' })).rejects.toThrow()
  })
})
