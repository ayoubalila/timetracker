import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

function stubFetch(currentStatus = 204) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/current')) {
        return Promise.resolve({ ok: true, status: currentStatus })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    }),
  )
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows LoginPage when not authenticated', () => {
    render(<App />)
    expect(screen.getByTestId('tab-login')).toBeTruthy()
  })

  it('shows DashboardPage when valid JWT is in localStorage', () => {
    const payload = btoa(JSON.stringify({ sub: 'alice', exp: 9999999999 }))
    localStorage.setItem('tt_token', `header.${payload}.sig`)
    stubFetch()

    render(<App />)

    expect(screen.getByTestId('logout-button')).toBeTruthy()
  })

  it('handles malformed JWT gracefully and shows DashboardPage', () => {
    localStorage.setItem('tt_token', 'bad.!!!.token')
    stubFetch()

    render(<App />)

    expect(screen.getByTestId('logout-button')).toBeTruthy()
  })

  it('transitions to DashboardPage after successful login', async () => {
    const payload = btoa(JSON.stringify({ sub: 'alice' }))
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ token: `h.${payload}.s`, username: 'alice' }),
        })
        .mockImplementation((url: string) => {
          if ((url as string).includes('/current')) {
            return Promise.resolve({ ok: true, status: 204 })
          }
          return Promise.resolve({ ok: true, status: 200, json: async () => [] })
        }),
    )

    render(<App />)

    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(screen.getByTestId('logout-button')).toBeTruthy())
  })

  it('transitions back to LoginPage after logout', async () => {
    const payload = btoa(JSON.stringify({ sub: 'alice', exp: 9999999999 }))
    localStorage.setItem('tt_token', `header.${payload}.sig`)
    stubFetch()

    render(<App />)
    await waitFor(() => screen.getByTestId('logout-button'))
    fireEvent.click(screen.getByTestId('logout-button'))

    await waitFor(() => expect(screen.getByTestId('tab-login')).toBeTruthy())
  })
})
