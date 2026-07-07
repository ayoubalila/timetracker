import { describe, it, expect, beforeEach, vi } from 'vitest'
import { listProjects, getProject, getProjectTasks, createProject, updateProject, deleteProject, exportProjectCsv } from '../api/projects'

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

  it('getProject appends from/to query params when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => project })
    vi.stubGlobal('fetch', fetchMock)
    await getProject('123', '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('from=')
    expect(url).toContain('to=')
  })

  it('getProject without params omits query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => project })
    vi.stubGlobal('fetch', fetchMock)
    await getProject('123')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/123')
  })

  it('getProjectTasks returns task array', async () => {
    const task = { id: 't1', description: 'Work', startTime: '2026-06-01T00:00:00Z', endTime: null, projectIds: ['123'], createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z' }
    mockFetch([task])
    const result = await getProjectTasks('123')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t1')
  })

  it('getProjectTasks appends from/to params when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await getProjectTasks('123', '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('from=')
    expect(url).toContain('to=')
  })

  it('getProjectTasks appends userId when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await getProjectTasks('123', undefined, undefined, 'user-uuid-1')
    expect(fetchMock.mock.calls[0][0]).toContain('userId=user-uuid-1')
  })

  it('getProjectTasks appends tagId when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await getProjectTasks('123', undefined, undefined, undefined, 'tag-uuid-1')
    expect(fetchMock.mock.calls[0][0]).toContain('tagId=tag-uuid-1')
  })

  it('getProjectTasks without params omits query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await getProjectTasks('123')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/123/tasks')
  })

  it('exportProjectCsv fetches export URL and returns blob', async () => {
    const blob = new Blob(['csv data'], { type: 'text/csv' })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob })
    vi.stubGlobal('fetch', fetchMock)
    const result = await exportProjectCsv('123')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/123/export')
    expect(result).toBe(blob)
  })

  it('exportProjectCsv appends month param when provided', async () => {
    const blob = new Blob(['csv data'], { type: 'text/csv' })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob })
    vi.stubGlobal('fetch', fetchMock)
    await exportProjectCsv('123', '2026-06')
    expect(fetchMock.mock.calls[0][0]).toContain('month=2026-06')
  })

  it('exportProjectCsv throws ApiError on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    vi.stubGlobal('fetch', fetchMock)
    await expect(exportProjectCsv('123')).rejects.toThrow()
  })
})
