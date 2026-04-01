// Toast notification setup — dark theme

import { Toaster, toast } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#27272a',
          color: '#f4f4f5',
          border: '1px solid #3f3f46',
          borderRadius: '8px',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: '#fff', secondary: '#27272a' },
        },
        error: {
          iconTheme: { primary: '#f87171', secondary: '#27272a' },
        },
      }}
    />
  )
}

// Show a success toast notification
export function showSuccess(message) {
  toast.success(message)
}

// Show an error toast notification
export function showError(message) {
  toast.error(message)
}
