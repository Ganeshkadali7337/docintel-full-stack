// Spinner component — CSS-based loading indicator, dark theme

export default function Spinner({ size = 'md' }) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div
      className={`${sizeMap[size] || sizeMap.md} animate-spin rounded-full border-2 border-zinc-700 border-t-white`}
      role="status"
      aria-label="Loading"
    />
  )
}
