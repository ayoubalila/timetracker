import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMembers, inviteMember, removeMember } from '../api/members'

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

const member = { userId: 'u1', username: 'alice', role: 'MEMBER', inherited: false }

describe('members api', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('getMembers returns member array', async () => {
    mockFetch([member])
    const result = await getMembers('proj1')
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe('alice')
    expect(result[0].userId).toBe('u1')
  })

  it('getMembers calls correct URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await getMembers('proj1')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/proj1/members')
  })

  it('getMembers returns empty array when no members', async () => {
    mockFetch([])
    const result = await getMembers('proj1')
    expect(result).toHaveLength(0)
  })

  it('getMembers throws on error', async () => {
    mockFetch('Forbidden', 403)
    await expect(getMembers('proj1')).rejects.toThrow()
  })

  it('inviteMember posts to /api/projects/{id}/members', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => member })
    vi.stubGlobal('fetch', fetchMock)
    const result = await inviteMember('proj1', { username: 'alice' })
    expect(result.username).toBe('alice')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/proj1/members')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('inviteMember sends correct JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => member })
    vi.stubGlobal('fetch', fetchMock)
    await inviteMember('proj1', { username: 'alice' })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.username).toBe('alice')
  })

  it('inviteMember throws on 404 user not found', async () => {
    mockFetch('User not found', 404)
    await expect(inviteMember('proj1', { username: 'unknown' })).rejects.toThrow()
  })

  it('inviteMember throws on 409 already a member', async () => {
    mockFetch('Already a member', 409)
    await expect(inviteMember('proj1', { username: 'alice' })).rejects.toThrow()
  })

  it('removeMember calls DELETE on /api/projects/{id}/members/{userId}', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)
    await removeMember('proj1', 'u1')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/proj1/members/u1')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('removeMember resolves without value on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    await expect(removeMember('proj1', 'u1')).resolves.toBeUndefined()
  })

  it('removeMember throws on 404', async () => {
    mockFetch('Not found', 404)
    await expect(removeMember('proj1', 'nonexistent')).rejects.toThrow()
  })
})
