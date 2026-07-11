import { getAuth, getToken, handleGet, handleUpload, handleDelete, handleUpdate, handleReorder } from '../lib/sheets.js'

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

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
}
