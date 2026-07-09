import { useState } from 'react'
import { Lock, ShieldAlert } from 'lucide-react'

const ADMIN_PASSWORD = 'admin123'

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      onLogin()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <Lock size={40} className="text-indigo-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">Admin Access</h1>
          <p className="text-gray-600 text-sm mt-1">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-none mb-4 text-center text-lg"
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4 justify-center">
              <ShieldAlert size={16} />
              <span>Incorrect password</span>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition"
          >
            Enter Admin Panel
          </button>
        </form>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-indigo-600 hover:underline">
            ← Back to Portal
          </a>
        </div>
      </div>
    </div>
  )
}
