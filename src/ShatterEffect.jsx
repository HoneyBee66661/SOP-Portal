import { useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'

/**
 * Telegram-style delete animation.
 * Captures a DOM element as an image, slices it into fragments,
 * and animates each fragment flying outward with gravity + rotation + fade.
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

    // Capture the element as a canvas image
    html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    }).then((captured) => {
      const mainCanvas = canvasRef.current
      if (!mainCanvas) {
        onComplete?.()
        return
      }

      const ctx = mainCanvas.getContext('2d')
      if (!ctx) {
        onComplete?.()
        return
      }

      // Set canvas to viewport size
      const cw = window.innerWidth
      const ch = window.innerHeight
      mainCanvas.width = cw
      mainCanvas.height = ch

      // Hide the original element
      el.style.visibility = 'hidden'

      // Slice into grid pieces
      const cols = 6
      const rows = 4
      const pw = W / cols  // piece width
      const ph = H / rows  // piece height

      const pieces = []

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Random offset for jagged edges (pixel gap between pieces)
          const ox = (Math.random() - 0.5) * 2
          const oy = (Math.random() - 0.5) * 2

          pieces.push({
            sx: c * pw,          // source x
            sy: r * ph,          // source y
            sw: pw + ox,         // source width
            sh: ph + oy,         // source height
            dx: rect.left + c * pw,  // dest x (initial)
            dy: rect.top + r * ph,   // dest y (initial)
            dw: pw + ox,         // dest width
            dh: ph + oy,         // dest height
            vx: (Math.random() - 0.5) * 18,
            vy: (Math.random() - 0.5) * 18 - 8,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 20,
            life: 1,
            decay: 0.012 + Math.random() * 0.015,
          })
        }
      }

      let frame
      const start = performance.now()
      const duration = 1000 // 1s animation

      const animate = (now) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)

        ctx.clearRect(0, 0, cw, ch)

        for (const p of pieces) {
          // Physics
          p.vx *= 0.97 // friction
          p.vy += 0.3  // gravity
          p.dx += p.vx
          p.dy += p.vy
          p.rotation += p.rotSpeed
          p.life = 1 - progress * 1.1 // fade out before end

          if (p.life <= 0) continue

          ctx.save()
          ctx.globalAlpha = Math.max(0, p.life)
          ctx.translate(p.dx + p.dw / 2, p.dy + p.dh / 2)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.drawImage(
            captured,
            p.sx, p.sy, p.sw, p.sh,
            -p.dw / 2, -p.dh / 2, p.dw, p.dh
          )
          ctx.restore()
        }

        if (progress < 1) {
          frame = requestAnimationFrame(animate)
        } else {
          // Animation complete
          el.style.visibility = ''
          onComplete?.()
        }
      }

      frame = requestAnimationFrame(animate)

      return () => cancelAnimationFrame(frame)
    }).catch(() => {
      // html2canvas failed — proceed without animation
      onComplete?.()
    })
  }, [targetSelector])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  )
}
