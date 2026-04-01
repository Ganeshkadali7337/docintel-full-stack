// Modal component — centered dialog with dark backdrop

'use client'

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      onClick={onClose}
    >
      <div
        className="bg-[#18181b] border border-zinc-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xl font-bold leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  )
}
