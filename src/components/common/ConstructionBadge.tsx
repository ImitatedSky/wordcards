type Props = { className?: string }

export function ConstructionBadge({ className = '' }: Props) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium ' +
        className
      }
    >
      🚧 施工中
    </span>
  )
}
