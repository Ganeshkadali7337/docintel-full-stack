// LoginForm component — email/password login form, dark theme

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      // Full page reload so the server layout re-reads the new auth cookie
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isLoading}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        disabled={isLoading}
      />

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <Button type="submit" loading={isLoading} disabled={isLoading}>
        Log in
      </Button>

      <p className="text-sm text-center text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-zinc-200 font-medium hover:text-white underline">
          Register
        </Link>
      </p>
    </form>
  )
}
