import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getToken, setToken, clearToken, isAuthenticated, apiRequest } from '../api/client'

describe('token utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getToken returns null when not set', () => {
    expect(getToken()).toBeNull()
  })

  it('setToken stores and getToken retrieves', () => {
    setToken('abc')
    expect(getToken()).toBe('abc')
  })

  it('clearToken removes the token', () => {
    setToken('abc')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('isAuthenticated returns false when no token', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('isAuthenticated returns true when token set', () => {
    setToken('abc')
    expect(isAuthenticated()).toBe(true)
  })
})

describe('apiRequest', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sends Authorization header when token is set', async () => {
    setToken('test-token')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await apiRequest('/api/test')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Authorization']).toBe('Bearer test-token')
  })

  it('omits Authorization header when no token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    await apiRequest('/api/test')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Authorization']).toBeUndefined()
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))

    const result = await apiRequest('/api/test', { method: 'DELETE' })
    expect(result).toBeUndefined()
  })

  it('throws on non-ok response with body text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => 'Conflict',
    }))

    await expect(apiRequest('/api/test')).rejects.toThrow('Conflict')
  })

  it('throws with HTTP status when body is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => '',
    }))

    await expect(apiRequest('/api/test')).rejects.toThrow('HTTP 500')
  })
})
