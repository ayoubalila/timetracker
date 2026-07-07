import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsPage } from '../pages/SettingsPage'

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderSettings(onLogout = vi.fn(), timezone = 'UTC', onTimezoneChange = vi.fn()) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter>
        <SettingsPage
          username="alice"
          onLogout={onLogout}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/tags'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [] })
      return Promise.resolve({
        ok,
        status,
        json: async () => body,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      })
    }),
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders the change password form', () => {
    mockFetch({})
    renderSettings()
    expect(screen.getByTestId('change-password-form')).toBeTruthy()
    expect(screen.getByTestId('current-password-input')).toBeTruthy()
    expect(screen.getByTestId('new-password-input')).toBeTruthy()
    expect(screen.getByTestId('confirm-password-input')).toBeTruthy()
    expect(screen.getByTestId('change-password-submit')).toBeTruthy()
  })

  it('shows error when new passwords do not match', async () => {
    mockFetch({})
    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'different' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    expect(screen.getByTestId('settings-error').textContent).toContain('do not match')
  })

  it('does not call API when passwords do not match', async () => {
    const passwordSpy = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/tags'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [] })
      passwordSpy(url)
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    }))

    renderSettings()
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'mismatch' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    expect(passwordSpy).not.toHaveBeenCalled()
  })

  it('shows success message after successful password change', async () => {
    mockFetch({ message: 'Password changed successfully' })

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => expect(screen.getByTestId('settings-success')).toBeTruthy())
    expect(screen.getByTestId('settings-success').textContent).toContain('Password changed')
  })

  it('clears form fields after successful password change', async () => {
    mockFetch({ message: 'Password changed successfully' })

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => screen.getByTestId('settings-success'))
    expect((screen.getByTestId('current-password-input') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('new-password-input') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('confirm-password-input') as HTMLInputElement).value).toBe('')
  })

  it('shows error message when API call fails', async () => {
    mockFetch('Current password is incorrect', false, 400)

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'wrongpass' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => expect(screen.getByTestId('settings-error')).toBeTruthy())
    expect(screen.getByTestId('settings-error').textContent).toContain('Current password is incorrect')
  })

  it('calls logout handler when logout button clicked', () => {
    mockFetch({})
    const onLogout = vi.fn()
    renderSettings(onLogout)
    fireEvent.click(screen.getByTestId('logout-button'))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('renders nav links to dashboard, projects, and settings', () => {
    mockFetch({})
    renderSettings()
    expect(screen.getByTestId('nav-dashboard')).toBeTruthy()
    expect(screen.getByTestId('nav-projects')).toBeTruthy()
    expect(screen.getByTestId('nav-settings')).toBeTruthy()
  })

  it('shows "An error occurred" for non-Error thrown value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/tags'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [] })
      return Promise.reject('not an error object')
    }))

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => expect(screen.getByTestId('settings-error')).toBeTruthy())
    expect(screen.getByTestId('settings-error').textContent).toBe('An error occurred')
  })

  it('shows generic error message for unexpected errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/tags'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [] })
      return Promise.reject(new Error('Network failure'))
    }))

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => expect(screen.getByTestId('settings-error')).toBeTruthy())
    expect(screen.getByTestId('settings-error').textContent).toContain('Network failure')
  })

  // ── Timezone section ──────────────────────────────────────────────────────

  it('renders timezone form pre-filled with current timezone', () => {
    mockFetch({})
    renderSettings(vi.fn(), 'Europe/Berlin')
    expect(screen.getByTestId('timezone-form')).toBeTruthy()
    const input = screen.getByTestId('timezone-input') as HTMLInputElement
    expect(input.value).toBe('Europe/Berlin')
  })

  it('shows success and calls onTimezoneChange on valid timezone save', async () => {
    mockFetch({ message: "Timezone updated to 'America/New_York'" })
    const onTimezoneChange = vi.fn()
    renderSettings(vi.fn(), 'UTC', onTimezoneChange)
    fireEvent.change(screen.getByTestId('timezone-input'), { target: { value: 'America/New_York' } })
    fireEvent.submit(screen.getByTestId('timezone-form'))

    await waitFor(() => expect(screen.getByTestId('timezone-success')).toBeTruthy())
    expect(onTimezoneChange).toHaveBeenCalledWith('America/New_York')
  })

  it('shows error when timezone API returns 400', async () => {
    mockFetch('Invalid timezone', false, 400)
    renderSettings()
    fireEvent.change(screen.getByTestId('timezone-input'), { target: { value: 'Bad/Zone' } })
    fireEvent.submit(screen.getByTestId('timezone-form'))

    await waitFor(() => expect(screen.getByTestId('timezone-error')).toBeTruthy())
    expect(screen.getByTestId('timezone-error').textContent).toContain('Invalid timezone')
  })

  // ── Tags section ──────────────────────────────────────────────────────────

  it('renders the tags section', () => {
    mockFetch({})
    renderSettings()
    expect(screen.getByTestId('tags-section')).toBeTruthy()
    expect(screen.getByTestId('tag-name-input')).toBeTruthy()
    expect(screen.getByTestId('create-tag-submit')).toBeTruthy()
  })

  it('shows empty state when no tags exist', async () => {
    mockFetch({})
    renderSettings()
    await waitFor(() => expect(screen.getByTestId('tags-empty')).toBeTruthy())
  })

  it('shows existing tags as chips', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/tags'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 't1', name: 'Work', color: '#2563EB' }] })
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    }))
    renderSettings()
    await waitFor(() => expect(screen.getByTestId('tag-chip-t1')).toBeTruthy())
    expect(screen.getByTestId('tag-chip-t1').textContent).toContain('Work')
  })

  it('creates a tag on form submit', async () => {
    const createSpy = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if ((url as string).includes('/tags') && opts?.method === 'POST') {
        createSpy()
        return Promise.resolve({ ok: true, status: 201, json: async () => ({ id: 'new', name: 'Focus', color: '#059669' }) })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    }))

    renderSettings()
    fireEvent.change(screen.getByTestId('tag-name-input'), { target: { value: 'Focus' } })
    fireEvent.submit(screen.getByTestId('tag-create-form'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
  })

  it('shows preview chip when name is typed', () => {
    mockFetch({})
    renderSettings()
    fireEvent.change(screen.getByTestId('tag-name-input'), { target: { value: 'Urgent' } })
    expect(screen.getByTestId('tag-preview')).toBeTruthy()
    expect(screen.getByTestId('tag-preview').textContent).toContain('Urgent')
  })

  it('submit button is disabled when name is empty', () => {
    mockFetch({})
    renderSettings()
    const btn = screen.getByTestId('create-tag-submit') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('deletes a tag when × button is clicked', async () => {
    const deleteSpy = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if ((url as string).includes('/tags/t1') && opts?.method === 'DELETE') {
        deleteSpy()
        return Promise.resolve({ ok: true, status: 204 })
      }
      if ((url as string).includes('/tags'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 't1', name: 'Work', color: '#2563EB' }] })
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    }))

    renderSettings()
    await waitFor(() => screen.getByTestId('delete-tag-t1'))
    fireEvent.click(screen.getByTestId('delete-tag-t1'))
    await waitFor(() => expect(deleteSpy).toHaveBeenCalled())
  })

  it('shows tag form error when creation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if ((url as string).includes('/tags') && opts?.method === 'POST')
        return Promise.resolve({ ok: false, status: 400, text: async () => 'name too long' })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    }))

    renderSettings()
    fireEvent.change(screen.getByTestId('tag-name-input'), { target: { value: 'Bad' } })
    fireEvent.submit(screen.getByTestId('tag-create-form'))

    await waitFor(() => expect(screen.getByTestId('tag-form-error')).toBeTruthy())
  })
})
