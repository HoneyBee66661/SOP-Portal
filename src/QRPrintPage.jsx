import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer } from 'lucide-react'

function getBaseUrl() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function QRCardPrint({ title, subtitle, url, id }) {
  const svgRef = useRef(null)

  const downloadPNG = () => {
    const svg = svgRef.current
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
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      ctx.drawImage(img, 50, 50, 1100, 1100)
      URL.revokeObjectURL(url)
      const link = document.createElement('a')
      link.download = `document-${id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  return (
    <div className="flex flex-col items-center">
      {/* Card preview */}
      <div className="bg-surface rounded-2xl shadow-lg p-8 flex flex-col items-center border border-border w-80">
        <p className="text-lg font-bold text-primary mb-1">{title}</p>
        <p className="text-xs text-secondary mb-6">{subtitle}</p>
        <div ref={svgRef}>
          <QRCodeSVG
            value={url}
            size={280}
            level="H"
            fgColor="#111827"
            bgColor="#ffffff"
            includeMargin
          />
        </div>
        <p className="text-[10px] text-muted mt-4 break-all text-center max-w-full">
          {url}
        </p>
      </div>

      <button
        onClick={downloadPNG}
        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition text-sm"
      >
        <Download size={16} />
        Download Hi-Res PNG
      </button>
    </div>
  )
}

export default function QRPrintPage() {
  const baseUrl = getBaseUrl()
  const portalUrl = baseUrl
  const adminUrl = baseUrl + '/admin'

  return (
    <div className="min-h-screen bg-surface-hover">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">Printable QR Codes</h1>
            <p className="text-sm text-secondary">Download hi-res PNGs for card printing</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="px-4 py-2 bg-surface border border-border rounded-xl text-sm font-medium hover:bg-surface-hover transition"
            >
              ← Back to Portal
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent text-white rounded-xl text-sm font-medium transition"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        {/* QR Cards */}
        <div className="flex flex-wrap justify-center gap-10">
          <QRCardPrint
            id="portal"
            title="Document Portal"
            subtitle="Scan to access all documents"
            url={portalUrl}
          />
          <QRCardPrint
            id="admin"
            title="Admin Panel"
            subtitle="Scan to manage documents (restricted)"
            url={adminUrl}
          />
        </div>

        {/* Print info */}
        <div className="mt-12 bg-surface rounded-xl border border-border p-6 text-sm text-secondary">
          <h2 className="font-semibold text-primary mb-2">Print Tips</h2>
          <ul className="space-y-1 list-disc list-inside">
            <li>Click <strong>Download Hi-Res PNG</strong> for individual 1200×1200px images</li>
            <li>Click <strong>Print</strong> to print both cards directly</li>
            <li>QR codes use <strong>level H</strong> error correction — scannable even if slightly damaged</li>
            <li>Save PNGs to a folder and use with any card design software</li>
          </ul>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          a, button { display: none !important; }
          .flex-wrap > div { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
