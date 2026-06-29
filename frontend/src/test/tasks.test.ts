import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentTask,
  listTasks,
  startTask,
  stopTask,
  createTask,
  getTask,
  updateTask,
  deleteTask,
} from '../api/tasks'

const task = {
  id: 'abc',
  description: 'Working',
  startTime: '2026-06-29T10:00:00Z',
  endTime: null,
  projectIds: [],
  createdAt: '2026-06-29T10:00:00Z',
  updatedAt: '2026-06-29T10:00:00Z',
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

describe('tasks api', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('getCurrentTask returns task when running', async () => {
    mockFetch(task)
    const result = await getCurrentTask()
    expect(result).not.toBeNull()
    expect(result?.id).toBe('abc')
  })

  it('getCurrentTask returns null on 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 }),
    )
    const result = await getCurrentTask()
    expect(result).toBeNull()
  })

  it('getCurrentTask returns null for non-task response', async () => {
    mockFetch([])
    const result = await getCurrentTask()
    expect(result).toBeNull()
  })

  it('listTasks returns array', async () => {
    mockFetch([task])
    const result = await listTasks()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('abc')
  })

  it('listTasks appends date range params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)
    await listTasks('2026-06-29T00:00:00Z', '2026-06-29T23:59:59Z')
    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('from=')
    expect(calledUrl).toContain('to=')
  })

  it('startTask creates running task', async () => {
    mockFetch(task, 201)
    const result = await startTask({ description: 'Working' })
    expect(result.id).toBe('abc')
    expect(result.endTime).toBeNull()
  })

  it('startTask throws on 409', async () => {
    mockFetch('Conflict', 409)
    await expect(startTask({})).rejects.toThrow()
  })

  it('stopTask returns stopped task', async () => {
    const stopped = { ...task, endTime: '2026-06-29T11:00:00Z' }
    mockFetch(stopped)
    const result = await stopTask('abc')
    expect(result.endTime).not.toBeNull()
  })

  it('createTask creates manual task', async () => {
    const completed = { ...task, endTime: '2026-06-29T11:00:00Z' }
    mockFetch(completed, 201)
    const result = await createTask({ startTime: task.startTime, endTime: '2026-06-29T11:00:00Z' })
    expect(result.endTime).not.toBeNull()
  })

  it('getTask returns single task', async () => {
    mockFetch(task)
    const result = await getTask('abc')
    expect(result.id).toBe('abc')
  })

  it('updateTask returns updated task', async () => {
    const updated = { ...task, description: 'Updated' }
    mockFetch(updated)
    const result = await updateTask('abc', { startTime: task.startTime, description: 'Updated' })
    expect(result.description).toBe('Updated')
  })

  it('deleteTask resolves for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    await expect(deleteTask('abc')).resolves.toBeUndefined()
  })
})
