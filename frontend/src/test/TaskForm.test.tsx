import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskForm } from '../components/TaskForm'
import type { TaskResponse } from '../types/task'
import type { ProjectResponse } from '../types/project'

const mockProjects: ProjectResponse[] = [
  { id: 'p1', name: 'Work', description: null, color: null, parentId: null, createdAt: '2026-01-01T00:00:00Z', totalSeconds: 0 },
  { id: 'p2', name: 'Personal', description: null, color: null, parentId: null, createdAt: '2026-01-01T00:00:00Z', totalSeconds: 0 },
]

const mockTask: TaskResponse = {
  id: 't1',
  description: 'Existing task',
  startTime: '2026-06-29T09:00:00Z',
  endTime: '2026-06-29T10:00:00Z',
  projectIds: ['p1'],
  createdAt: '2026-06-29T09:00:00Z',
  updatedAt: '2026-06-29T10:00:00Z',
}

describe('TaskForm', () => {
  it('renders create form when task is null', () => {
    render(
      <TaskForm task={null} projects={[]} onSave={vi.fn()} onCancel={vi.fn()} error={null} isPending={false} />,
    )
    expect(screen.getByText('Add Task')).toBeTruthy()
  })

  it('renders edit form when task is provided', () => {
    render(
      <TaskForm task={mockTask} projects={[]} onSave={vi.fn()} onCancel={vi.fn()} error={null} isPending={false} />,
    )
    expect(screen.getByText('Edit Task')).toBeTruthy()
    expect((screen.getByTestId('task-description') as HTMLInputElement).value).toBe('Existing task')
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(
      <TaskForm task={null} projects={[]} onSave={vi.fn()} onCancel={onCancel} error={null} isPending={false} />,
    )
    fireEvent.click(screen.getByTestId('task-form-cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onSave with form data on submit', () => {
    const onSave = vi.fn()
    render(
      <TaskForm task={null} projects={[]} onSave={onSave} onCancel={vi.fn()} error={null} isPending={false} />,
    )
    fireEvent.change(screen.getByTestId('task-description'), { target: { value: 'My task' } })
    fireEvent.submit(screen.getByTestId('task-form'))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0][0].description).toBe('My task')
  })

  it('shows error message when error prop is set', () => {
    render(
      <TaskForm task={null} projects={[]} onSave={vi.fn()} onCancel={vi.fn()} error="Something went wrong" isPending={false} />,
    )
    expect(screen.getByTestId('form-error').textContent).toBe('Something went wrong')
  })

  it('disables Save button when isPending', () => {
    render(
      <TaskForm task={null} projects={[]} onSave={vi.fn()} onCancel={vi.fn()} error={null} isPending={true} />,
    )
    expect((screen.getByTestId('task-form-save') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders project checkboxes and toggles selection', () => {
    render(
      <TaskForm task={null} projects={mockProjects} onSave={vi.fn()} onCancel={vi.fn()} error={null} isPending={false} />,
    )
    const checkbox = screen.getByTestId('project-checkbox-p1') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
  })

  it('pre-checks projects from existing task', () => {
    render(
      <TaskForm task={mockTask} projects={mockProjects} onSave={vi.fn()} onCancel={vi.fn()} error={null} isPending={false} />,
    )
    expect((screen.getByTestId('project-checkbox-p1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('project-checkbox-p2') as HTMLInputElement).checked).toBe(false)
  })

  it('calls onCancel when overlay is clicked', () => {
    const onCancel = vi.fn()
    render(
      <TaskForm task={null} projects={[]} onSave={vi.fn()} onCancel={onCancel} error={null} isPending={false} />,
    )
    fireEvent.click(screen.getByTestId('task-form-overlay'))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
