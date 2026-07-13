/**
 * Vercel Edge Function — Admin password verification.
 *
 * The actual password is stored as the Vercel environment variable
 * ADMIN_PASSWORD, NEVER in client-side code.
 *
 * Rate limiting: tracks attempts by IP using an in-memory Map.
 * Note: on Vercel Edge, this is per-region. For production,
 * consider using Upstash Redis or Vercel KV for distributed rate limiting.
 */

export const config = { runtime: 'edge' }

// In-memory rate limit store (per region on Edge)
const rateLimitStore = new Map()

const RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 60000,     // 1 minute window
  lockoutMs: 300000,   // 5 minute lockout after exceeding
}

function getRateLimitInfo(ip) {
  const now = Date.now()
  let entry = rateLimitStore.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT.windowMs) {
    entry = { count: 0, windowStart: now, lockedUntil: 0 }
    rateLimitStore.set(ip, entry)
  }

  // Clean up old entries every 100 requests (prevents memory leak)
  if (rateLimitStore.size > 10000) {
    const cutoff = now - RATE_LIMIT.windowMs
    for (const [key, val] of rateLimitStore) {
      if (now - val.windowStart > cutoff) rateLimitStore.delete(key)
    }
  }

  return entry
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Rate limiting ────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'

  const rateInfo = getRateLimitInfo(ip)

  if (Date.now() < rateInfo.lockedUntil) {
    const remaining = Math.ceil((rateInfo.lockedUntil - Date.now()) / 1000)
    return new Response(JSON.stringify({
      success: false,
      error: `Too many attempts. Locked for ${remaining} seconds.`,
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (rateInfo.count >= RATE_LIMIT.maxAttempts) {
    rateInfo.lockedUntil = Date.now() + RATE_LIMIT.lockoutMs
    return new Response(JSON.stringify({
      success: false,
      error: `Too many attempts. Locked for ${RATE_LIMIT.lockoutMs / 1000} seconds.`,
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { password } = await req.json()

    if (!password) {
      return new Response(JSON.stringify({ success: false, error: 'Password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    rateInfo.count++

    if (password === process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
