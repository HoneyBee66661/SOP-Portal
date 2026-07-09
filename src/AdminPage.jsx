import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, LogOut, ExternalLink, RefreshCw, Loader } from 'lucide-react'

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoaVGsNxKVjsjo1bWN-Yz6_ZSFFiqQYcME9zPwhUadOVjVTPwDRJIkLcTPbA_x-4Sm8W6zkQmLvBnk/pub?output=csv'
const SHEET_EDIT_URL = 'https://docs.google.com/spreadsheets/d/1c_qGvb1jpfL5SZFeuRxKsQO4ddyPJlSFObsyFG4wItc/edit'

const extractFileId = (input) => {
  if (!input) return input
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input
}

async function fetchSOPs() {
  try {
    const res = await fetch(SHEET_CSV_URL)
    const csv = await res.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const items = []

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim())
      const entry = {}
      headers.forEach((h, idx) => { entry[h] = vals[idx] || '' })
      if (entry.id) {
        entry.id = parseInt(entry.id, 10)
        items.push(entry)
      }
    }

    localStorage.setItem('sop-portal-cache', JSON.stringify(items))
    return items
  } catch (e) {
    const cached = localStorage.getItem('sop-portal-cache')
    if (cached) {
      try { return JSON.parse(cached) } catch {}
    }
    return []
  }
}

export default function AdminPage({ onLogout }) {
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async (silent) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    const data = await fetchSOPs()
    setSops(data)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadData() }, [])

  const getQRValue = (gdrivePath) =>
    `https://drive.google.com/file/d/${extractFileId(gdrivePath)}/view`

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading SOPs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pt-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-600 text-sm">Data tersinkron dari Google Sheets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <a
              href={SHEET_EDIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition text-sm font-medium"
            >
              <ExternalLink size={16} />
              Edit in Google Sheets
            </a>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
            >
              View Portal
            </a>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition text-sm font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <p className="font-medium mb-1">Cara mengelola SOP:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700">
            <li>Klik <strong>"Edit in Google Sheets"</strong> untuk membuka spreadsheet</li>
            <li>Tambah, ubah, atau hapus baris (id, title, category, gdrivePath, description)</li>
            <li>Klik <strong>"Refresh"</strong> di sini untuk menarik perubahan terbaru</li>
            <li>Portal di <strong>/</strong> otomatis mengambil data terbaru setiap kali dibuka</li>
          </ol>
        </div>

        {/* SOP Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">File ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">QR Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sops.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-500">
                      Belum ada SOP di sheet. Tambahkan entri baru.
                    </td>
                  </tr>
                ) : (
                  sops.map(sop => (
                    <tr key={sop.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500">{sop.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{sop.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{sop.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {sop.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {extractFileId(sop.gdrivePath).length > 20
                            ? extractFileId(sop.gdrivePath).slice(0, 20) + '...'
                            : extractFileId(sop.gdrivePath)}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <QRCodeSVG value={getQRValue(sop.gdrivePath)} size={40} level="H" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Total: {sops.length} SOP
        </div>
      </div>
    </div>
  )
}
