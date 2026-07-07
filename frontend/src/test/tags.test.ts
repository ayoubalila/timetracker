import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listTags, createTag, deleteTag } from '../api/tags'

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

describe('tags api', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('listTags returns tag array', async () => {
    const tag = { id: 'tid1', name: 'Bug', color: '#ff0000' }
    mockFetch([tag])
    const result = await listTags()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bug')
    expect(result[0].color).toBe('#ff0000')
  })

  it('listTags returns empty array', async () => {
    mockFetch([])
    const result = await listTags()
    expect(result).toHaveLength(0)
  })

  it('listTags throws on error', async () => {
    mockFetch('Unauthorized', 401)
    await expect(listTags()).rejects.toThrow()
  })

  it('createTag posts to /api/tags and returns created tag', async () => {
    const tag = { id: 'tid2', name: 'Feature', color: '#00ff00' }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => tag })
    vi.stubGlobal('fetch', fetchMock)
    const result = await createTag({ name: 'Feature', color: '#00ff00' })
    expect(result.id).toBe('tid2')
    expect(result.name).toBe('Feature')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/tags')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('createTag sends correct JSON body', async () => {
    const tag = { id: 'tid3', name: 'Blocker', color: '#ff00ff' }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => tag })
    vi.stubGlobal('fetch', fetchMock)
    await createTag({ name: 'Blocker', color: '#ff00ff' })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.name).toBe('Blocker')
    expect(body.color).toBe('#ff00ff')
  })

  it('createTag throws on 409 conflict', async () => {
    mockFetch('Duplicate tag name', 409)
    await expect(createTag({ name: 'Bug', color: '#ff0000' })).rejects.toThrow()
  })

  it('deleteTag calls DELETE on /api/tags/{id}', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)
    await deleteTag('tid1')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/tags/tid1')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('deleteTag resolves without value on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    await expect(deleteTag('tid1')).resolves.toBeUndefined()
  })

  it('deleteTag throws on 404', async () => {
    mockFetch('Not found', 404)
    await expect(deleteTag('nonexistent')).rejects.toThrow()
  })
})
