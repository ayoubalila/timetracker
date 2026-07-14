import { useState } from 'react'
import type { ProjectResponse } from '../types/project'
import { ChevronRightIcon, FolderIcon } from './icons'
import { ProgressBar } from './ProgressBar'

interface ProjectTreeProps {
  projects: ProjectResponse[]
  onSelect?: (project: ProjectResponse) => void
  selectedId?: string | null
}

interface ProjectNodeProps {
  project: ProjectResponse
  children: ProjectResponse[]
  allProjects: ProjectResponse[]
  onSelect?: (project: ProjectResponse) => void
  selectedId?: string | null
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function ProjectNode({ project, children, allProjects, onSelect, selectedId }: ProjectNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = children.length > 0
  const selected = selectedId === project.id

  return (
    <li>
      <div
        className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
          selected ? 'bg-blue-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label={expanded ? 'collapse' : 'expand'}
          >
            <ChevronRightIcon className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => onSelect?.(project)}
          data-testid={`project-node-${project.id}`}
        >
          <span className="flex items-center gap-1.5">
            {hasChildren ? (
              <FolderIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
            )}
            {project.color && (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
            )}
            <span className="truncate text-sm">{project.name}</span>
            <span className="ml-auto shrink-0 pl-2 text-xs tabular-nums text-slate-400">
              {formatDuration(project.totalSeconds)}
            </span>
          </span>
          {project.budgetPercent != null && (
            <span className="mt-1 block">
              <ProgressBar percent={project.budgetPercent} size="sm" testId={`budget-bar-${project.id}`} />
            </span>
          )}
        </span>
      </div>
      {hasChildren && expanded && (
        <ul className="ml-3 space-y-0.5 border-l border-slate-200 pl-3">
          {children.map((child) => (
            <ProjectNode
              key={child.id}
              project={child}
              children={allProjects.filter((p) => p.parentId === child.id)}
              allProjects={allProjects}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function ProjectTree({ projects, onSelect, selectedId }: ProjectTreeProps) {
  const roots = projects.filter((p) => p.parentId === null)

  if (projects.length === 0) {
    return <p className="px-2 text-sm text-slate-400">No projects yet.</p>
  }

  return (
    <ul className="space-y-0.5" data-testid="project-tree">
      {roots.map((project) => (
        <ProjectNode
          key={project.id}
          project={project}
          children={projects.filter((p) => p.parentId === project.id)}
          allProjects={projects}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </ul>
  )
}
