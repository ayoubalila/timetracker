import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectTree } from '../components/ProjectTree'
import type { ProjectResponse } from '../types/project'

const root: ProjectResponse = {
  id: '1',
  name: 'Work',
  description: null,
  color: null,
  parentId: null,
  createdAt: '2026-06-24T00:00:00Z',
}

const child: ProjectResponse = {
  id: '2',
  name: 'Sub',
  description: null,
  color: '#ff0000',
  parentId: '1',
  createdAt: '2026-06-24T00:00:00Z',
}

describe('ProjectTree', () => {
  it('shows empty message when no projects', () => {
    render(<ProjectTree projects={[]} />)
    expect(screen.getByText('No projects yet.')).toBeTruthy()
  })

  it('renders root projects', () => {
    render(<ProjectTree projects={[root]} />)
    expect(screen.getByTestId('project-node-1')).toBeTruthy()
    expect(screen.getByText('Work')).toBeTruthy()
  })

  it('renders nested children', () => {
    render(<ProjectTree projects={[root, child]} />)
    expect(screen.getByTestId('project-node-1')).toBeTruthy()
    expect(screen.getByTestId('project-node-2')).toBeTruthy()
  })

  it('calls onSelect when project is clicked', () => {
    const onSelect = vi.fn()
    render(<ProjectTree projects={[root]} onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('project-node-1'))
    expect(onSelect).toHaveBeenCalledWith(root)
  })

  it('highlights the selected project', () => {
    render(<ProjectTree projects={[root]} selectedId="1" />)
    const node = screen.getByTestId('project-node-1').closest('div')
    expect(node?.className).toContain('bg-blue-100')
  })

  it('collapses and expands children on button click', () => {
    render(<ProjectTree projects={[root, child]} />)
    const collapseBtn = screen.getByLabelText('collapse')
    fireEvent.click(collapseBtn)
    expect(screen.queryByTestId('project-node-2')).toBeNull()
    fireEvent.click(screen.getByLabelText('expand'))
    expect(screen.getByTestId('project-node-2')).toBeTruthy()
  })

  it('renders color dot when color is set', () => {
    render(<ProjectTree projects={[root, child]} />)
    const spans = document.querySelectorAll('[style*="background-color"]')
    expect(spans.length).toBeGreaterThan(0)
  })
})
