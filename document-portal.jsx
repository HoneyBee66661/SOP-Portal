import React, { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Search, X, ExternalLink, Share2, Download, Shield, Check, Link, FileText, Loader } from 'lucide-react'

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoaVGsNxKVjsjo1bWN-Yz6_ZSFFiqQYcME9zPwhUadOVjVTPwDRJIkLcTPbA_x-4Sm8W6zkQmLvBnk/pub?output=csv'

function extractFileId(input) {
  if (!input) return input
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input
}

function getGDriveUrl(fileId) {
  return `https://drive.google.com/file/d/${extractFileId(fileId)}/view`
}

function getGDriveDownload(fileId) {
  return `https://drive.google.com/uc?export=download&id=${extractFileId(fileId)}`
}

async function fetchSOPs() {
  // Try fetching from Google Sheets
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

    // Cache in localStorage
    localStorage.setItem('document-portal-cache', JSON.stringify(items))
    return items
  } catch (e) {
    // Fallback to cache
    const cached = localStorage.getItem('document-portal-cache')
    if (cached) {
      try { return JSON.parse(cached) } catch {}
    }
    return []
  }
}

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
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-3">
        <div className="bg-gray-50 rounded-lg p-2 flex-shrink-0" ref={svgRef}>
          <QRCodeSVG value={url} size={72} level="H" fgColor="#4f46e5" bgColor="#f9fafb" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 text-sm">{label}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            {copied ? <><Check size={14} className="text-green-600" /> Copied</> : <><Link size={14} /> Copy</>}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-600 transition"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
        <button
          onClick={downloadQRPNG}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-800">Share Document</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <p className="font-medium text-gray-800 mb-1">{sop.title}</p>
        <p className="text-sm text-gray-500 mb-4">{sop.description}</p>

        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-4">
          <Link size={18} className="text-gray-400 flex-shrink-0" />
          <code className="text-xs text-gray-600 truncate flex-1">{url}</code>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition text-sm"
          >
            {copied ? <Check size={16} /> : <Link size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-sm font-medium"
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
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="min-w-0 flex-1 mr-4">
            <h2 className="font-bold text-lg text-gray-800 truncate">{sop.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition flex-shrink-0">
            <X size={22} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 bg-gray-100 min-h-[60vh]">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${extractFileId(sop.gdrivePath)}`)}&embedded=true`}
            className="w-full h-full border-none min-h-[60vh]"
            title={sop.title}
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <a
            href={getGDriveUrl(sop.gdrivePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition text-sm"
          >
            <ExternalLink size={16} />
            Open Full Screen
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition text-sm"
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
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-200 flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-xl" />

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {sop.category}
          </span>
        </div>

        <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1.5">{sop.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">{sop.description}</p>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => onView(sop)}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition active:scale-[0.98]"
          >
            <FileText size={16} />
            View PDF
          </button>
          <button
            onClick={() => onShare(sop)}
            className="flex items-center justify-center p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
            title="Share"
          >
            <Share2 size={18} />
          </button>
          <a
            href={getGDriveDownload(sop.gdrivePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
            title="Download PDF"
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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSOP, setSelectedSOP] = useState(null)
  const [shareSOP, setShareSOP] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchSOPs().then(data => {
      setSopData(data)
      setLoading(false)
    })
  }, [])

  const categories = ['all', ...new Set(sopData.map(s => s.category))]

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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-indigo-50/40 flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-indigo-50/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold mb-4">
            <Shield size={12} />
            Company Documents
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
            Document Portal
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-md mx-auto">
            Easy access to company documents and procedures across your organization
          </p>
        </div>

        {/* QR Codes */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PortalQRCard label="Portal Access" url={portalUrl} sub="Scan to open Document Portal" />
            <a
              href="/admin"
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="font-semibold text-gray-800 text-sm">Admin Panel</p>
                <p className="text-xs text-gray-500 mt-0.5">Manage documents and content</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 group-hover:text-indigo-800 transition">
                Access <ExternalLink size={14} />
              </span>
            </a>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-800 placeholder:text-gray-400 transition-shadow shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600 shadow-sm'
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
              <Search size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No documents found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-400 text-sm mb-3">
            Scan a QR code with your phone to access instantly
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors font-medium"
          >
            <Shield size={14} />
            Admin Panel
          </a>
        </div>
      </div>

      {/* Modals */}
      {selectedSOP && <PDFViewer sop={selectedSOP} onClose={() => setSelectedSOP(null)} />}
      {shareSOP && <ShareModal sop={shareSOP} onClose={() => setShareSOP(null)} />}
    </div>
  )
}
