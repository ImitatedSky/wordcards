import type { Tag } from '@/types/tag'

type Props = {
  tag: Tag
  onRemove?: (id: string) => void
  className?: string
}

export function TagChip({ tag, onRemove, className = '' }: Props) {
  const color = tag.color ?? '#e2e8f0'
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-slate-800 ' +
        className
      }
      style={{ backgroundColor: color }}
    >
      {tag.icon && <span aria-hidden="true">{tag.icon}</span>}
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`移除 ${tag.name}`}
          onClick={() => onRemove(tag.id)}
          className="ml-0.5 text-slate-600 hover:text-slate-900"
        >
          ×
        </button>
      )}
    </span>
  )
}
