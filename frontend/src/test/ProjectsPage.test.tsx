import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectsPage } from '../pages/ProjectsPage'
import type { ProjectResponse } from '../types/project'

const project: ProjectResponse = {
  id: '1',
  name: 'Work',
  description: null,
  color: null,
  parentId: null,
  createdAt: '2026-06-24T00:00:00Z',
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
          <ProjectsPage username="alice" onLogout={vi.fn()} />
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
        <ProjectsPage username="alice" onLogout={onLogout} />
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
})
