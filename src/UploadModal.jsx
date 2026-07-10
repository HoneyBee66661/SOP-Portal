import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle, Loader, FileText } from 'lucide-react'
import { readFileAsBase64, postViaIframe } from './lib.js'

const MAX_SIZE = 30 * 1024 * 1024 // 30MB

export default function UploadModal({ syncUrl, onClose, onUploadComplete }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | reading | uploading | syncing | success | error
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const inputRef = useRef(null)

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
        setError(`"${f.name}" terlalu besar. Maksimal 30MB.`)
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
        await postViaIframe(syncUrl, {
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

  const isBusy = status === 'reading' || status === 'uploading' || status === 'syncing'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-800">Upload PDF</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            disabled={isBusy}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <p className="font-semibold text-gray-800 text-lg">Upload Berhasil</p>
            <p className="text-sm text-gray-500 mt-1">{files.length} file berhasil diupload</p>
          </div>
        ) : status === 'error' ? (
          <div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 text-sm">Upload Gagal</p>
                <p className="text-red-600 text-xs mt-1">{error}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition text-sm"
              >
                Coba Lagi
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition text-sm"
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
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
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
                  <FileText size={40} className="text-indigo-500 mx-auto mb-2" />
                  <p className="font-medium text-gray-800 text-sm">{files.length} file dipilih</p>
                  <ul className="text-xs text-gray-500 mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {files.map((f, i) => (
                      <li key={i} className="truncate">{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <Upload size={40} className="text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-gray-600 text-sm">Klik untuk pilih file PDF</p>
                  <p className="text-xs text-gray-400 mt-1">Maksimal 30MB per file, bisa pilih banyak</p>
                </div>
              )}
            </div>

            {/* Upload/Progress button */}
            {isBusy ? (
              <div className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white font-medium rounded-xl text-sm">
                <Loader size={16} className="animate-spin" />
                {progressLabel()}
              </div>
            ) : (
              <button
                onClick={handleUpload}
                disabled={files.length === 0}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition text-sm"
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
