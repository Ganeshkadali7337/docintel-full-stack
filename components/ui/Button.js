// Reusable Button component with loading state and style variants — dark theme

import Spinner from './Spinner'

export default function Button({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  variant = 'primary',
}) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed'

  const variantStyles = {
    primary:  'bg-white text-zinc-900 hover:bg-zinc-200 focus:ring-white',
    secondary: 'bg-transparent text-zinc-300 border border-zinc-700 hover:bg-zinc-800 focus:ring-zinc-600',
    danger:   'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
