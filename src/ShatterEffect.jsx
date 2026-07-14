import { useEffect, useRef } from 'react'

/**
 * Dust-particle delete effect with diagonal tape-peel.
 *
 * Algorithm:
 *  1. Capture — clone the element into an SVG <foreignObject>, render
 *     to an offscreen canvas (zero deps). Fallback to computed colors.
 *  2. Sample — every N-th pixel becomes one particle with its exact
 *     RGB color. Particles are split horizontally into two slices.
 *  3. Physics — lower slice: burst upward + rightward with gravity
 *     (dust blown off a speeding car). Upper slice: same burst PLUS
 *     a diagonal "tape peel" wave from bottom-left → upper-right.
 *  4. Overall timing flows left → right. Render: fast fillRect loop.
 */
export default function ShatterEffect({ targetSelector, onComplete }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const el = document.querySelector(targetSelector)
    if (!el) { onComplete?.(); return }

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) { onComplete?.(); return }

    const $canvas = canvasRef.current
    if (!$canvas) { onComplete?.(); return }
    const ctx = $canvas.getContext('2d')
    if (!ctx) { onComplete?.(); return }

    const W = Math.ceil(rect.width)
    const H = Math.ceil(rect.height)
    const cw = window.innerWidth
    const ch = window.innerHeight
    $canvas.width = cw
    $canvas.height = ch

    let running = true
    let frame

    // Hide original immediately
    const origVisibility = el.style.visibility
    el.style.visibility = 'hidden'

    // ───── Step 1: Capture ─────
    const captureElement = () => {
      return new Promise((resolve) => {
        try {
          const clone = el.cloneNode(true)
          clone.querySelectorAll('canvas').forEach(c => c.remove())

          const html = new XMLSerializer().serializeToString(clone)
          const svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="', W, '" height="', H, '">',
            '<foreignObject width="', W, '" height="', H, '">',
            '<div xmlns="http://www.w3.org/1999/xhtml" style="width:', W, 'px;height:', H, 'px;overflow:hidden">',
            html,
            '</div></foreignObject></svg>',
          ].join('')

          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const img = new Image()
          img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
          img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
          img.src = url
        } catch { resolve(null) }
      })
    }

    captureElement().then((img) => {
      if (!running) return

      // ───── Step 2: Pixel sampling + slice split ─────
      let pixelData = null
      if (img) {
        const offscreen = document.createElement('canvas')
        offscreen.width = W
        offscreen.height = H
        const offCtx = offscreen.getContext('2d')
        if (offCtx) {
          offCtx.drawImage(img, 0, 0, W, H)
          try { pixelData = offCtx.getImageData(0, 0, W, H) } catch { /* taint */ }
        }
      }

      const fallbackPalette = buildFallbackPalette(el)

      // Dynamic stride: keep particle count manageable
      const totalPixels = W * H
      const stride = totalPixels > 50000 ? 3 : totalPixels > 20000 ? 2 : 1
      const size = stride
      const data = pixelData?.data

      // Horizontal split line
      const midY = H / 2

      const pieces = []

      for (let y = 0; y < H; y += stride) {
        for (let x = 0; x < W; x += stride) {
          let color

          if (data) {
            const idx = (y * W + x) * 4
            const a = data[idx + 3]
            if (a < 128) continue
            color = `rgb(${data[idx]},${data[idx + 1]},${data[idx + 2]})`
          } else {
            color = fallbackPalette[Math.floor(Math.random() * fallbackPalette.length)]
          }

          // Normalized position within the element
          const nx = x / W       // 0 = left, 1 = right
          const ny = y / H       // 0 = top, 1 = bottom
          const isUpper = y < midY

          // ═══ Left-to-right stagger (overall wave) ═══
          const ltrDelay = nx * 0.12

          // ═══ Diagonal tape-peel delay (upper half only) ═══
          // Peel wave starts at bottom-left (nx=0, ny=1) and sweeps
          // toward upper-right (nx=1, ny=0).
          const diagProgress = isUpper ? (nx + (1 - ny)) / 2 : 0
          const peelDelay = isUpper ? diagProgress * 0.18 : 0

          // Total delay = left-to-right wave + peel stagger + micro jitter
          const totalDelay = ltrDelay + peelDelay + Math.random() * 0.03

          // Jitter starting position
          const jx = (Math.random() - 0.5) * stride
          const jy = (Math.random() - 0.5) * stride

          // ═══ Base burst ═══
          // Lower half: 10% strength — barely lifts before gravity yanks it down
          // Upper half: full burst as base
          const baseScale = isUpper ? 1 : 0.1
          const vy = -(40 + Math.random() * 56) * baseScale
          const vx = (24 + Math.random() * 36) * baseScale

          // ═══ Diagonal peel velocity (upper half only) ═══
          // Scaled BIGGER than the base burst — dominant visual motion.
          // Diagonal kick toward upper-right, simulating a tape being
          // peeled from bottom-left to upper-right.
          const peelVx = isUpper ? 80 + Math.random() * 80 : 0
          const peelVy = isUpper ? -(72 + Math.random() * 88) : 0

          pieces.push({
            x: rect.left + x + jx,
            y: rect.top + y + jy,
            size: size * (0.6 + Math.random() * 0.8),
            vx,
            vy,
            peelVx,
            peelVy,
            color,
            life: 1,
            delay: totalDelay,
            peelDelay,
            isUpper,
          })
        }
      }

      // ───── Step 4: Render ─────
      const t0 = performance.now()
      const DURATION = 900

      const draw = (now) => {
        if (!running) return
        const progress = (now - t0) / DURATION
        if (progress >= 1) { onComplete?.(); return }

        ctx.clearRect(0, 0, cw, ch)

        for (const p of pieces) {
          const t = (now - t0) / 1000 - p.delay
          if (t <= 0) {
            // At origin — tiny colored dot
            ctx.fillStyle = p.color
            ctx.fillRect(p.x, p.y, p.size, p.size)
            continue
          }

          // ── Base physics: gravity + friction ──
          p.vy += 136 * 0.016
          p.vx *= 0.98
          p.vy *= 0.98

          p.x += p.vx * 0.016
          p.y += p.vy * 0.016

          // ── Diagonal tape-peel (upper half only) ──
          if (p.isUpper) {
            const peelT = t - p.peelDelay
            if (peelT > 0) {
              // Peel velocity: fast initial diagonal burst, then decay
              const peelFriction = Math.exp(-peelT * 5)
              p.x += p.peelVx * 0.016 * peelFriction
              p.y += p.peelVy * 0.016 * peelFriction
            }
          }

          // ── Fade ──
          p.life = Math.max(0, 1 - t / 0.55)
          if (p.life < 0.01) continue

          ctx.globalAlpha = p.life
          ctx.fillStyle = p.color
          ctx.fillRect(p.x, p.y, p.size, p.size)
        }

        ctx.globalAlpha = 1
        frame = requestAnimationFrame(draw)
      }

      frame = requestAnimationFrame(draw)
    })

    return () => {
      running = false
      if (frame) cancelAnimationFrame(frame)
      el.style.visibility = origVisibility
    }
  }, [targetSelector])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  )
}

