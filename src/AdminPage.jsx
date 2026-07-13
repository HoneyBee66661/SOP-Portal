import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { LogOut, ExternalLink, RefreshCw, Loader, Upload, Check, Clock, Trash2, GripVertical, ChevronDown } from 'lucide-react'
import UploadModal from './UploadModal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { SHEET_CSV_URL, SHEET_EDIT_URL, extractFileId, fetchSOPsFresh, syncApi, readFileAsBase64 } from './lib.js'

// ── Particle Burst Component ──
function ParticleBurst({ x, y }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W
    canvas.height = H

    const colors = ['#d92d2f', '#2563eb', '#e55a5c', '#3b82f6', '#f87171', '#60a5fa']
    const particles = Array.from({ length: 28 }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14 - 4,
      size: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: 0.012 + Math.random() * 0.015,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }))

    let frame
    const animate = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.25 // gravity
        p.vx *= 0.98 // friction
        p.life -= p.decay
        p.rotation += p.rotSpeed

        if (p.life <= 0) continue

        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        }

        ctx.restore()
      }
      if (particles.some(p => p.life > 0)) {
        frame = requestAnimationFrame(animate)
      }
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [x, y])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  )
}

export default function AdminPage({ onLogout }) {
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [optimisticFiles, setOptimisticFiles] = useState([])
  const [rowOrder, setRowOrder] = useState([])
  const [dragId, setDragId] = useState(null)
  const [deletingIds, setDeletingIds] = useState([])
  const [updatingId, setUpdatingId] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const updatingIdRef = useRef(null)
  const updateInputRef = useRef(null)
  const mountedRef = useRef(true)
  const filePickerOpenRef = useRef(false)
  const [showMore, setShowMore] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const pendingDeleteRef = useRef(null)
  const [particleBurst, setParticleBurst] = useState(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Detect file picker dialog closure via window focus
  useEffect(() => {
    const handler = () => {
      if (!filePickerOpenRef.current) return
      filePickerOpenRef.current = false
      if (updatingIdRef.current) {
        updatingIdRef.current = null
        setUpdatingId(null)
        if (updateInputRef.current) updateInputRef.current.value = ''
      }
    }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [])

  const loadData = useCallback(async (silent) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    const data = await fetchSOPsFresh()
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

  const handleUploadComplete = (fileNames) => {
    if (!fileNames || fileNames.length === 0) return

    setUploadMsg(null)

    // Add to table immediately with syncing badge
    const titles = fileNames.map(n => n.replace(/\.pdf$/i, ''))
    setOptimisticFiles((prev) => [...prev, ...titles])

    // Background polling — doesn't block the modal
    ;(async () => {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        if (!mountedRef.current) return
        try { await fetch(SYNC_URL) } catch {}
        let data
        try {
          data = await fetchSOPsFresh()
        } catch {
          continue
        }
        if (!mountedRef.current) return
        if (titles.every(t => data.some(d => d.title === t))) {
          setSops(data)
          setOptimisticFiles((prev) => prev.filter(f => !titles.includes(f)))
          setUploadMsg({ type: 'success', text: 'Upload berhasil! Data tersinkron.' })
          setTimeout(() => setUploadMsg(null), 4000)
          return
        }
      }
      if (!mountedRef.current) return
      // After 5 min still not found — keep entries, warn user to refresh manually
      setUploadMsg({
        type: 'error',
        text: 'File sudah diupload ke Drive tapi CSV cache Google Sheets lambat. Klik tombol Refresh untuk memeriksa.',
      })
      setTimeout(() => setUploadMsg(null), 10000)
    })()
  }

  const handleDelete = (sop) => {
    setPendingDelete(sop)
    pendingDeleteRef.current = sop
  }

  const confirmDelete = async () => {
    const sop = pendingDeleteRef.current
    setPendingDelete(null)
    pendingDeleteRef.current = null
    if (!sop) return

    // Capture position of the delete button for particle burst
    const btn = document.querySelector(`[data-delete-id="${sop.id}"]`)
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setParticleBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      setTimeout(() => setParticleBurst(null), 2000)
    }

    setDeletingIds(prev => [...prev, sop.id])

    await syncApi('delete', {
      fileId: extractFileId(sop.gdrivePath),
      rowId: sop.id,
    })

    // Poll CSV until row is confirmed gone (handle stale cache)
    let confirmed = false
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const data = await fetchSOPsFresh()
      if (!data.some(s => s.id === sop.id)) {
        confirmed = true
        break
      }
    }

    setDeletingIds(prev => prev.filter(id => id !== sop.id))

    if (confirmed) {
      setSops(prev => prev.filter(s => s.id !== sop.id))
    } else {
      setUploadMsg({
        type: 'error',
        text: `Gagal menghapus "${sop.title}". Data mungkin masih tersimpan di sheet. Klik Refresh atau coba lagi.`,
      })
      setTimeout(() => setUploadMsg(null), 10000)
    }
  }

  const cancelDelete = () => {
    setPendingDelete(null)
    pendingDeleteRef.current = null
  }

  const handleUpdateClick = (sop) => {
    setUpdatingId(sop.gdrivePath)
    updatingIdRef.current = sop.gdrivePath
    filePickerOpenRef.current = true
    updateInputRef.current?.click()
  }

  const handleUpdateFile = async (e) => {
    const file = e.target.files?.[0]
    const fileIdFromRef = updatingIdRef.current
    if (!file || !fileIdFromRef) return
    if (file.type !== 'application/pdf') {
      setUploadMsg({ type: 'error', text: `"${file.name}" bukan file PDF` })
      setTimeout(() => setUploadMsg(null), 4000)
      setUpdatingId(null)
      updatingIdRef.current = null
      if (updateInputRef.current) updateInputRef.current.value = ''
      return
    }

    const base64 = await readFileAsBase64(file)
    setUpdatingId(null)
    updatingIdRef.current = null
    if (updateInputRef.current) updateInputRef.current.value = ''

    await syncApi('update', {
      fileId: fileIdFromRef,
      fileName: file.name,
      fileData: base64,
    })

    loadData(true)
  }

  // ── Drag-and-drop ──

  const handleDragStart = (sopId) => {
    setDragId(sopId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (targetId) => {
    if (dragId === null || dragId === targetId) {
      setDragId(null)
      return
    }

    const fromIdx = rowOrder.indexOf(dragId)
    const toIdx = rowOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null)
      return
    }

    const reordered = [...rowOrder]
    const [moved] = reordered.splice(fromIdx, 1)
    const adjustedTo = toIdx > fromIdx ? toIdx - 1 : toIdx
    reordered.splice(adjustedTo, 0, moved)
    setRowOrder(reordered)
    setDragId(null)

    // Fire reorder to server
    syncApi('reorder', { order: JSON.stringify(reordered) })
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

  const sopTitles = new Set(sops.map(s => s.title))
  const totalSyncing = optimisticFiles.filter(t => !sopTitles.has(t)).length

  const getQRValue = (gdrivePath) =>
    `https://drive.google.com/file/d/${extractFileId(gdrivePath)}/view`

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-page to-primary-wash/40 flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-secondary">Loading SOPs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-page to-primary-wash/40">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pt-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin Panel</h1>
            <p className="text-secondary text-sm">Data tersinkron dari Google Sheets</p>
          </div>

          {/* Desktop toolbar */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl hover:bg-surface-hover transition text-sm font-medium"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-success hover:bg-success/90 text-white rounded-xl transition text-sm font-medium"
            >
              <Upload size={16} />
              Upload PDF
            </button>
            <a
              href={SHEET_EDIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition text-sm font-medium"
            >
              <ExternalLink size={16} />
              Edit in Google Sheets
            </a>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl hover:bg-surface-hover transition text-sm font-medium"
            >
              View Portal
            </a>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-border rounded-xl hover:bg-accent-light transition text-sm font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          {/* Mobile toolbar */}
          <div className="flex sm:hidden gap-1.5">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-success hover:bg-success/90 text-white rounded-xl transition text-xs font-medium"
            >
              <Upload size={14} />
              Upload
            </button>
            <a
              href={SHEET_EDIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition text-xs font-medium"
            >
              <ExternalLink size={14} />
              Sheet
            </a>
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-1 px-3 py-2 bg-surface border border-border rounded-xl hover:bg-surface-hover transition text-xs font-medium"
              >
                More
                <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>
              {showMore && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-surface shadow-xl rounded-xl border border-border p-1.5 z-50 min-w-[160px]">
                    <button
                      onClick={() => { loadData(true); setShowMore(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-surface-hover rounded-lg transition"
                    >
                      <RefreshCw size={14} /> Refresh
                    </button>
                    <a
                      href="/"
                      onClick={() => setShowMore(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-surface-hover rounded-lg transition"
                    >
                      View Portal
                    </a>
                    <hr className="my-1 border-border-light" />
                    <button
                      onClick={() => { onLogout(); setShowMore(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive-light rounded-lg transition"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Upload status banner */}
        {uploadMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm font-medium ${
            uploadMsg.type === 'success'
              ? 'bg-success-light border border-success-light text-success'
              : 'bg-destructive-light border border-destructive-light text-destructive'
          }`} role="status" aria-live="polite">
            {uploadMsg.type === 'success' ? <Check size={16} /> : null}
            {uploadMsg.text}
          </div>
        )}

        {/* Syncing progress bar */}
        {totalSyncing > 0 && (
          <div className="bg-info-bg border border-info-border rounded-xl p-3 mb-4 flex items-center gap-3 text-sm text-info-text" role="status" aria-live="polite">
            <Loader size={16} className="animate-spin flex-shrink-0" />
            <span>Menyinkronkan {totalSyncing} file ke spreadsheet...</span>
          </div>
        )}

        {/* Info card */}
        <div className="bg-warning-bg border border-warning-border rounded-xl p-4 mb-6 text-sm text-warning-text">
          <p className="font-medium mb-1">Cara mengelola dokumen:</p>
          <ol className="list-decimal list-inside space-y-1 text-warning-text">
            <li>Klik <strong>"Upload PDF"</strong> dan pilih file — upload langsung dari sini</li>
            <li>File otomatis tersimpan ke Drive dan tersinkron ke spreadsheet</li>
            <li>Edit kolom <strong>category</strong> dan <strong>description</strong> di sheet jika diperlukan</li>
            <li>Klik <strong>"Refresh"</strong> untuk melihat perubahan di portal</li>
            <li>Seret baris tabel untuk mengurutkan ulang</li>
          </ol>
        </div>

        {/* SOP Table */}
        <div className="bg-surface rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover border-b">
                <tr>
                  <th className="w-8 px-1 py-3"></th>
                  <th className="text-left px-4 py-3 font-semibold text-primary">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary">File ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary">Updated</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary">QR Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displaySops.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-secondary">
                      Belum ada SOP di sheet. Tambahkan entri baru.
                    </td>
                  </tr>
                ) : (
                  displaySops.map((sop, idx) => (
                    <tr
                      key={sop._syncing ? sop.id : `sop-${sop.id}`}
                      draggable={!sop._syncing}
                      onDragStart={() => handleDragStart(sop.id)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(sop.id)}
                      className={`transition ${
                        sop._syncing ? 'opacity-60' : 'hover:bg-surface-hover cursor-default'
                      } ${dragId === sop.id ? 'opacity-50 bg-primary-wash' : ''}`}
                    >
                      <td className="px-1 py-3 text-muted">
                        {!sop._syncing && (
                          <span className="cursor-grab active:cursor-grabbing inline-flex" role="button" tabIndex={0} aria-label="Urutkan baris">
                            <GripVertical size={16} />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {sop._syncing ? (
                          <Loader size={14} className="animate-spin text-info-text" />
                        ) : deletingIds.includes(sop.id) ? (
                          <Loader size={14} className="animate-spin text-destructive-hover" />
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-primary flex items-center gap-2">
                          {sop.title}
                          {sop._syncing && (
                            <span className="inline-flex items-center gap-1 text-xs bg-primary-light text-info-text px-2 py-0.5 rounded-full">
                              <Clock size={10} />
                              syncing
                            </span>
                          )}
                          {updatingId === sop.gdrivePath && (
                            <span className="inline-flex items-center gap-1 text-xs bg-warning-bg text-warning-text px-2 py-0.5 rounded-full">
                              <Loader size={10} className="animate-spin" />
                              updating
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary mt-0.5">{sop.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        {sop._syncing ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <span className="inline-block bg-primary-light text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                            {sop.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sop._syncing ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <code className="text-xs bg-border-light px-2 py-1 rounded font-mono">
                            {extractFileId(sop.gdrivePath).length > 20
                              ? extractFileId(sop.gdrivePath).slice(0, 20) + '...'
                              : extractFileId(sop.gdrivePath)}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sop._syncing ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <span className="text-[11px] text-muted">
                            {sop.updatedAt
                              ? new Date(sop.updatedAt).toLocaleDateString('id-ID', {
                                  year: 'numeric', month: 'short', day: 'numeric'
                                })
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sop._syncing ? (
                          <div className="w-[40px] h-[40px] bg-border-light rounded flex items-center justify-center">
                            <Loader size={14} className="animate-spin text-muted" />
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
                              className="p-2.5 text-primary hover:bg-info-bg rounded-lg transition disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Ganti file dengan versi baru"
                              aria-label={`Ganti file ${sop.title}`}
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(sop)}
                              disabled={deletingIds.includes(sop.id)}
                              data-delete-id={sop.id}
                              className="p-2.5 text-destructive hover:bg-destructive-light rounded-lg transition disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Hapus"
                              aria-label={`Hapus ${sop.title}`}
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
        <div className="mt-4 text-sm text-secondary text-center">
          Total: {sops.length} SOP
          {totalSyncing > 0 && (
            <span className="text-info-text ml-1">
              (+{totalSyncing} menyinkronkan)
            </span>
          )}
        </div>
      </div>
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          message={`Hapus "${pendingDelete.title}"?`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
      {particleBurst && <ParticleBurst x={particleBurst.x} y={particleBurst.y} />}
    </div>
  )
}
