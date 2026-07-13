import { useEffect, useRef } from 'react'

/**
 * Captures a DOM element to a canvas/image using SVG foreignObject.
 * No external dependencies — works in all modern browsers.
 */
function captureElement(el) {
  return new Promise((resolve, reject) => {
    try {
      const rect = el.getBoundingClientRect()
      const W = Math.ceil(rect.width)
      const H = Math.ceil(rect.height)

      if (W === 0 || H === 0) {
        reject(new Error('Element has zero size'))
        return
      }

      const clone = el.cloneNode(true)
      // Remove any canvas elements from clone to avoid taint
      const canvases = clone.querySelectorAll('canvas')
      canvases.forEach(c => c.remove())

      // Serialize the clone to SVG foreignObject
      const serializer = new XMLSerializer()
      const html = serializer.serializeToString(clone)

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <foreignObject width="${W}" height="${H}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;overflow:hidden;font-family:inherit">
            ${html}
          </div>
        </foreignObject>
      </svg>`

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load SVG image'))
      }
      img.src = url
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Telegram Thanos delete animation — ported to Canvas 2D.
 *
 * Based on Telegram Android's ThanosEffect.java + GLSL shaders.
 * Zero external dependencies.
 */
export default function ShatterEffect({ targetSelector, onComplete }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const el = document.querySelector(targetSelector)
    if (!el) {
      onComplete?.()
      return
    }

    const rect = el.getBoundingClientRect()
    const W = rect.width
    const H = rect.height

    if (W === 0 || H === 0) {
      onComplete?.()
      return
    }

    const origVisibility = el.style.visibility

    captureElement(el).then((dataUrl) => {
      const canvas = canvasRef.current
      if (!canvas) {
        onComplete?.()
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        onComplete?.()
        return
      }

      const img = new Image()
      img.onload = () => {
        const cw = window.innerWidth
        const ch = window.innerHeight
        canvas.width = cw
        canvas.height = ch

        el.style.visibility = 'hidden'

        // ── Grid: 8 cols × 6 rows (like Telegram's point cloud) ──
        const cols = 8
        const rows = 6
        const pw = W / cols
        const ph = H / rows

        const pieces = []

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            // Random direction (Telegram: rand(uv) * 2 * PI)
            const angle = Math.random() * Math.PI * 2
            // Speed (Telegram: (0.1 + rand * 0.1) * 260 * dp)
            const speed = (0.1 + Math.random() * 0.1) * 260
            const vx = Math.cos(angle) * speed
            const vy = Math.sin(angle) * speed

            // Stagger: left-to-right delay (Telegram: uv.x * uvOffset = 0.3)
            const staggerDelay = (c / cols) * 0.15

            pieces.push({
              sx: c * pw,
              sy: r * ph,
              sw: pw + 0.5,
              sh: ph + 0.5,
              dx: rect.left + c * pw,
              dy: rect.top + r * ph,
              dw: pw + 0.5,
              dh: ph + 0.5,
              vx, vy,
              rotation: 0,
              rotSpeed: (Math.random() - 0.5) * 16,
              life: 1,
              staggerDelay,
            })
          }
        }

        let frame
        const start = performance.now()
        const duration = 600 // Telegram: snapDuration = 0.6

        const animate = (now) => {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)

          ctx.clearRect(0, 0, cw, ch)

          for (const p of pieces) {
            const time = (elapsed - p.staggerDelay * 1000) / 1000

            if (time <= 0) {
              ctx.drawImage(img, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh)
              continue
            }

            // Telegram physics:
            // effectFraction = max(0, min(0.35, time)) / 0.35
            const effectT = Math.max(0, Math.min(0.35, time)) / 0.35
            // particleFraction = max(0, min(0.2, 0.1 + time - uv.x * offset)) / 0.2
            const particleFrac = Math.max(0, Math.min(0.2, 0.1 + time - (p.sx / W) * 0.3)) / 0.2

            // Gravity: (19 * sign(vx), -65) * dp * particleFraction
            const gravX = 19.0 * (p.vx > 0 ? 1 : -1) * particleFrac
            const gravY = -65.0 * particleFrac

            // Apply acceleration, friction, then position
            // (Telegram: velocity updated before position)
            p.vx += gravX * 0.016 * (1 - effectT)
            p.vy += gravY * 0.016
            p.vx *= 0.99
            p.vy *= 0.99

            p.dx += p.vx * 0.016 * particleFrac
            p.dy += p.vy * 0.016 * particleFrac
            p.rotation += p.rotSpeed * particleFrac

            // Alpha: max(0, min(0.55, particleTime) / 0.55)
            p.life = Math.max(0, Math.min(0.55, time) / 0.55)

            if (p.life <= 0.01) continue

            ctx.save()
            ctx.globalAlpha = p.life
            ctx.translate(p.dx + p.dw / 2, p.dy + p.dh / 2)
            ctx.rotate((p.rotation * Math.PI) / 180)
            ctx.drawImage(img, p.sx, p.sy, p.sw, p.sh, -p.dw / 2, -p.dh / 2, p.dw, p.dh)
            ctx.restore()
          }

          if (progress < 1) {
            frame = requestAnimationFrame(animate)
          } else {
            onComplete?.()
          }
        }

        frame = requestAnimationFrame(animate)
      }
      img.src = dataUrl
    }).catch(() => {
      el.style.visibility = origVisibility
      onComplete?.()
    })

    return () => {
      if (canvasRef.current) {
        const c = canvasRef.current
        c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
      }
    }
  }, [targetSelector])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  )
}
