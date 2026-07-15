import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import QRCode from 'qrcode'
import { Lock, ShieldAlert, Eye, EyeOff, Download } from 'lucide-react'
import { setAdminToken } from './lib.js'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 30000 // 30 seconds

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('Incorrect password')
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const lockTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (locked || loading) return

    if (attempts >= MAX_ATTEMPTS) {
      setLocked(true)
      setError(true)
      setErrorMsg(`Too many attempts. Try again in ${LOCKOUT_DURATION / 1000} seconds.`)
      lockTimer.current = setTimeout(() => {
        setLocked(false)
        setAttempts(0)
        setError(false)
        setErrorMsg('Incorrect password')
      }, LOCKOUT_DURATION)
      return
    }

    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        setAdminToken(password)
        onLogin()
      } else {
        const remaining = MAX_ATTEMPTS - attempts - 1
        setAttempts((prev) => prev + 1)
        setError(true)
        setErrorMsg(
          remaining > 0
            ? `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Incorrect password. No attempts remaining.'
        )
      }
    } catch {
      setError(true)
      setErrorMsg('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-page to-primary-wash/40 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <Lock size={40} className="text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-primary">Admin Access</h1>
          <p className="text-secondary text-sm mt-1">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false) }}
              placeholder="Password"
              className="w-full px-4 py-3 pr-12 rounded-lg border border-border focus:border-primary focus:outline-none text-center text-lg"
              autoFocus
              disabled={locked || loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-secondary transition rounded-lg"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm mb-4 justify-center" role="alert">
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={locked || loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Enter Admin Panel'}
          </button>
        </form>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-primary hover:underline">
            ← Back to Portal
          </a>
        </div>

        {/* QR Code quick access */}
        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-xs text-muted text-center mb-3">Scan untuk akses cepat</p>
          <div className="grid grid-cols-2 gap-3">
            <LoginQRCard
              id="portal"
              label="Document Portal"
              sub="Open portal"
              url={typeof window !== 'undefined' ? window.location.origin : ''}
            />
            <LoginQRCard
              id="admin"
              label="Admin Panel"
              sub="Admin login page"
              url={typeof window !== 'undefined' ? window.location.origin + '/admin' : ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginQRCard({ label, sub, url }) {
  const downloadQR = async (quality) => {
    const canvas = document.createElement('canvas')
    const size = quality === 'high' ? 2400 : 600
    canvas.width = size
    canvas.height = size
    try {
      await QRCode.toCanvas(canvas, url, {
        width: size,
        margin: quality === 'high' ? 4 : 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' },
      })
      const link = document.createElement('a')
      const suffix = quality === 'high' ? 'high' : 'standard'
      link.download = `${label.toLowerCase().replace(/\s+/g, '-')}-qr-${suffix}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('QR download failed:', err)
    }
  }

  return (
    <div className="bg-surface-hover rounded-xl p-3 border border-border flex flex-col items-center text-center">
      <QRCodeSVG value={url} size={56} level="H" fgColor="#000000" bgColor="#ffffff" />
      <p className="text-xs font-semibold text-primary mt-2">{label}</p>
      <p className="text-[10px] text-muted">{sub}</p>
      <button
        onClick={() => downloadQR('standard')}
        className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary-hover transition"
        title="Download QR"
        aria-label={`Download QR ${label}`}
      >
        <Download size={10} /> Download QR
      </button>
    </div>
  )
}
