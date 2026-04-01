// Reusable Input component with label and error message — dark theme

export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-sm rounded-md
          bg-zinc-800 text-white placeholder-zinc-500
          border focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent
          disabled:opacity-40 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-zinc-700'}
        `}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
