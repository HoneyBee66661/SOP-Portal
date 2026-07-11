/**
 * Vercel Edge Function — Admin password verification.
 *
 * The actual password is stored as the Vercel environment variable
 * ADMIN_PASSWORD, NEVER in client-side code.
 *
 * Rate-limiting hint: clients should limit attempts before calling
 * this endpoint (see AdminLogin.jsx for the client-side gate).
 */

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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
