import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../pages/DashboardPage'

function renderDashboard(fetchImpl?: (url: string) => Promise<unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const defaultFetch = (url: string) => {
    if ((url as string).includes('/current')) {
      return Promise.resolve({ ok: true, status: 204 })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => [] })
  }
  vi.stubGlobal('fetch', vi.fn().mockImplementation(fetchImpl ?? defaultFetch))

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage username="alice" onLogout={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders nav with username and logout button', () => {
    renderDashboard()
    expect(screen.getByTestId('logout-button')).toBeTruthy()
    expect(screen.getByText('alice')).toBeTruthy()
  })

  it('shows start-task-button when no current task', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByTestId('start-task-button')).toBeTruthy())
  })

  it('shows current task panel and stop button when task is running', async () => {
    const runningTask = {
      id: 'task-1',
      description: 'Deep work',
      startTime: new Date(Date.now() - 60000).toISOString(),
      endTime: null,
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    renderDashboard((url: string) => {
      if ((url as string).includes('/current')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => runningTask })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    await waitFor(() => expect(screen.getByTestId('current-task-panel')).toBeTruthy())
    expect(screen.getByTestId('stop-button')).toBeTruthy()
    expect(screen.getByTestId('current-task-description').textContent).toBe('Deep work')
    expect(screen.getByTestId('live-timer')).toBeTruthy()
  })

  it('shows start form when start button is clicked', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-task-button'))
    expect(screen.getByTestId('start-form')).toBeTruthy()
    expect(screen.getByTestId('start-description')).toBeTruthy()
  })

  it('hides start form when cancel is clicked', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-cancel'))
    expect(screen.queryByTestId('start-form')).toBeNull()
  })

  it('calls startTask API when start form is submitted', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/start')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            id: 'new-task',
            description: 'New work',
            startTime: new Date().toISOString(),
            endTime: null,
            projectIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        })
      }
      if ((url as string).includes('/current')) {
        return Promise.resolve({ ok: true, status: 204 })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage username="alice" onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-task-button'))
    fireEvent.change(screen.getByTestId('start-description'), { target: { value: 'New work' } })
    fireEvent.submit(screen.getByTestId('start-form'))

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(([url]: [string]) => url.includes('/start'))
      expect(called).toBe(true)
    })
  })

  it('shows tasks-empty when no completed tasks', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByTestId('tasks-empty')).toBeTruthy())
  })

  it('shows completed tasks in task list', async () => {
    const completedTask = {
      id: 'done-1',
      description: 'Finished',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    renderDashboard((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    await waitFor(() => expect(screen.getByTestId(`task-item-done-1`)).toBeTruthy())
  })

  it('shows task form when add-task button is clicked', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('add-task-button'))
    fireEvent.click(screen.getByTestId('add-task-button'))
    expect(screen.getByTestId('task-form')).toBeTruthy()
  })

  it('shows edit form when edit button is clicked', async () => {
    const completedTask = {
      id: 'done-2',
      description: 'Done work',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    renderDashboard((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    await waitFor(() => screen.getByTestId('edit-task-done-2'))
    fireEvent.click(screen.getByTestId('edit-task-done-2'))
    expect(screen.getByTestId('task-form')).toBeTruthy()
  })

  it('calls delete API with confirmation when delete button clicked', async () => {
    const completedTask = {
      id: 'done-3',
      description: 'To delete',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if ((url as string).includes('done-3') && !(url as string).includes('/current')) {
        return Promise.resolve({ ok: true, status: 204 })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage username="alice" onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => screen.getByTestId('delete-task-done-3'))
    fireEvent.click(screen.getByTestId('delete-task-done-3'))

    expect(window.confirm).toHaveBeenCalledWith('Delete this task?')
    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        ([url, opts]: [string, RequestInit]) =>
          url.includes('done-3') && opts?.method === 'DELETE',
      )
      expect(called).toBe(true)
    })
  })

  it('calls logout handler when logout is clicked', () => {
    const onLogout = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage username="alice" onLogout={onLogout} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByTestId('logout-button'))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('stop button calls stop API', async () => {
    const runningTask = {
      id: 'task-stop',
      description: 'Active',
      startTime: new Date(Date.now() - 60000).toISOString(),
      endTime: null,
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/current')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => runningTask })
      }
      if ((url as string).includes('/stop')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...runningTask, endTime: new Date().toISOString() }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage username="alice" onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => screen.getByTestId('stop-button'))
    fireEvent.click(screen.getByTestId('stop-button'))

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        ([url, opts]: [string, RequestInit]) =>
          url.includes('/stop') && opts?.method === 'POST',
      )
      expect(called).toBe(true)
    })
  })

  it('submits add task form and calls createTask', async () => {
    const newTask = {
      id: 'created',
      description: 'Manual entry',
      startTime: '2026-06-29T08:00:00Z',
      endTime: '2026-06-29T09:00:00Z',
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const fetchMock = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if ((url as string) === '/api/tasks' && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, status: 201, json: async () => newTask })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage username="alice" onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => screen.getByTestId('add-task-button'))
    fireEvent.click(screen.getByTestId('add-task-button'))
    await waitFor(() => screen.getByTestId('task-form'))
    fireEvent.submit(screen.getByTestId('task-form'))

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        ([url, opts]: [string, RequestInit]) =>
          (url as string) === '/api/tasks' && opts?.method === 'POST',
      )
      expect(called).toBe(true)
    })
  })

  it('submits edit task form and calls updateTask', async () => {
    const completedTask = {
      id: 'edit-me',
      description: 'To edit',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    const fetchMock = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if ((url as string).includes('edit-me') && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...completedTask, description: 'Edited' }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage username="alice" onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => screen.getByTestId('edit-task-edit-me'))
    fireEvent.click(screen.getByTestId('edit-task-edit-me'))
    await waitFor(() => screen.getByTestId('task-form'))
    fireEvent.submit(screen.getByTestId('task-form'))

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        ([url, opts]: [string, RequestInit]) =>
          (url as string).includes('edit-me') && opts?.method === 'PUT',
      )
      expect(called).toBe(true)
    })
  })

  it('does not delete when confirmation is declined', async () => {
    const completedTask = {
      id: 'no-delete',
      description: 'Keep me',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    renderDashboard((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    await waitFor(() => screen.getByTestId('delete-task-no-delete'))
    fireEvent.click(screen.getByTestId('delete-task-no-delete'))

    expect(window.confirm).toHaveBeenCalledWith('Delete this task?')
  })

  it('shows duration in hours for long tasks (h > 0 branch)', async () => {
    const longTask = {
      id: 'long-1',
      description: 'Long task',
      startTime: new Date(Date.now() - 3700000).toISOString(), // > 1h ago
      endTime: new Date().toISOString(),
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    renderDashboard((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [longTask] })
    })
    await waitFor(() => screen.getByTestId('task-item-long-1'))
    const item = screen.getByTestId('task-item-long-1')
    expect(item.textContent).toMatch(/1h/)
  })
})
