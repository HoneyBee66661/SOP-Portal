import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Search, X, ExternalLink, Share2, Download, Shield, Check, Link, FileText, Loader, RefreshCw } from 'lucide-react'
import { extractFileId, getGDriveUrl, getGDriveDownload, fetchSOPsFresh } from './src/lib.js'
import companyLogo from './company logo.png'

function PortalQRCard({ label, url, sub }) {
  const [copied, setCopied] = useState(false)
  const svgRef = useRef(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: label, text: sub, url })
    }
  }

  const downloadQRPNG = () => {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 1200
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const img = new Image()
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)

    img.onload = () => {
      ctx.drawImage(img, 50, 50, 1100, 1100)
      URL.revokeObjectURL(blobUrl)
      const link = document.createElement('a')
      link.download = 'document-portal-qr.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = blobUrl
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 shadow-sm hover:shadow-md hover:shadow-company-red/10 hover:border-company-red/20 transition-all">
      <div className="flex items-center gap-4 mb-3">
        <div className="bg-surface-hover rounded-lg p-2 flex-shrink-0" ref={svgRef}>
          <QRCodeSVG value={url} size={72} level="H" fgColor="#000000" bgColor="#ffffff" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary text-sm">{label}</p>
          {sub && <p className="text-xs text-secondary mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs font-medium text-company-red hover:text-company-red/80 transition"
          >
            {copied ? <><Check size={14} className="text-success" /> Copied</> : <><Link size={14} /> Copy</>}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-company-red transition"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
        <button
          onClick={downloadQRPNG}
          className="inline-flex items-center gap-1 text-xs font-medium text-company-red hover:text-company-red/80 transition"
          title="Download QR Code as PNG (printable)"
        >
          <Download size={14} /> QR PNG
        </button>
      </div>
    </div>
  )
}

