import type { TagResponse } from '../types/tag'

interface TagPickerProps {
  tags: TagResponse[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function TagPicker({ tags, selected, onChange }: TagPickerProps) {
  if (tags.length === 0) return null

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-700">Tags</legend>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const active = selected.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              data-testid={`tag-chip-${tag.id}`}
              onClick={() => toggle(tag.id)}
              aria-pressed={active}
              className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
              style={{
                backgroundColor: active ? tag.color : 'transparent',
                borderColor: tag.color,
                color: active ? '#fff' : tag.color,
              }}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
