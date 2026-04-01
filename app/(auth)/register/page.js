// Register page — dark centered card

import RegisterForm from '../../../components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-white text-center mb-1">DocIntel</h1>
        <p className="text-sm text-zinc-500 text-center mb-8">Create a new account</p>
        <RegisterForm />
      </div>
    </div>
  )
}
