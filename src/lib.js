// ── Google Sheets ──────────────────────────────────────────────
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoaVGsNxKVjsjo1bWN-Yz6_ZSFFiqQYcME9zPwhUadOVjVTPwDRJIkLcTPbA_x-4Sm8W6zkQmLvBnk/pub?output=csv'

export const SHEET_EDIT_URL =
  'https://docs.google.com/spreadsheets/d/1c_qGvb1jpfL5SZFeuRxKsQO4ddyPJlSFObsyFG4wItc/edit'

// ── Google Apps Script Web App ─────────────────────────────────
export const SYNC_URL =
  'https://script.google.com/macros/s/AKfycbyjl28sV18l_KiiC46NWy0bQVLiCFk5AKzuYUWLypoZt4tXrvGr8pk7phw6bTHxhrJoxg/exec'

// ── File helpers ───────────────────────────────────────────────
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

/**
 * POST form data to a cross-origin URL via hidden iframe.
 * Apps Script web apps don't return CORS headers, so iframe is the only way.
 * Resolves after a fixed delay — response is unreadable (cross-origin).
 */
export function postViaIframe(url, params) {
  return new Promise((resolve) => {
    const iframeName = 'frame-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    const iframe = document.createElement('iframe')
    iframe.name = iframeName
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = url
    form.target = iframeName

    for (const [key, val] of Object.entries(params)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = val
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()

    setTimeout(() => {
      if (form.parentNode) form.parentNode.removeChild(form)
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      resolve()
    }, 3000)
  })
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

// ── Data ───────────────────────────────────────────────────────
export async function fetchSOPs() {
  try {
    const res = await fetch(SHEET_CSV_URL)
    const csv = await res.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map((h) => h.trim())
    const items = []

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim())
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