function ShareModal({ sop, onClose }) {
  const url = getGDriveUrl(sop.gdrivePath)
  const [copied, setCopied] = useState(false)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: sop.title, text: sop.description, url })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose} role="dialog" aria-modal="true" aria-label="Bagikan dokumen">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-primary">Share Document</h3>
          <button ref={closeRef} onClick={onClose} className="p-1.5 hover:bg-border-light rounded-lg transition" aria-label="Tutup">
            <X size={20} className="text-secondary" />
          </button>
        </div>

        <p className="font-medium text-primary mb-1">{sop.title}</p>
        <p className="text-sm text-secondary mb-4">{sop.description}</p>

        <div className="flex items-center gap-3 bg-surface-hover rounded-xl px-4 py-3 mb-4">
          <Link size={18} className="text-muted flex-shrink-0" />
          <code className="text-xs text-secondary truncate flex-1">{url}</code>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-company-red hover:bg-company-red/90 text-white font-medium py-2.5 rounded-xl transition-all text-sm shadow-md shadow-company-blue/25 hover:shadow-lg hover:shadow-company-red/20"
          >
            {copied ? <Check size={16} /> : <Link size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-border-light hover:bg-border rounded-xl transition text-sm font-medium"
            >
              <Share2 size={16} />
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PDFViewer({ sop, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose} role="dialog" aria-modal="true" aria-label={sop.title}>
      <div className="bg-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0 flex-1 mr-4">
            <h2 className="font-bold text-lg text-primary truncate">{sop.title}</h2>
          </div>
          <button ref={closeRef} onClick={onClose} className="p-1.5 hover:bg-border-light rounded-lg transition flex-shrink-0" aria-label="Tutup">
            <X size={22} className="text-secondary" />
          </button>
        </div>

        <div className="flex-1 bg-border-light min-h-[60vh] overscroll-contain">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${extractFileId(sop.gdrivePath)}`)}&embedded=true`}
            className="w-full h-full border-none min-h-[60vh]"
            title={sop.title}
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-surface-hover rounded-b-2xl">
          <a
            href={getGDriveUrl(sop.gdrivePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-company-red hover:bg-company-red/90 text-white font-medium rounded-xl transition-all text-sm shadow-md shadow-company-blue/25 hover:shadow-lg hover:shadow-company-red/20"
          >
            <ExternalLink size={16} />
            Open Full Screen
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-border hover:bg-accent-light text-primary font-medium rounded-xl transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function SOPCard({ sop, onView, onShare }) {
  return (
    <div className="group bg-surface rounded-xl border border-border shadow-sm hover:shadow-xl hover:shadow-company-red/10 hover:border-company-red/25 transition-all duration-300 flex flex-col animate-fade-in-up">
      <div className="h-1 bg-gradient-to-r from-company-red via-company-blue to-company-blue rounded-t-xl" />

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-wash text-primary border border-primary-light">
            {sop.category}
          </span>
        </div>

        <h3 className="font-semibold text-primary text-lg leading-tight mb-1.5">{sop.title}</h3>
        <p className="text-sm text-secondary leading-relaxed mb-5 flex-1">{sop.description}</p>

        <div className="flex items-center gap-2 pt-3 border-t border-border-light">
          <button
            onClick={() => onView(sop)}
            className="flex-1 flex items-center justify-center gap-2 bg-company-red hover:bg-company-red/90 text-white text-sm font-medium py-2.5 rounded-xl transition-all shadow-md shadow-company-blue/25 hover:shadow-lg hover:shadow-company-red/20 active:scale-[0.97]"
          >
            <FileText size={16} />
            View PDF
          </button>
          <button
            onClick={() => onShare(sop)}
            className="flex items-center justify-center p-2.5 text-secondary hover:text-company-red hover:bg-company-red/5 rounded-xl transition"
            title="Share"
            aria-label={`Bagikan ${sop.title}`}
          >
            <Share2 size={18} />
          </button>
          <a
            href={getGDriveDownload(sop.gdrivePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-2.5 text-secondary hover:text-company-red hover:bg-company-red/5 rounded-xl transition"
            title="Download PDF"
            aria-label={`Unduh ${sop.title}`}
          >
            <Download size={18} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function DocumentPortal() {
  const [sopData, setSopData] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSOP, setSelectedSOP] = useState(null)
  const [shareSOP, setShareSOP] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchSOPsFresh().then(data => {
      setSopData(data)
      setLoading(false)
    }).catch((err) => {
      setFetchError(err?.message || 'Gagal memuat dokumen')
      setLoading(false)
    })
  }, [])

  const handleRetry = () => {
    setLoading(true)
    setFetchError(null)
    fetchSOPsFresh().then(data => {
      setSopData(data)
      setLoading(false)
    }).catch((err) => {
      setFetchError(err?.message || 'Gagal memuat dokumen')
      setLoading(false)
    })
  }

  const categories = ['all', ...new Set(sopData.map(s => s.category).filter(Boolean))]

  const filtered = sopData.filter(sop => {
    const q = searchTerm.toLowerCase()
    return (
      (sop.title.toLowerCase().includes(q) || sop.description.toLowerCase().includes(q)) &&
      (selectedCategory === 'all' || sop.category === selectedCategory)
    )
  })

  const portalUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  const adminUrl = portalUrl + 'admin'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-page to-primary-wash/40 flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-secondary">Loading documents...</p>
        </div>
      </div>
    )
  }

  if (fetchError && sopData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-page to-primary-wash/40 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive-light mb-4">
            <X size={28} className="text-destructive-hover" />
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">Gagal Memuat Dokumen</h2>
          <p className="text-secondary text-sm mb-6">
            Tidak dapat memuat dokumen. Periksa koneksi internet Anda dan coba lagi.
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition text-sm"
          >
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page to-primary-wash/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <img
            src={companyLogo}
            alt="Company Logo"
            className="h-11 w-auto mx-auto mb-6"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-company-red border border-red-100 rounded-full text-xs font-semibold mb-4 shadow-sm">
            <Shield size={12} />
            Company Documents
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight mb-2">
            Document Portal
          </h1>
          <div className="w-16 h-0.5 bg-company-red/40 mx-auto rounded-full mb-4" />
          <p className="text-secondary text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Easy access to company documents and procedures across your organization
          </p>
        </div>

        {/* QR Codes */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PortalQRCard label="Portal Access" url={portalUrl} sub="Scan to open Document Portal" />
            <a
              href="/admin"
              className="bg-surface rounded-xl border border-border p-4 shadow-sm hover:shadow-md hover:shadow-company-red/10 hover:border-company-red/20 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="font-semibold text-primary text-sm">Admin Panel</p>
                <p className="text-xs text-secondary mt-0.5">Manage documents and content</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-company-red group-hover:text-company-red/80 transition">
                Access <ExternalLink size={14} />
              </span>
            </a>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-11 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-company-red/20 focus:border-company-red text-primary placeholder:text-muted transition-shadow shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary hover:bg-border-light rounded-lg transition"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-company-red text-white shadow-md shadow-company-blue/25'
                    : 'bg-surface text-secondary border border-border hover:border-company-red/30 hover:text-company-red shadow-sm'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(sop => (
              <SOPCard key={sop.id} sop={sop} onView={setSelectedSOP} onShare={setShareSOP} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-border-light mb-4">
              <Search size={28} className="text-muted" />
            </div>
            <p className="text-secondary text-lg font-medium">No documents found</p>
            <p className="text-muted text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-muted text-sm mb-3">
            Scan a QR code with your phone to access instantly
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-company-red transition-colors font-medium"
          >
            <Shield size={14} />
            Admin Panel
          </a>
          <p className="text-muted text-xs mt-6">&copy; 2026 Honeybee</p>
        </div>
      </div>

      {/* Modals */}
      {selectedSOP && <PDFViewer sop={selectedSOP} onClose={() => setSelectedSOP(null)} />}
      {shareSOP && <ShareModal sop={shareSOP} onClose={() => setShareSOP(null)} />}
    </div>
  )
}
