import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ProjectsPage } from '../pages/ProjectsPage'
import type { ProjectResponse } from '../types/project'
import type { TaskResponse } from '../types/task'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const project: ProjectResponse = {
  id: '1',
  name: 'Work',
  description: null,
  color: null,
  parentId: null,
  ownerUsername: 'alice',
  createdAt: '2026-06-24T00:00:00Z',
  totalSeconds: 0,
  userBreakdown: [],
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return {
    queryClient,
    renderPage: () =>
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ProjectsPage username="alice" onLogout={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>,
      ),
  }
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

describe('ProjectsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    mockNavigate.mockClear()
  })

  it('shows loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const { renderPage } = setup()
    renderPage()
    expect(screen.getByText('Loading…')).toBeTruthy()
  })

  it('shows empty state when no projects', async () => {
    mockFetch([])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy())
    expect(screen.getByText(/Create your first project/)).toBeTruthy()
  })

  it('renders project tree when projects exist', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => expect(screen.getByTestId('project-tree')).toBeTruthy())
    expect(screen.getByText('Work')).toBeTruthy()
  })

  it('opens create form when New button clicked', async () => {
    mockFetch([])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('new-project-button'))
    fireEvent.click(screen.getByTestId('new-project-button'))
    expect(screen.getByTestId('create-form')).toBeTruthy()
  })

  it('cancels create form', async () => {
    mockFetch([])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('new-project-button'))
    fireEvent.click(screen.getByTestId('new-project-button'))
    fireEvent.click(screen.getByTestId('create-cancel'))
    expect(screen.queryByTestId('create-form')).toBeNull()
  })

  it('creates a project on form submit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => project })
      .mockResolvedValue({ ok: true, status: 200, json: async () => [project] })
    vi.stubGlobal('fetch', fetchMock)

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('new-project-button'))
    fireEvent.click(screen.getByTestId('new-project-button'))
    fireEvent.change(screen.getByTestId('create-name-input'), { target: { value: 'Work' } })
    fireEvent.click(screen.getByTestId('create-submit'))

    await waitFor(() => expect(screen.queryByTestId('create-form')).toBeNull())
  })

  it('shows error when create fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: false, status: 409, text: async () => 'Name conflict' }),
    )

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('new-project-button'))
    fireEvent.click(screen.getByTestId('new-project-button'))
    fireEvent.change(screen.getByTestId('create-name-input'), { target: { value: 'Work' } })
    fireEvent.click(screen.getByTestId('create-submit'))

    await waitFor(() => expect(screen.getByTestId('form-error')).toBeTruthy())
  })

  it('selects a project and shows detail panel', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    expect(screen.getByTestId('project-detail')).toBeTruthy()
  })

  it('opens edit form from detail panel', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('edit-button'))
    expect(screen.getByTestId('edit-form')).toBeTruthy()
  })

  it('cancels edit form', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('edit-button'))
    fireEvent.click(screen.getByTestId('edit-cancel'))
    expect(screen.queryByTestId('edit-form')).toBeNull()
  })

  it('deletes a project after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [project] })
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValue({ ok: true, status: 200, json: async () => [] }),
    )

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('delete-button'))

    await waitFor(() => expect(screen.queryByTestId('project-detail')).toBeNull())
  })

  it('does not delete when confirmation declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockFetch([project])

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('delete-button'))

    expect(screen.getByTestId('project-detail')).toBeTruthy()
  })

  it('logs out when logout button clicked', async () => {
    mockFetch([])
    const onLogout = vi.fn()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProjectsPage username="alice" onLogout={onLogout} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => screen.getByTestId('logout-button'))
    fireEvent.click(screen.getByTestId('logout-button'))
    expect(onLogout).toHaveBeenCalled()
  })

  it('empty state shows select message when projects exist', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-tree'))
    expect(screen.getByTestId('empty-state')).toBeTruthy()
    expect(screen.getByText('Select a project from the sidebar.')).toBeTruthy()
  })

  it('adds subproject button sets parent in create form', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('add-subproject-button'))
    expect(screen.getByTestId('create-form')).toBeTruthy()
    const select = screen.getByTestId('create-parent-select') as HTMLSelectElement
    expect(select.value).toBe('1')
  })

  it('submits edit form and updates project name', async () => {
    const updated = { ...project, name: 'Renamed' }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [project] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => updated })
      .mockResolvedValue({ ok: true, status: 200, json: async () => [updated] }),
    )

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('edit-button'))
    const input = screen.getByTestId('edit-name-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByTestId('edit-submit'))

    await waitFor(() => expect(screen.queryByTestId('edit-form')).toBeNull())
  })

  it('shows error when update fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [project] })
      .mockResolvedValueOnce({ ok: false, status: 409, text: async () => 'Name conflict' }),
    )

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('edit-button'))
    fireEvent.click(screen.getByTestId('edit-submit'))

    await waitFor(() => screen.getByTestId('edit-form'))
    // form stays open with error
    expect(screen.getByTestId('edit-form')).toBeTruthy()
  })

  it('changes parent select in create form', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('new-project-button'))
    fireEvent.click(screen.getByTestId('new-project-button'))
    const select = screen.getByTestId('create-parent-select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '1' } })
    expect(select.value).toBe('1')
    // reset to top level
    fireEvent.change(select, { target: { value: '' } })
    expect(select.value).toBe('')
  })

  it('shows start-task-for-project-button when project is selected', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    expect(screen.getByTestId('start-task-for-project-button')).toBeTruthy()
  })

  it('clicking start-task button navigates to dashboard with project id', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('start-task-for-project-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
      state: { startProjectIds: ['1'], autoOpen: true },
    })
  })

  // ── Task list coverage ────────────────────────────────────────────────────

  const projTask1: TaskResponse = {
    id: 'pt1',
    description: 'Alpha task',
    startTime: '2026-06-29T08:00:00Z',
    endTime: '2026-06-29T09:00:00Z',
    projectIds: ['1'],
    ownerUsername: 'alice',
    createdAt: '2026-06-29T08:00:00Z',
    updatedAt: '2026-06-29T09:00:00Z',
  }
  const projTask2: TaskResponse = {
    id: 'pt2',
    description: null,
    startTime: '2026-06-29T10:00:00Z',
    endTime: null,
    projectIds: ['1'],
    ownerUsername: 'alice',
    createdAt: '2026-06-29T10:00:00Z',
    updatedAt: '2026-06-29T10:00:00Z',
  }

  function stubWithTasks(tasks: TaskResponse[] = [projTask1, projTask2]) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/members'))
          return Promise.resolve({ ok: true, status: 200, json: async () => [] })
        if (url.includes('/tasks'))
          return Promise.resolve({ ok: true, status: 200, json: async () => tasks })
        if (url.includes('/projects/'))
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ ...project, totalSeconds: 3600 }) })
        return Promise.resolve({ ok: true, status: 200, json: async () => [project] })
      }),
    )
  }

  it('shows task rows including "(no description)" and "Running" placeholders', async () => {
    stubWithTasks()
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('project-task-list'))
    expect(screen.getByTestId('proj-task-pt1')).toBeTruthy()
    expect(screen.getByTestId('proj-task-pt2')).toBeTruthy()
    expect(screen.getByText('(no description)')).toBeTruthy()
    expect(screen.getByText('Running')).toBeTruthy()
  })

  it('shows task count and total duration row', async () => {
    stubWithTasks()
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('proj-total-duration'))
    expect(screen.getByTestId('proj-total-duration').textContent).toContain('Total:')
    expect(screen.getByText(/2 tasks/)).toBeTruthy()
  })

  it('shows singular task count for exactly 1 task', async () => {
    stubWithTasks([projTask1])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('proj-task-pt1'))
    expect(screen.getByText('1 task')).toBeTruthy()
  })

  it('clicking sort headers changes sort key and toggles direction', async () => {
    stubWithTasks()
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('project-task-list'))
    // click description — changes key
    fireEvent.click(screen.getByTestId('proj-sort-description'))
    // click description again — toggles direction
    fireEvent.click(screen.getByTestId('proj-sort-description'))
    // click other headers to exercise remaining sort branches
    fireEvent.click(screen.getByTestId('proj-sort-start'))
    fireEvent.click(screen.getByTestId('proj-sort-end'))
    fireEvent.click(screen.getByTestId('proj-sort-duration'))
    expect(screen.getByTestId('project-task-list')).toBeTruthy()
  })

  it('shows project description when set', async () => {
    const projectWithDesc = { ...project, description: 'My project description' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks'))
          return Promise.resolve({ ok: true, status: 200, json: async () => [] })
        if (url.includes('/projects/'))
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ ...projectWithDesc, totalSeconds: 0 }) })
        return Promise.resolve({ ok: true, status: 200, json: async () => [projectWithDesc] })
      }),
    )
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => expect(screen.getByText('My project description')).toBeTruthy())
  })

  it('shows date range filter and clear button, then clears on click', async () => {
    mockFetch([project])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    // set a from date
    fireEvent.change(screen.getByTestId('date-from'), { target: { value: '2026-06-01' } })
    // clear button should appear
    await waitFor(() => expect(screen.getByTestId('clear-date-range')).toBeTruthy())
    // click clear
    fireEvent.click(screen.getByTestId('clear-date-range'))
    expect(screen.queryByTestId('clear-date-range')).toBeNull()
  })

  it('shows filtered label in task count when date range is set', async () => {
    stubWithTasks([projTask1])
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('proj-task-pt1'))
    fireEvent.change(screen.getByTestId('date-from'), { target: { value: '2026-06-01' } })
    await waitFor(() => expect(screen.getByText(/(filtered)/)).toBeTruthy())
  })

  it('shows user filter dropdown when project is shared (has members)', async () => {
    const sharedProject = { ...project, ownerUserId: 'u-alice' }
    const bobMember = { userId: 'u2', username: 'bob', role: 'MEMBER', inherited: false }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/members'))
          return Promise.resolve({ ok: true, status: 200, json: async () => [bobMember] })
        if (url.includes('/tasks'))
          return Promise.resolve({ ok: true, status: 200, json: async () => [projTask1] })
        if (url.includes('/projects/'))
          return Promise.resolve({
            ok: true, status: 200,
            json: async () => ({ ...sharedProject, totalSeconds: 3600, userBreakdown: [] }),
          })
        return Promise.resolve({ ok: true, status: 200, json: async () => [sharedProject] })
      }),
    )

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => expect(screen.getByTestId('user-filter-select')).toBeTruthy())
    const select = screen.getByTestId('user-filter-select') as HTMLSelectElement
    expect(select.value).toBe('')
    const options = Array.from(select.options).map((o) => o.text)
    expect(options).toContain('alice')  // from ownerUserId+ownerUsername
    expect(options).toContain('bob')   // from members
  })

  it('user filter not shown when only one user has tasks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/members'))
          return Promise.resolve({ ok: true, status: 200, json: async () => [] })
        if (url.includes('/tasks'))
          return Promise.resolve({ ok: true, status: 200, json: async () => [projTask1] })
        if (url.includes('/projects/'))
          return Promise.resolve({
            ok: true, status: 200,
            json: async () => ({ ...project, totalSeconds: 3600, userBreakdown: [{ userId: 'u1', username: 'alice', seconds: 3600 }] }),
          })
        return Promise.resolve({ ok: true, status: 200, json: async () => [project] })
      }),
    )

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('project-task-list'))
    expect(screen.queryByTestId('user-filter-select')).toBeNull()
  })

  it('selecting a user in filter passes userId to tasks query', async () => {
    const sharedProject = { ...project, ownerUserId: 'u-alice' }
    const bobMember = { userId: 'u2', username: 'bob', role: 'MEMBER', inherited: false }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/members'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [bobMember] })
      if (url.includes('/tasks'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [projTask1] })
      if (url.includes('/projects/'))
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => ({ ...sharedProject, totalSeconds: 3600, userBreakdown: [] }),
        })
      return Promise.resolve({ ok: true, status: 200, json: async () => [sharedProject] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('user-filter-select'))
    fireEvent.change(screen.getByTestId('user-filter-select'), { target: { value: 'u2' } })

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('userId=u2'),
        expect.any(Object),
      ),
    )
  })

  it('export-csv-button is visible when project is selected', async () => {
    stubWithTasks()
    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => expect(screen.getByTestId('export-csv-button')).toBeTruthy())
  })

  it('export-csv-button triggers fetch to export endpoint', async () => {
    const csvBlob = new Blob(['username,project_path\nalice,Work\n'], { type: 'text/csv' })
    const createObjectURL = vi.fn().mockReturnValue('blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/export'))
        return Promise.resolve({ ok: true, status: 200, blob: async () => csvBlob })
      if (url.includes('/members'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [] })
      if (url.includes('/tasks'))
        return Promise.resolve({ ok: true, status: 200, json: async () => [projTask1] })
      if (url.includes('/projects/'))
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ...project, totalSeconds: 3600 }) })
      return Promise.resolve({ ok: true, status: 200, json: async () => [project] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { renderPage } = setup()
    renderPage()
    await waitFor(() => screen.getByTestId('project-node-1'))
    fireEvent.click(screen.getByTestId('project-node-1'))
    await waitFor(() => screen.getByTestId('export-csv-button'))
    fireEvent.click(screen.getByTestId('export-csv-button'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.any(Object),
      ),
    )
  })
})
