// Root layout — wraps every page in the app
// Sets up global metadata and the toast notification provider

import './globals.css'
import { ToastProvider } from '../components/ui/Toast'

export const metadata = {
  title: 'DocIntel — Document Intelligence Platform',
  description: 'Upload, analyze, and chat with your documents using AI',
}

// Root layout wraps all pages with the Toaster so toasts work everywhere
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Toast notifications — rendered at root so they appear above everything */}
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}
