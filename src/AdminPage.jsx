import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, LogOut, ExternalLink, RefreshCw, Loader, Upload, Check, Clock, Trash2, GripVertical } from 'lucide-react'
import UploadModal from './UploadModal.jsx'
import { SHEET_CSV_URL, SHEET_EDIT_URL, SYNC_URL, extractFileId, fetchSOPs, postViaIframe, readFileAsBase64 } from './lib.js'

export default function AdminPage({ onLogout }) {
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [optimisticFiles, setOptimisticFiles] = useState([])
  const [rowOrder, setRowOrder] = useState([])
  const [dragIdx, setDragIdx] = useState(null)
  const [deletingIds, setDeletingIds] = useState([])
  const [updatingId, setUpdatingId] = useState(null)
  const updateInputRef = useRef(null)

  const loadData = useCallback(async (silent) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    if (silent && SYNC_URL && !SYNC_URL.startsWith('PASTE')) {
      try { await fetch(SYNC_URL) } catch {}
    }

    const data = await fetchSOPs()
    setSops(data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Keep rowOrder in sync with sops (new items appended, deleted items removed)
  useEffect(() => {
    setRowOrder(prev => {
      const cur = new Set(sops.map(s => s.id))
      const kept = prev.filter(id => cur.has(id))
      for (const s of sops) {
        if (!kept.includes(s.id)) kept.push(s.id)
      }
      return kept
    })
  }, [sops])

  const handleUploadComplete = async (fileNames) => {
    if (!fileNames || fileNames.length === 0) return

    setUploadMsg(null)

    // Optimistic: add to table immediately with syncing badge
    setOptimisticFiles((prev) => [...prev, ...fileNames.map(n => n.replace(/\.pdf$/i, ''))])

    // Background: poll CSV until the new files appear
    let synced = false
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      try { await fetch(SYNC_URL) } catch {}
      const data = await fetchSOPs()
      if (fileNames.every(n => data.some(d => d.title === n.replace(/\.pdf$/i, '')))) {
        setSops(data)
        synced = true
        break
      }
    }

    if (!synced) {
      const data = await fetchSOPs()
      setSops(data)
    }

    setOptimisticFiles((prev) => prev.filter(f => !fileNames.some(n => n.replace(/\.pdf$/i, '') === f)))
    setUploadMsg({ type: 'success', text: 'Upload berhasil! Data tersinkron.' })
    setTimeout(() => setUploadMsg(null), 4000)
  }

  const handleDelete = async (sop) => {
    if (!window.confirm(`Hapus "${sop.title}"?`)) return
    setDeletingIds(prev => [...prev, sop.id])
    setSops(prev => prev.filter(s => s.id !== sop.id))

    await postViaIframe(SYNC_URL, {
      action: 'delete',
      fileId: sop.gdrivePath,
      rowId: sop.id,
    })

    setDeletingIds(prev => prev.filter(id => id !== sop.id))
    loadData(true)
  }

  const handleUpdateClick = (sop) => {
    setUpdatingId(sop.gdrivePath)
    updateInputRef.current?.click()
  }

  const handleUpdateFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !updatingId) return
    if (file.type !== 'application/pdf') {
      setUploadMsg({ type: 'error', text: `"${file.name}" bukan file PDF` })
      setTimeout(() => setUploadMsg(null), 4000)
      setUpdatingId(null)
      if (updateInputRef.current) updateInputRef.current.value = ''
      return
    }

    const base64 = await readFileAsBase64(file)
    setUpdatingId(null)
    if (updateInputRef.current) updateInputRef.current.value = ''

    await postViaIframe(SYNC_URL, {
      action: 'update',
      fileId: updatingId, // Actually old fileId to replace
      fileName: file.name,
      fileData: base64,
    })

    loadData(true)
  }

  // ── Drag-and-drop ──

  const handleDragStart = (idx) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      return
    }

    const reordered = [...rowOrder]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    setRowOrder(reordered)
    setDragIdx(null)

    // Fire reorder to server
    postViaIframe(SYNC_URL, {
      action: 'reorder',
      order: JSON.stringify(reordered),
    })
  }

  // Merge real data with optimistic (syncing) entries, sorted by rowOrder
  const displaySops = useMemo(() => {
    const real = sops.filter(s => !deletingIds.includes(s.id))
    const syncing = optimisticFiles
      .filter(name => !sops.some(s => s.title === name))
      .map((name, i) => ({
        id: `syncing-${i}`,
        title: name,
        category: null,
        gdrivePath: null,
        description: 'Menunggu sinkronisasi...',
        _syncing: true,
      }))

    const ordered = [...real].sort((a, b) => {
      const ai = rowOrder.indexOf(a.id)
      const bi = rowOrder.indexOf(b.id)
      return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi)
    })

    return [...ordered, ...syncing]
  }, [sops, optimisticFiles, rowOrder, deletingIds])

  const totalSyncing = optimisticFiles.length - sops.some(s => optimisticFiles.includes(s.title))

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

        {/* Syncing progress bar */}
        {totalSyncing > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-3 text-sm text-blue-700">
            <Loader size={16} className="animate-spin flex-shrink-0" />
            <span>Menyinkronkan {totalSyncing} file ke spreadsheet...</span>
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
            <li>Seret baris tabel untuk mengurutkan ulang</li>
          </ol>
        </div>

        {/* SOP Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-8 px-1 py-3"></th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">File ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">QR Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displaySops.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">
                      Belum ada SOP di sheet. Tambahkan entri baru.
                    </td>
                  </tr>
                ) : (
                  displaySops.map((sop, idx) => (
                    <tr
                      key={sop._syncing ? sop.id : `sop-${sop.id}`}
                      draggable={!sop._syncing}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      className={`transition ${
                        sop._syncing ? 'opacity-60' : 'hover:bg-gray-50 cursor-default'
                      } ${dragIdx === idx ? 'opacity-50 bg-indigo-50' : ''}`}
                    >
                      <td className="px-1 py-3 text-gray-400">
                        {!sop._syncing && (
                          <span className="cursor-grab active:cursor-grabbing inline-flex">
                            <GripVertical size={16} />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sop._syncing ? (
                          <Loader size={14} className="animate-spin text-blue-500" />
                        ) : deletingIds.includes(sop.id) ? (
                          <Loader size={14} className="animate-spin text-red-500" />
                        ) : (
                          sop.id
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 flex items-center gap-2">
                          {sop.title}
                          {sop._syncing && (
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              <Clock size={10} />
                              syncing
                            </span>
                          )}
                          {updatingId === sop.gdrivePath && (
                            <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                              <Loader size={10} className="animate-spin" />
                              updating
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{sop.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        {sop._syncing ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            {sop.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sop._syncing ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {extractFileId(sop.gdrivePath).length > 20
                              ? extractFileId(sop.gdrivePath).slice(0, 20) + '...'
                              : extractFileId(sop.gdrivePath)}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sop._syncing ? (
                          <div className="w-[40px] h-[40px] bg-gray-100 rounded flex items-center justify-center">
                            <Loader size={14} className="animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <QRCodeSVG value={getQRValue(sop.gdrivePath)} size={40} level="H" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!sop._syncing && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateClick(sop)}
                              disabled={updatingId !== null}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40"
                              title="Update file (ganti dengan versi baru)"
                            >
                              <Upload size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(sop)}
                              disabled={deletingIds.includes(sop.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                              title="Hapus"
                            >
                              {deletingIds.includes(sop.id) ? (
                                <Loader size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hidden file input for update */}
        <input
          ref={updateInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpdateFile}
          className="hidden"
        />

        {/* Stats */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Total: {sops.length} SOP
          {totalSyncing > 0 && (
            <span className="text-blue-500 ml-1">
              (+{totalSyncing} menyinkronkan)
            </span>
          )}
        </div>
      </div>
      {showUploadModal && (
        <UploadModal
          syncUrl={SYNC_URL}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  )
}
