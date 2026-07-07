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
    <fieldset className="mb-3">
      <legend className="text-sm font-medium text-gray-700 mb-1">Tags</legend>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => {
          const active = selected.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              data-testid={`tag-chip-${tag.id}`}
              onClick={() => toggle(tag.id)}
              className="px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity"
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
