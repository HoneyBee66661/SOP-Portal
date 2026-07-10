import QRCode from 'qrcode'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, 'qr-output')

const PORTAL_URL = 'https://document-portal.vercel.app'
const ADMIN_URL = 'https://document-portal.vercel.app/admin'

const qrs = [
  { filename: 'qr-document-portal.png', url: PORTAL_URL, label: 'Document Portal' },
  { filename: 'qr-document-admin.png', url: ADMIN_URL, label: 'Admin Panel' },
]

async function generate() {
  for (const qr of qrs) {
    await QRCode.toFile(join(outDir, qr.filename), qr.url, {
      type: 'png',
      width: 1200,
      margin: 4,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
    console.log(`✅ Generated: ${qr.filename} (${qr.label})`)
  }

  // Also export SVGs for vector printing
  for (const qr of qrs) {
    const svg = await QRCode.toString(qr.url, {
      type: 'svg',
      width: 1200,
      margin: 4,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
    const svgFile = qr.filename.replace('.png', '.svg')
    writeFileSync(join(outDir, svgFile), svg)
    console.log(`✅ Generated: ${svgFile} (vector - best for printing)`)
  }

  console.log('\n📁 Files saved to:', outDir)
}

generate().catch(console.error)
