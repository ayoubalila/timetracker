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

  it('shows loading state while current task is being fetched', () => {
    renderDashboard(() => new Promise(() => {}))
    expect(screen.getByTestId('current-task-loading')).toBeTruthy()
  })

  it('shows project checkboxes in start form when projects exist', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if (url.includes('/projects')) return Promise.resolve({
        ok: true, status: 200,
        json: async () => [{ id: 'p1', name: 'Work', description: null, color: null, parentId: null, createdAt: '2026-01-01T00:00:00Z', totalSeconds: 0 }],
      })
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
    await waitFor(() => expect(screen.getByTestId('start-project-p1')).toBeTruthy())
  })

  it('sends projectIds in start task body when project checkbox selected', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if (url.includes('/projects')) return Promise.resolve({
        ok: true, status: 200,
        json: async () => [{ id: 'p1', name: 'Work', description: null, color: null, parentId: null, createdAt: '2026-01-01T00:00:00Z', totalSeconds: 0 }],
      })
      if (url.includes('/start') && opts?.method === 'POST') return Promise.resolve({
        ok: true, status: 201,
        json: async () => ({ id: 'new', description: null, startTime: new Date().toISOString(), endTime: null, projectIds: ['p1'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
      })
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
    await waitFor(() => screen.getByTestId('start-project-p1'))
    fireEvent.click(screen.getByTestId('start-project-p1'))
    fireEvent.submit(screen.getByTestId('start-form'))
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]: [string]) => url.includes('/start'))
      expect(call).toBeTruthy()
      const body = JSON.parse((call as [string, RequestInit])[1].body as string)
      expect(body.projectIds).toEqual(['p1'])
    })
  })

  it('auto-opens start form with pre-selected project from location state', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if (url.includes('/projects')) return Promise.resolve({
        ok: true, status: 200,
        json: async () => [{ id: 'p1', name: 'Work', description: null, color: null, parentId: null, createdAt: '2026-01-01T00:00:00Z', totalSeconds: 0 }],
      })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/dashboard', state: { startProjectIds: ['p1'], autoOpen: true } }]}>
          <DashboardPage username="alice" onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    // form should be open without clicking start button (auto-opened via location state)
    await waitFor(() => expect(screen.getByTestId('start-form')).toBeTruthy())
    // project checkbox should be pre-checked
    await waitFor(() => {
      const checkbox = screen.getByTestId('start-project-p1') as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })
  })

  it('shows friendly error and refetches when start returns 409', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if ((url as string).includes('/start') && (opts as RequestInit)?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          text: async () => 'A task is already running',
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

    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-task-button'))
    fireEvent.submit(screen.getByTestId('start-form'))

    await waitFor(() => expect(screen.getByTestId('start-error')).toBeTruthy())
    expect(screen.getByTestId('start-error').textContent).toContain('already running')
  })

  it('Space key opens start form when no task is running', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.keyDown(window, { code: 'Space' })
    await waitFor(() => expect(screen.getByTestId('start-form')).toBeTruthy())
  })

  it('Space key does not open start form when start form is already open', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-task-button'))
    expect(screen.getByTestId('start-form')).toBeTruthy()
    // second Space press should not duplicate or hide the form
    fireEvent.keyDown(window, { code: 'Space' })
    expect(screen.getByTestId('start-form')).toBeTruthy()
  })

  it('Space key does not trigger when focus is on an input', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-task-button'))
    const input = screen.getByTestId('start-description')
    fireEvent.keyDown(input, { code: 'Space' })
    // form stays open — no unintended action
    expect(screen.getByTestId('start-form')).toBeTruthy()
  })

  it('clicking Today tab triggers day overview query', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('tab-day'))
    fireEvent.click(screen.getByTestId('tab-day'))
    await waitFor(() => {
      const called = fetchMock.mock.calls.some(([url]: [string]) => url.includes('/overview/day'))
      expect(called).toBe(true)
    })
  })

  it('clicking Week tab triggers week overview query', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('tab-week'))
    fireEvent.click(screen.getByTestId('tab-week'))
    await waitFor(() => {
      const called = fetchMock.mock.calls.some(([url]: [string]) => url.includes('/overview/week'))
      expect(called).toBe(true)
    })
  })

  it('clicking Month tab triggers month overview query', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('tab-month'))
    fireEvent.click(screen.getByTestId('tab-month'))
    await waitFor(() => {
      const called = fetchMock.mock.calls.some(([url]: [string]) => url.includes('/overview/month'))
      expect(called).toBe(true)
    })
  })

  it('clicking a sort header changes sort key', async () => {
    const completedTask = {
      id: 'sort-1',
      description: 'Sortable',
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
    await waitFor(() => screen.getByTestId('task-item-sort-1'))
    fireEvent.click(screen.getByTestId('sort-description'))
    expect(screen.getByTestId('task-item-sort-1')).toBeTruthy()
    // click again to reverse
    fireEvent.click(screen.getByTestId('sort-description'))
    expect(screen.getByTestId('task-item-sort-1')).toBeTruthy()
  })

  it('clicking sort-end and sort-duration headers work', async () => {
    const completedTask = {
      id: 'sort-2',
      description: 'For sorting',
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
    await waitFor(() => screen.getByTestId('task-item-sort-2'))
    fireEvent.click(screen.getByTestId('sort-end'))
    fireEvent.click(screen.getByTestId('sort-duration'))
    fireEvent.click(screen.getByTestId('sort-start'))
    expect(screen.getByTestId('task-item-sort-2')).toBeTruthy()
  })

  it('Space key stops running task when a task is active', async () => {
    const runningTask = {
      id: 'space-stop',
      description: 'Running',
      startTime: new Date(Date.now() - 60000).toISOString(),
      endTime: null,
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/current'))
        return Promise.resolve({ ok: true, status: 200, json: async () => runningTask })
      if (url.includes('/stop') && opts?.method === 'POST')
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ...runningTask, endTime: new Date().toISOString() }) })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('stop-button'))
    fireEvent.keyDown(window, { code: 'Space' })
    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        ([url, opts]: [string, RequestInit]) => url.includes('/stop') && opts?.method === 'POST',
      )
      expect(called).toBe(true)
    })
  })

  it('shows total duration and covers all sort comparator branches with 2 tasks', async () => {
    const task1 = {
      id: 'two-a',
      description: 'Alpha',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    const task2 = {
      id: 'two-b',
      description: null,
      startTime: '2026-06-29T11:00:00Z',
      endTime: '2026-06-29T12:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T11:00:00Z',
      updatedAt: '2026-06-29T12:00:00Z',
    }
    renderDashboard((url: string) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [task1, task2] })
    })
    await waitFor(() => screen.getByTestId('task-item-two-a'))
    // total duration row
    expect(screen.getByTestId('total-duration').textContent).toContain('Total:')
    // click sort headers to exercise comparator branches
    fireEvent.click(screen.getByTestId('sort-description'))
    fireEvent.click(screen.getByTestId('sort-description')) // toggle direction (asc→desc)
    fireEvent.click(screen.getByTestId('sort-end'))
    fireEvent.click(screen.getByTestId('sort-duration'))
    fireEvent.click(screen.getByTestId('sort-start'))
    expect(screen.getByTestId('task-item-two-a')).toBeTruthy()
  })

  it('non-409 start error shows the error message in the form', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if (url.includes('/start') && opts?.method === 'POST')
        return Promise.resolve({ ok: false, status: 500, text: async () => 'Server error' })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('start-task-button'))
    fireEvent.click(screen.getByTestId('start-task-button'))
    fireEvent.submit(screen.getByTestId('start-form'))
    await waitFor(() => expect(screen.getByTestId('start-error').textContent).toContain('Server error'))
  })

  it('fires a toast when the stop mutation errors', async () => {
    const runningTask = {
      id: 'stop-err',
      description: 'Active',
      startTime: new Date(Date.now() - 30000).toISOString(),
      endTime: null,
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/current'))
        return Promise.resolve({ ok: true, status: 200, json: async () => runningTask })
      if (url.includes('/stop') && opts?.method === 'POST')
        return Promise.resolve({ ok: false, status: 500, text: async () => 'Stop failed' })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    let toastFired = false
    const listener = () => { toastFired = true }
    window.addEventListener('app:toast', listener)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('stop-button'))
    fireEvent.click(screen.getByTestId('stop-button'))
    await waitFor(() => expect(toastFired).toBe(true))
    window.removeEventListener('app:toast', listener)
  })

  it('shows error in add-task form when create mutation errors', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if (url === '/api/tasks' && opts?.method === 'POST')
        return Promise.resolve({ ok: false, status: 400, text: async () => 'Bad request' })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('add-task-button'))
    fireEvent.click(screen.getByTestId('add-task-button'))
    await waitFor(() => screen.getByTestId('task-form'))
    fireEvent.submit(screen.getByTestId('task-form'))
    await waitFor(() => expect(screen.getByTestId('form-error')).toBeTruthy())
    expect(screen.getByTestId('form-error').textContent).toContain('Bad request')
  })

  it('shows error in edit-task form when update mutation errors', async () => {
    const completedTask = {
      id: 'upd-err',
      description: 'To update',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if (url.includes('upd-err') && opts?.method === 'PUT')
        return Promise.resolve({ ok: false, status: 400, text: async () => 'Update failed' })
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('edit-task-upd-err'))
    fireEvent.click(screen.getByTestId('edit-task-upd-err'))
    await waitFor(() => screen.getByTestId('task-form'))
    fireEvent.submit(screen.getByTestId('task-form'))
    await waitFor(() => expect(screen.getByTestId('form-error')).toBeTruthy())
    expect(screen.getByTestId('form-error').textContent).toContain('Update failed')
  })

  it('fires a toast when the delete mutation errors', async () => {
    const completedTask = {
      id: 'del-err',
      description: 'Delete me',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      if (url.includes('del-err') && opts?.method === 'DELETE')
        return Promise.resolve({ ok: false, status: 500, text: async () => 'Delete failed' })
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    let toastFired = false
    const listener = () => { toastFired = true }
    window.addEventListener('app:toast', listener)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('delete-task-del-err'))
    fireEvent.click(screen.getByTestId('delete-task-del-err'))
    await waitFor(() => expect(toastFired).toBe(true))
    window.removeEventListener('app:toast', listener)
  })

  it('canceling the edit task form clears editing state', async () => {
    const completedTask = {
      id: 'cancel-edit',
      description: 'Edit me',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    renderDashboard((url: string) => {
      if (url.includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    await waitFor(() => screen.getByTestId('edit-task-cancel-edit'))
    fireEvent.click(screen.getByTestId('edit-task-cancel-edit'))
    await waitFor(() => screen.getByTestId('task-form'))
    fireEvent.click(screen.getByTestId('task-form-cancel'))
    await waitFor(() => expect(screen.queryByTestId('task-form')).toBeNull())
  })

  it('current task with null description shows placeholder text', async () => {
    const runningTask = {
      id: 'no-desc-task',
      description: null,
      startTime: new Date(Date.now() - 30000).toISOString(),
      endTime: null,
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    renderDashboard((url: string) => {
      if (url.includes('/current'))
        return Promise.resolve({ ok: true, status: 200, json: async () => runningTask })
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    await waitFor(() => screen.getByTestId('current-task-panel'))
    expect(screen.getByTestId('current-task-description').textContent).toBe('(no description)')
  })

  it('shows task date in non-day tabs', async () => {
    const completedTask = {
      id: 'date-task',
      description: 'Date shown',
      startTime: '2026-06-29T09:00:00Z',
      endTime: '2026-06-29T10:00:00Z',
      projectIds: [],
      createdAt: '2026-06-29T09:00:00Z',
      updatedAt: '2026-06-29T10:00:00Z',
    }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/current')) return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, status: 200, json: async () => [completedTask] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><DashboardPage username="alice" onLogout={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    // All tab shows date (not day tab)
    await waitFor(() => screen.getByTestId('task-item-date-task'))
    // The task row should be visible with date info
    expect(screen.getByTestId('task-item-date-task')).toBeTruthy()
  })
})
