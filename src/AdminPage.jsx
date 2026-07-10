import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, LogOut, ExternalLink, RefreshCw, Loader, Upload, Check } from 'lucide-react'
import UploadModal from './UploadModal.jsx'
import { SHEET_CSV_URL, SHEET_EDIT_URL, SYNC_URL, extractFileId, fetchSOPs } from './lib.js'

export default function AdminPage({ onLogout }) {
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null) // { type: 'success'|'error', text }

  const loadData = async (silent) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    // Trigger Drive → Sheet sync when refreshing
    if (silent && SYNC_URL && !SYNC_URL.startsWith('PASTE')) {
      try { await fetch(SYNC_URL) } catch {}
    }

    const data = await fetchSOPs()
    setSops(data)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadData() }, [])

  const handleUploadComplete = async () => {
    setUploadMsg(null)
    await loadData(true)
    setUploadMsg({ type: 'success', text: 'Upload berhasil! Data tersinkron.' })
    setTimeout(() => setUploadMsg(null), 4000)
  }

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
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition text-sm font-medium"
            >
              <Upload size={16} />
              Upload PDF
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

        {/* Upload status banner */}
        {uploadMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm font-medium ${
            uploadMsg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {uploadMsg.type === 'success' ? <Check size={16} /> : null}
            {uploadMsg.text}
          </div>
        )}

        {/* Info card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <p className="font-medium mb-1">Cara mengelola dokumen:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700">
            <li>Klik <strong>"Upload PDF"</strong> dan pilih file — upload langsung dari sini</li>
            <li>File otomatis tersimpan ke Drive dan tersinkron ke spreadsheet</li>
            <li>Edit kolom <strong>category</strong> dan <strong>description</strong> di sheet jika diperlukan</li>
            <li>Klik <strong>"Refresh"</strong> untuk melihat perubahan di portal</li>
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
      {showUploadModal && (
        <UploadModal
          syncUrl={SYNC_URL}
          csvUrl={SHEET_CSV_URL}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  )
}