/**
 * Build a color palette from the element's computed styles.
 * Fallback when pixel capture fails/taints.
 */
function buildFallbackPalette(el) {
  const colors = []
  const bg = parseColor(getComputedStyle(el).backgroundColor)
  if (bg) colors.push(bg)

  const children = el.querySelectorAll('*')
  const max = Math.min(children.length, 20)
  for (let i = 0; i < max; i++) {
    const style = getComputedStyle(children[i])
    const childBg = parseColor(style.backgroundColor)
    if (childBg && !isWhite(childBg)) colors.push(childBg)
    const text = parseColor(style.color)
    if (text && !isWhiteOrBlack(text)) colors.push(text)
  }

  if (colors.length < 3) {
    colors.push(
      '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280',
      '#3b82f6', '#ef4444', '#10b981',
    )
  }

  const palette = []
  for (const c of colors) {
    palette.push(c)
    palette.push(darken(c, 0.15))
    palette.push(lighten(c, 0.15))
  }
  return palette
}

function parseColor(str) {
  if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return null
  const m = str.match(/\d+/g)
  if (!m || m.length < 3) return null
  return `rgb(${m[0]},${m[1]},${m[2]})`
}

function isWhite(rgb) {
  const m = rgb.match(/\d+/g)
  if (!m) return false
  return parseInt(m[0]) > 240 && parseInt(m[1]) > 240 && parseInt(m[2]) > 240
}

function isWhiteOrBlack(rgb) {
  const m = rgb.match(/\d+/g)
  if (!m) return false
  const avg = (parseInt(m[0]) + parseInt(m[1]) + parseInt(m[2])) / 3
  return avg > 230 || avg < 30
}

function darken(rgb, amount) {
  const m = rgb.match(/\d+/g)
  if (!m) return rgb
  return `rgb(${Math.round(parseInt(m[0]) * (1 - amount))},${Math.round(parseInt(m[1]) * (1 - amount))},${Math.round(parseInt(m[2]) * (1 - amount))})`
}

function lighten(rgb, amount) {
  const m = rgb.match(/\d+/g)
  if (!m) return rgb
  return `rgb(${Math.round(Math.min(255, parseInt(m[0]) + (255 - parseInt(m[0])) * amount))},${Math.round(Math.min(255, parseInt(m[1]) + (255 - parseInt(m[1])) * amount))},${Math.round(Math.min(255, parseInt(m[2]) + (255 - parseInt(m[2])) * amount))})`
}
