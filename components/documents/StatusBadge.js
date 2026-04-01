// StatusBadge — processing status pill, dark theme

export default function StatusBadge({ status }) {
  const statusConfig = {
    PENDING:    { label: 'Pending',    className: 'bg-zinc-800 text-zinc-400' },
    PROCESSING: { label: 'Processing', className: 'bg-yellow-950 text-yellow-400' },
    READY:      { label: 'Ready',      className: 'bg-green-950 text-green-400' },
    FAILED:     { label: 'Failed',     className: 'bg-red-950 text-red-400' },
  }

  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
