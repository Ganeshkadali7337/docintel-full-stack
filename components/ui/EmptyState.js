// EmptyState component — shown when a list or area has no content — dark theme

import Button from './Button'

export default function EmptyState({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Placeholder icon */}
      <div className="w-12 h-12 mb-4 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center">
        <span className="text-zinc-600 text-xl">—</span>
      </div>

      <h3 className="text-sm font-semibold text-zinc-200 mb-1">{title}</h3>

      {subtitle && (
        <p className="text-sm text-zinc-500 mb-4 max-w-xs">{subtitle}</p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
