import { JWT } from 'google-auth-library'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const SHEET_ID = process.env.SHEET_ID || '1c_qGvb1jpfL5SZFeuRxKsQO4ddyPJlSFObsyFG4wItc'
const SHEET_NAME = process.env.SHEET_NAME || 'Sheet DB'
const UPLOAD_FOLDER_ID = process.env.UPLOAD_FOLDER_ID || '1bYE7lE42KZTQ2Ki5jYghdu2Njx-2Nnug'

export { SHEET_ID, SHEET_NAME, UPLOAD_FOLDER_ID }

function getCredentials() {
  // Prefer environment variables (used on Vercel / .env)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  }

  // Fallback: read the service account JSON key file (local dev)
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const keyPath = resolve(__dirname, '..', 'api', 'google-api.json')
  if (existsSync(keyPath)) {
    const { client_email, private_key } = JSON.parse(readFileSync(keyPath, 'utf-8'))
    return { email: client_email, key: private_key }
  }

  throw new Error(
    'Google credentials not found. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY ' +
    'env vars, or place the service account JSON key at api/google-api.json'
  )
}

export function getAuth() {
  const { email, key } = getCredentials()
  return new JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  })
}

export async function getToken(auth) {
  const { token } = await auth.getAccessToken()
  return token
}

export function extractFileId(input) {
  if (!input) return input
  const match = String(input).match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input
}

// ── Sheets ──────────────────────────────────────────────────────

export async function getSheetRows(token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:E`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`)
  const data = await res.json()
  return data.values || []
}

