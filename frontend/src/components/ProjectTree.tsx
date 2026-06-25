import { useState } from 'react'
import type { ProjectResponse } from '../types/project'

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
  depth: number
}

function ProjectNode({ project, children, allProjects, onSelect, selectedId, depth }: ProjectNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = children.length > 0

  return (
    <li>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${selectedId === project.id ? 'bg-blue-100 font-medium' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-4 h-4 text-gray-500 flex-shrink-0"
            aria-label={expanded ? 'collapse' : 'expand'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}
        <span
          className="truncate flex-1"
          onClick={() => onSelect?.(project)}
          data-testid={`project-node-${project.id}`}
        >
          {project.color && (
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: project.color }}
            />
          )}
          {project.name}
        </span>
      </div>
      {hasChildren && expanded && (
        <ul>
          {children.map((child) => (
            <ProjectNode
              key={child.id}
              project={child}
              children={allProjects.filter((p) => p.parentId === child.id)}
              allProjects={allProjects}
              onSelect={onSelect}
              selectedId={selectedId}
              depth={depth + 1}
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
    return <p className="text-gray-500 text-sm px-2">No projects yet.</p>
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
          depth={0}
        />
      ))}
    </ul>
  )
}
