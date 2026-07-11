import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getAuth, getToken, handleGet, handleUpload, handleDelete, handleUpdate, handleReorder } from './lib/sheets.js'

const DEV_PASSWORD = 'admin123'

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

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = status
  res.end(JSON.stringify(data))
}

export default defineConfig({
  plugins: [
    react(),
    // Local dev auth — mirrors api/auth.js behavior without Vercel runtime
    {
      name: 'local-auth',
      configureServer(server) {
        server.middlewares.use('/api/auth', (req, res) => {
          if (req.method !== 'POST') {
            json(res, 405, { error: 'Method not allowed' })
            return
          }
          let body = ''
          req.on('data', c => body += c)
          req.on('end', () => {
            try {
              const { password } = JSON.parse(body)
              if (password === DEV_PASSWORD) {
                json(res, 200, { success: true })
              } else {
                json(res, 401, { success: false })
              }
            } catch {
              json(res, 400, { error: 'Invalid request body' })
            }
          })
        })
      },
    },
    // Local dev sync — mirrors api/sync.js behavior without Vercel runtime
    {
      name: 'local-sync',
      configureServer(server) {
        server.middlewares.use('/api/sync', async (req, res) => {
          try {
            const auth = getAuth()
            const token = await getToken(auth)

            if (req.method === 'GET') {
              const result = await handleGet(token)
              json(res, 200, result)
              return
            }

            if (req.method !== 'POST') {
              json(res, 405, { error: 'Method not allowed' })
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
            json(res, 500, { success: false, error: err.message || 'Internal server error' })
          }
        })
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