export async function saveSheetRows(token, rows) {
  const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:E:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  if (!clearRes.ok) {
    const text = await clearRes.text()
    throw new Error(`Sheets clear failed (${clearRes.status}): ${text}`)
  }

  const range = `${SHEET_NAME}!A1:E${rows.length}`
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets write failed (${res.status}): ${text}`)
  }
}

export function rowsToSops(rows) {
  if (rows.length < 2) return []
  const items = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const id = parseInt(row[0], 10)
    if (isNaN(id)) continue
    items.push({
      id,
      title: row[1] || '',
      category: row[2] || '',
      gdrivePath: row[3] || '',
      description: row[4] || '',
    })
  }
  return items
}

// ── Drive ───────────────────────────────────────────────────────

export async function driveUpload(token, base64Data, fileName, folderId) {
  const buffer = Buffer.from(base64Data, 'base64')
  const boundary = 'drive_' + Date.now().toString(36)
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] })

  const parts = [
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(`${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Type: application/pdf\r\n\r\n'),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]

  const body = Buffer.concat(parts)

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Drive upload failed (${res.status}): ${errText}`)
  }
  const { id } = await res.json()
  return id
}

export async function driveTrash(token, fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`Drive trash failed (${res.status}): ${text}`)
  }
}

// ── Drive listing + sync ───────────────────────────────────────────

export async function listDriveFolder(token, folderId) {
  const allFiles = []
  let pageToken = null
  do {
    let url = `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(folderId)}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`
    if (pageToken) url += `&pageToken=${pageToken}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Drive list failed (${res.status})`)
    const data = await res.json()
    allFiles.push(...(data.files || []))
    pageToken = data.nextPageToken || null
  } while (pageToken)
  return allFiles
}

let lastSyncTime = 0
const SYNC_COOLDOWN = 30_000 // 30 sec between syncs

/**
 * Sync Drive folder → Sheet (additive only).
 * - Adds rows for new files found in Drive
 * - Fills empty titles from filename
 * - NEVER removes rows (prevents data loss from transient Drive errors)
 */
export async function syncFromDrive(token) {
  const [driveFiles, rows] = await Promise.all([
    listDriveFolder(token, UPLOAD_FOLDER_ID),
    getSheetRows(token),
  ])

  const header = rows.length > 0 ? rows[0] : ['id', 'title', 'category', 'gdrivePath', 'description']
  let dataRows = rows.length > 1 ? rows.slice(1) : []

  const fileIdToRow = {}
  for (const row of dataRows) {
    if (row[3]) fileIdToRow[row[3]] = row
  }

  let maxId = dataRows.length > 0
    ? Math.max(...dataRows.map(r => parseInt(r[0], 10) || 0))
    : 0

  let changed = false

  for (const f of driveFiles) {
    const existing = fileIdToRow[f.id]
    if (existing) {
      // Fill empty title from filename
      if (!existing[1]) {
        existing[1] = f.name.replace(/\.pdf$/i, '')
        changed = true
      }
    } else {
      maxId++
      dataRows.push([String(maxId), f.name.replace(/\.pdf$/i, ''), '', f.id, ''])
      changed = true
    }
  }

  if (changed) {
    dataRows.forEach((row, i) => { row[0] = String(i + 1) })
    await saveSheetRows(token, [header, ...dataRows])
  }
}

// ── Handlers ────────────────────────────────────────────────────

export async function handleGet(token) {
  // Sync Drive → Sheet periodically so Drive is source of truth
  const now = Date.now()
  if (now - lastSyncTime > SYNC_COOLDOWN) {
    try { await syncFromDrive(token) } catch (e) {
      console.error('Sync from Drive failed, returning sheet data as-is:', e.message)
    }
    lastSyncTime = now
  }

  const rows = await getSheetRows(token)
  const sops = rowsToSops(rows)

  // Fetch Drive file metadata (modifiedTime) for each SOP
  const fetchPromises = sops.map(async (sop) => {
    const fileId = sop.gdrivePath
    if (!fileId) return { ...sop, updatedAt: null }
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=modifiedTime&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const meta = await res.json()
        return { ...sop, updatedAt: meta.modifiedTime || null }
      }
      return { ...sop, updatedAt: null }
    } catch {
      return { ...sop, updatedAt: null }
    }
  })

  const data = await Promise.all(fetchPromises)
  return { success: true, data }
}

export async function handleUpload(token, params) {
  const { fileName, fileData: base64 } = params
  if (!fileName || !base64) throw new Error('Missing fileName or fileData')
  if (!fileName.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files allowed')

  const fileId = await driveUpload(token, base64, fileName, UPLOAD_FOLDER_ID)

  const rows = await getSheetRows(token)
  const maxId = rows.length > 1
    ? Math.max(...rows.slice(1).map(r => parseInt(r[0], 10) || 0))
    : 0
  const title = fileName.replace(/\.pdf$/i, '')
  rows.push([String(maxId + 1), title, '', fileId, ''])
  await saveSheetRows(token, rows)

  return { success: true, fileId, fileName }
}

export async function handleDelete(token, params) {
  const { fileId: rawFileId, rowId } = params
  const bareFileId = extractFileId(rawFileId)
  if (!bareFileId) throw new Error('Missing fileId')
  if (rowId === undefined || rowId === null) throw new Error('Missing rowId')

  const numRowId = Number(rowId)
  const rows = await getSheetRows(token)

  let deleteIdx = -1
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0], 10) === numRowId) {
      deleteIdx = i
      break
    }
  }
  if (deleteIdx === -1) throw new Error('Row not found for id: ' + rowId)

  rows.splice(deleteIdx, 1)
  for (let i = 1; i < rows.length; i++) {
    rows[i][0] = String(i)
  }
  await saveSheetRows(token, rows)

  try { await driveTrash(token, bareFileId) } catch { /* file already gone */ }

  return { success: true, deletedId: numRowId }
}

export async function handleUpdate(token, params) {
  const { fileId: oldFileId, fileName, fileData: base64 } = params
  if (!oldFileId || !fileName || !base64) throw new Error('Missing required fields')

  const newFileId = await driveUpload(token, base64, fileName, UPLOAD_FOLDER_ID)

  try { await driveTrash(token, oldFileId) } catch { /* old file already gone */ }

  const rows = await getSheetRows(token)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3] === oldFileId) {
      rows[i][3] = newFileId
      rows[i][1] = fileName.replace(/\.pdf$/i, '')
      break
    }
  }
  await saveSheetRows(token, rows)

  return { success: true, fileId: newFileId, fileName }
}

export async function handleReorder(token, params) {
  const { order } = params
  if (!order) throw new Error('Missing order')

  const newOrder = typeof order === 'string' ? JSON.parse(order) : order
  if (!Array.isArray(newOrder)) throw new Error('Invalid order')

  const rows = await getSheetRows(token)
  const header = rows[0]
  const dataRows = rows.slice(1)

  const dataMap = {}
  dataRows.forEach(r => { dataMap[parseInt(r[0], 10)] = r })

  const reordered = [header]
  newOrder.forEach((id, idx) => {
    const row = dataMap[id]
    if (row) {
      row[0] = String(idx + 1)
      reordered.push(row)
    }
  })

  await saveSheetRows(token, reordered)
  return { success: true, count: reordered.length - 1 }
}
