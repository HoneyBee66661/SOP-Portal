import { useState, useRef, useEffect } from 'react'
import { Upload, X, Check, AlertCircle, Loader, FileText } from 'lucide-react'
import { readFileAsBase64, syncApi } from './lib.js'

const MAX_SIZE = 3 * 1024 * 1024 // 3MB (Vercel serverless body limit ~4.5MB, base64 adds 37%)

export default function UploadModal({ onClose, onUploadComplete }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | reading | uploading | syncing | success | error
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const inputRef = useRef(null)
  const closeRef = useRef(null)

  const isBusy = status === 'reading' || status === 'uploading' || status === 'syncing'

  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = (e) => {
      if (e.key === 'Escape' && !isBusy) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, isBusy])

  const reset = () => {
    setFiles([])
    setStatus('idle')
    setError(null)
    setProgress({ current: 0, total: 0 })
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return

    // Validate each file
    for (const f of selected) {
      if (f.type !== 'application/pdf') {
        setError(`"${f.name}" bukan file PDF`)
        setFiles([])
        return
      }
      if (f.size > MAX_SIZE) {
        setError(`"${f.name}" terlalu besar. Maksimal 3MB.`)
        setFiles([])
        return
      }
    }

    setFiles(selected)
    setError(null)
    setProgress({ current: 0, total: selected.length })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setStatus('reading')
    setError(null)

    const uploadedNames = []

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        setProgress({ current: i, total: files.length })

        setStatus('reading')
        const base64 = await readFileAsBase64(f)

        setStatus('uploading')
        await syncApi('upload', {
          fileName: f.name,
          fileData: base64,
        })

        setStatus('syncing')
        await new Promise((r) => setTimeout(r, 4000))

        uploadedNames.push(f.name)
      }

      // Notify parent with all uploaded filenames
      if (onUploadComplete && uploadedNames.length > 0) {
        await onUploadComplete(uploadedNames)
      }

      setStatus('success')
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      setError(err.message || `Upload gagal pada file ${progress.current + 1}/${progress.total}`)
      setStatus('error')
    }
  }

  const progressLabel = () => {
    if (status === 'idle') return 'Upload'
    if (status === 'success') return 'Berhasil!'
    if (status === 'error') return 'Upload Gagal'
    if (files.length > 1) {
      return `${status === 'reading' ? 'Membaca' : status === 'uploading' ? 'Mengupload' : 'Menyinkronkan'} ${progress.current + 1}/${progress.total}`
    }
    return status === 'reading' ? 'Membaca file...'
      : status === 'uploading' ? 'Mengupload...'
      : 'Menyinkronkan...'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={isBusy ? undefined : onClose} role="dialog" aria-modal="true" aria-label="Upload PDF">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-primary">Upload PDF</h3>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-1.5 hover:bg-border-light rounded-lg transition"
            disabled={isBusy}
            aria-label="Tutup"
          >
            <X size={20} className="text-secondary" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-success" />
            </div>
            <p className="font-semibold text-primary text-lg">Upload Berhasil</p>
            <p className="text-sm text-secondary mt-1">{files.length} file berhasil diupload</p>
          </div>
        ) : status === 'error' ? (
          <div>
            <div className="bg-destructive-light border border-destructive-light rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-destructive-hover flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive text-sm">Upload Gagal</p>
                <p className="text-destructive text-xs mt-1">{error}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition text-sm"
              >
                Coba Lagi
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-border hover:bg-accent-light text-primary font-medium rounded-xl transition text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* File picker area */}
            <div
              onClick={() => !isBusy && inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition mb-4 ${
                files.length > 0
                  ? 'border-primary-light bg-primary-wash'
                  : 'border-border hover:border-primary-light hover:bg-surface-hover'
              } ${isBusy ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {files.length > 0 ? (
                <div>
                  <FileText size={40} className="text-primary mx-auto mb-2" />
                  <p className="font-medium text-primary text-sm">{files.length} file dipilih</p>
                  <ul className="text-xs text-secondary mt-2 space-y-1 max-h-24 overflow-y-auto overscroll-contain">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                        {!isBusy && (
                          <button
                            onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-1 text-destructive-hover hover:bg-destructive-light rounded transition flex-shrink-0"
                            aria-label={`Hapus ${f.name}`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <Upload size={40} className="text-muted mx-auto mb-2" />
                  <p className="font-medium text-secondary text-sm">Klik untuk pilih file PDF</p>
                  <p className="text-xs text-muted mt-1">Maksimal 3MB per file, bisa pilih banyak</p>
                </div>
              )}
            </div>

            {/* Upload/Progress button */}
            {isBusy ? (
              <div className="flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-medium rounded-xl text-sm">
                <Loader size={16} className="animate-spin" />
                {progressLabel()}
              </div>
            ) : (
              <button
                onClick={handleUpload}
                disabled={files.length === 0}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:bg-accent-light disabled:cursor-not-allowed text-white font-medium rounded-xl transition text-sm"
              >
                <Upload size={16} className="inline mr-1.5" />
                Upload{files.length > 1 ? ` (${files.length} file)` : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
