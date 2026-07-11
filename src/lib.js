// ── Google Sheets ──────────────────────────────────────────────
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoaVGsNxKVjsjo1bWN-Yz6_ZSFFiqQYcME9zPwhUadOVjVTPwDRJIkLcTPbA_x-4Sm8W6zkQmLvBnk/pub?output=csv'

export const SHEET_EDIT_URL =
  'https://docs.google.com/spreadsheets/d/1c_qGvb1jpfL5SZFeuRxKsQO4ddyPJlSFObsyFG4wItc/edit'

// ── API endpoint (same-origin Vercel serverless function) ──────
export const SYNC_URL = '/api/sync'

// ── File helpers ───────────────────────────────────────────────
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

// ── Admin auth token (set after login, sent with mutations) ────
let _adminToken = null

export function setAdminToken(token) {
  _adminToken = token
}

export function clearAdminToken() {
  _adminToken = null
}

// ── API helpers ────────────────────────────────────────────────
export async function syncApi(action, params = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (_adminToken) {
    headers['Authorization'] = 'Bearer ' + _adminToken
  }
  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...params }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

// ── Helpers ────────────────────────────────────────────────────
export function extractFileId(input) {
  if (!input) return input
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input
}

export function getGDriveUrl(fileId) {
  return `https://drive.google.com/file/d/${extractFileId(fileId)}/view`
}

export function getGDriveDownload(fileId) {
  return `https://drive.google.com/uc?export=download&id=${extractFileId(fileId)}`
}

// ── Quote-aware CSV line parser ───────────────────────────────
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// ── Data ───────────────────────────────────────────────────────
export async function fetchSOPs() {
  try {
    const res = await fetch(SHEET_CSV_URL)
    const csv = await res.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    const headers = parseCSVLine(lines[0])
    const items = []

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i])
      const entry = {}
      headers.forEach((h, idx) => {
        entry[h] = vals[idx] || ''
      })
      if (entry.id) {
        entry.id = parseInt(entry.id, 10)
        if (entry.priority) entry.priority = parseInt(entry.priority, 10)
        items.push(entry)
      }
    }

    localStorage.setItem('document-portal-cache', JSON.stringify(items))
    return items
  } catch (e) {
    const cached = localStorage.getItem('document-portal-cache')
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }
    return []
  }
}

/**
 * Fetch SOP data directly from the Vercel API (live data via Google Sheets API).
 * Falls back to CSV if the API request fails.
 */
export async function fetchSOPsFresh() {
  try {
    const res = await fetch(SYNC_URL, { method: 'GET' })
    if (!res.ok) throw new Error('API request failed: ' + res.status)
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      localStorage.setItem('document-portal-cache', JSON.stringify(json.data))
      return json.data
    }
    throw new Error('Unexpected response format from API')
  } catch (e) {
    console.warn('fetchSOPsFresh failed, falling back to CSV:', e.message)
    return fetchSOPs()
  }
}
