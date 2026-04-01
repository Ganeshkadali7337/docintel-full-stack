// RegisterForm component — new user registration form, dark theme

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

export default function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required')
      return
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await register(name, email, password)
      // Full page reload so the server layout re-reads the new auth cookie
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Name"
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        disabled={isLoading}
      />
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
        placeholder="Min 8 characters"
        disabled={isLoading}
      />
      <Input
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Repeat your password"
        disabled={isLoading}
      />

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <Button type="submit" loading={isLoading} disabled={isLoading}>
        Create Account
      </Button>

      <p className="text-sm text-center text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="text-zinc-200 font-medium hover:text-white underline">
          Log in
        </Link>
      </p>
    </form>
  )
}
