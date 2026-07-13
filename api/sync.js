import { getAuth, getToken, handleGet, handleUpload, handleDelete, handleUpdate, handleReorder } from '../lib/sheets.js'

// Whitelist of allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://sop-portal-nine.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

function isOriginAllowed(origin) {
  if (!origin) return false
  // Allow all Vercel preview deployments (*.vercel.app)
  if (origin.endsWith('.vercel.app')) return true
  return ALLOWED_ORIGINS.includes(origin)
}

function json(res, status, data) {
  res.status(status).json(data)
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) }
      catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

function isAdmin(req) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return false
  return auth.slice(7) === process.env.ADMIN_PASSWORD
}

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────
  const origin = req.headers.origin
  if (origin) {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    // If origin not allowed, don't set CORS header (browser blocks it)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const auth = getAuth()
    const token = await getToken(auth)

    // ── GET: public read (data is already public via Drive) ──
    if (req.method === 'GET') {
      const result = await handleGet(token)
      json(res, 200, result)
      return
    }

    // ── POST: mutations require admin auth ─────────────────
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' })
      return
    }

    if (!isAdmin(req)) {
      json(res, 401, { success: false, error: 'Unauthorized' })
      return
    }

    const body = await parseBody(req)
    const { action } = body

    let result
    switch (action) {
      case 'upload':
        result = await handleUpload(token, body)
        break
      case 'delete':
        result = await handleDelete(token, body)
        break
      case 'update':
        result = await handleUpdate(token, body)
        break
      case 'reorder':
        result = await handleReorder(token, body)
        break
      default:
        json(res, 400, { error: 'Unknown action: ' + action })
        return
    }

    json(res, 200, result)
  } catch (err) {
    console.error('Sync error:', err)
    json(res, 500, { success: false, error: 'Internal server error' })
  }
}
