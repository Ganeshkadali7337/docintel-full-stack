// SearchFilter — filename search and status dropdown, dark theme

'use client'

export default function SearchFilter({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <input
        type="text"
        placeholder="Search by filename..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full px-3 py-1.5 text-xs bg-zinc-800 text-zinc-200 placeholder-zinc-600 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-white"
      />

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="w-full px-3 py-1.5 text-xs bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-white"
      >
        <option value="ALL">All</option>
        <option value="READY">Ready</option>
        <option value="PROCESSING">Processing</option>
        <option value="FAILED">Failed</option>
        <option value="PENDING">Pending</option>
      </select>
    </div>
  )
}
