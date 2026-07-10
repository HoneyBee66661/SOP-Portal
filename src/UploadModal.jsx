import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle, Loader, FileText } from 'lucide-react'

const MAX_SIZE = 30 * 1024 * 1024 // 30MB

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

/**
 * POST form data to a cross-origin URL via hidden iframe.
 * Apps Script web apps don't return CORS headers, so fetch() won't work.
 * Form+iframe is the only reliable way to send cross-origin POST from a browser.
 *
 * IMPORTANT: We CANNOT read the iframe response (cross-origin restriction).
 * This function fires the POST and waits a fixed delay, nothing more.
 * Verification happens afterward via CSV fetch.
 */
function postViaIframe(url, params) {
  return new Promise((resolve) => {
    const iframeName = 'upload-frame-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
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

    const cleanup = () => {
      if (form.parentNode) form.parentNode.removeChild(form)
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    form.submit()

    // Give time for the POST to reach the server and doPost to process.
    // We can't read the response (cross-origin), so resolve optimistically.
    setTimeout(() => {
      cleanup()
      resolve()
    }, 3000)
  })
}

/**
 * Poll the published CSV until the uploaded file title appears.
 * Google Sheets published CSV has a server-side cache that can lag
 * behind the actual sheet by 1-5 minutes, so we retry.
 */
async function waitForFileInSheet(csvUrl, titleName, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(csvUrl + '&cb=' + Date.now() + attempt)
      const csv = await res.text()
      const lines = csv.trim().split('\n')

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        if (cols.length >= 2) {
          const title = cols[1].trim().replace(/^"|"$/g, '')
          if (title === titleName) return true
        }
      }
    } catch (e) {
      // Transient network error — retry
    }

    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  return false
}

export default function UploadModal({ syncUrl, csvUrl, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | reading | uploading | syncing | verifying | success | error
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return

    if (f.type !== 'application/pdf') {
      setError('Hanya file PDF yang diizinkan')
      setFile(null)
      return
    }

    if (f.size > MAX_SIZE) {
      setError('File terlalu besar. Maksimal 30MB.')
      setFile(null)
      return
    }

    setFile(f)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return

    const titleName = file.name.replace(/\.pdf$/i, '')
    setStatus('reading')
    setError(null)

    try {
      // 1. Read file as base64
      const base64 = await readFileAsBase64(file)
      setStatus('uploading')

      // 2. POST to Apps Script via iframe (only way around CORS)
      await postViaIframe(syncUrl, {
        fileName: file.name,
        fileData: base64,
      })

      // 3. Wait for doPost + syncFromDrive to complete server-side
      setStatus('syncing')
      await new Promise((r) => setTimeout(r, 4000))

      // 4. Parent handles optimistic UI + background polling
      if (onUploadComplete) {
        await onUploadComplete(file.name)
      }

      // 5. Done — modal closes, parent table already shows the file
      setStatus('success')
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      setError(err.message || 'Upload gagal.')
      setStatus('error')
    }
  }

  const statusLabel = {
    idle: 'Upload',
    reading: 'Membaca file...',
    uploading: 'Mengupload...',
    syncing: 'Menyinkronkan...',
    verifying: 'Memverifikasi...',
    success: 'Berhasil!',
    error: 'Upload Gagal',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-800">Upload PDF</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            disabled={status === 'uploading' || status === 'syncing' || status === 'verifying'}
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
            <p className="text-sm text-gray-500 mt-1">{file?.name}</p>
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
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition mb-4 ${
                file ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <FileText size={40} className="text-indigo-500 mx-auto mb-2" />
                  <p className="font-medium text-gray-800 text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <Upload size={40} className="text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-gray-600 text-sm">Klik untuk pilih file PDF</p>
                  <p className="text-xs text-gray-400 mt-1">Maksimal 30MB</p>
                </div>
              )}
            </div>

            {/* Upload button */}
            {status === 'reading' || status === 'uploading' || status === 'syncing' || status === 'verifying' ? (
              <div className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white font-medium rounded-xl text-sm">
                <Loader size={16} className="animate-spin" />
                {statusLabel[status]}
              </div>
            ) : (
              <button
                onClick={handleUpload}
                disabled={!file}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition text-sm"
              >
                <Upload size={16} className="inline mr-1.5" />
                Upload
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
