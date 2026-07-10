import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle, Loader, FileText } from 'lucide-react'

const MAX_SIZE = 30 * 1024 * 1024 // 30MB
const CSV_CACHE_BUST = '?cache=' + Date.now()

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

function postViaIframe(url, params) {
  return new Promise((resolve, reject) => {
    const iframeName = 'upload-frame-' + Date.now()
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

    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('Waktu habis. Coba lagi.'))
      }
    }, 60000)

    const cleanup = () => {
      clearTimeout(timeout)
      if (form.parentNode) form.parentNode.removeChild(form)
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    iframe.onload = () => {
      if (settled) return
      settled = true
      cleanup()

      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document
        const text = doc.body ? doc.body.textContent || doc.body.innerText : ''
        if (text) {
          const result = JSON.parse(text)
          if (result.success) resolve(result)
          else reject(new Error(result.error || 'Upload gagal'))
        } else {
          // Empty body is expected — Apps Script redirects POST → GET
          // Verification happens in handleUpload via doGet + CSV check
          resolve({ submitted: true })
        }
      } catch (e) {
        // Unparseable response — likely the GET redirect. Resolve optimistically;
        // handleUpload will verify by checking CSV data after sync.
        resolve({ submitted: true })
      }
    }

    form.submit()
  })
}

// Fetch CSV from published Sheet and check if a title exists
async function verifyUploadInSheet(csvUrl, titleName) {
  const res = await fetch(csvUrl + CSV_CACHE_BUST)
  const csv = await res.text()
  const lines = csv.trim().split('\n')
  // Skip header row (index 0), check title column (index 1)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length >= 2) {
      const title = cols[1].trim().replace(/^"|"$/g, '')
      if (title === titleName) return true
    }
  }
  return false
}

export default function UploadModal({ syncUrl, csvUrl, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | reading | uploading | syncing | success | error
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
      const base64 = await readFileAsBase64(file)
      setStatus('uploading')

      // Use iframe to post — avoids CORS issues with Apps Script
      await postViaIframe(syncUrl, {
        fileName: file.name,
        fileData: base64,
      })

      // Wait for server to process the upload
      setStatus('syncing')
      await new Promise(r => setTimeout(r, 4000))

      // Trigger Drive → Sheet sync via doGet
      const syncRes = await fetch(syncUrl)
      const syncData = await syncRes.json()
      if (!syncData.success) {
        throw new Error(syncData.error || 'Sinkronisasi gagal')
      }

      // Verify the uploaded file actually appears in the sheet
      const found = csvUrl && await verifyUploadInSheet(csvUrl, titleName)
      if (!found) {
        throw new Error(
          'File tidak ditemukan di spreadsheet setelah upload. ' +
          'Pastikan Apps Script sudah di-redeploy dengan doPost().'
        )
      }

      // Refresh parent data
      if (onUploadComplete) await onUploadComplete()

      setStatus('success')
      setTimeout(() => onClose(), 2500)
    } catch (err) {
      setError(err.message || 'Upload gagal. Pastikan Apps Script sudah di-redeploy dengan doPost().')
      setStatus('error')
    }
  }

  const statusLabel = {
    idle: 'Upload',
    reading: 'Membaca file...',
    uploading: 'Mengupload...',
    syncing: 'Menyinkronkan...',
    success: 'Berhasil!',
    error: 'Upload Gagal',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-800">Upload PDF</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition" disabled={status === 'uploading' || status === 'syncing'}>
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
              <button onClick={reset} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition text-sm">
                Coba Lagi
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition text-sm">
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
            {(status === 'reading' || status === 'uploading' || status === 'syncing') ? (
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
