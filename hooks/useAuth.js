// useAuth hook — provides auth functions (login, register, logout, getMe)
// Used in auth forms and the Navbar

import axios from 'axios'

// Return auth helper functions for use in components
export function useAuth() {
  // Log in with email and password — returns user data or throws an error
  async function login(email, password) {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      return response.data
    } catch (error) {
      // Extract the error message from the API response
      const message = error.response?.data?.error || 'Login failed'
      throw new Error(message)
    }
  }

  // Register a new account — returns user data or throws an error
  async function register(name, email, password) {
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed'
      throw new Error(message)
    }
  }

  // Log out the current user — clears cookie and redirects to login
  async function logout() {
    try {
      await axios.post('/api/auth/logout')
    } catch (error) {
      // Proceed with redirect even if the API call fails
    }
    window.location.href = '/login'
  }

  // Fetch the currently logged-in user's profile — returns user or null
  async function getMe() {
    try {
      const response = await axios.get('/api/auth/me')
      return response.data?.data?.user || null
    } catch (error) {
      return null
    }
  }

  return { login, register, logout, getMe }
}
