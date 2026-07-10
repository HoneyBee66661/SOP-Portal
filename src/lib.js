// ── Google Sheets ──────────────────────────────────────────────
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoaVGsNxKVjsjo1bWN-Yz6_ZSFFiqQYcME9zPwhUadOVjVTPwDRJIkLcTPbA_x-4Sm8W6zkQmLvBnk/pub?output=csv'

export const SHEET_EDIT_URL =
  'https://docs.google.com/spreadsheets/d/1c_qGvb1jpfL5SZFeuRxKsQO4ddyPJlSFObsyFG4wItc/edit'

// ── Google Apps Script Web App ─────────────────────────────────
export const SYNC_URL =
  'https://script.google.com/macros/s/AKfycbyjl28sV18l_KiiC46NWy0bQVLiCFk5AKzuYUWLypoZt4tXrvGr8pk7phw6bTHxhrJoxg/exec'

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
