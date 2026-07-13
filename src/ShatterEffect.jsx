import { useEffect, useRef } from 'react'

/**
 * Telegram-style delete shatter effect.
 * Renders colored grid pieces at the element's position using Canvas 2D.
 * 100% reliable across all browsers — zero dependencies.
 *
 * Physics ported from Telegram Android's ThanosEffect GLSL:
 * - Grid particles with random velocity × 260
 * - Gravity: (19·sign(vx), -65) per Telegram's vertex shader
 * - Friction: 0.99 (velocityMult)
 * - Stagger left-to-right (uv.x * offset)
 * - Duration: 600ms (snapDuration)
 * - Alpha fade over 0.55s life window
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

    const canvas = canvasRef.current
    if (!canvas) { onComplete?.(); return }
    const ctx = canvas.getContext('2d')
    if (!ctx) { onComplete?.(); return }

    const cw = window.innerWidth
    const ch = window.innerHeight
    canvas.width = cw
    canvas.height = ch

    // Save original visibility
    const origVisibility = el.style.visibility
    el.style.visibility = 'hidden'

    // Read the element's computed background color
    const bgColor = getComputedStyle(el).backgroundColor || '#ffffff'
    // Accent colors
    const accentColors = ['#d92d2f', '#2563eb', '#e55a5c', '#3b82f6', '#f87171', '#60a5fa']

    // ── 8×6 grid of colored pieces ──
    const cols = 8, rows = 6
    const pw = W / cols, ph = H / rows

    const pieces = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const angle = Math.random() * Math.PI * 2
        const speed = (0.1 + Math.random() * 0.1) * 260
        pieces.push({
          x: rect.left + c * pw,
          y: rect.top + r * ph,
          w: pw + 0.5,
          h: ph + 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: accentColors[Math.floor(Math.random() * accentColors.length)],
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 16,
          life: 1,
          staggerDelay: (c / cols) * 0.15,
        })
      }
    }

    let frame
    const start = performance.now()
    const duration = 600 // Telegram: snapDuration

    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)

      ctx.clearRect(0, 0, cw, ch)

      for (const p of pieces) {
        const time = (elapsed - p.staggerDelay * 1000) / 1000

        if (time <= 0) {
          // Draw in original position
          ctx.fillStyle = bgColor
          ctx.fillRect(p.x, p.y, p.w, p.h)
          continue
        }

        // Telegram physics
        const effectT = Math.max(0, Math.min(0.35, time)) / 0.35
        const particleFrac = Math.max(0, Math.min(0.2, 0.1 + time - ((p.x - rect.left) / W) * 0.3)) / 0.2
        const gravX = 19.0 * (p.vx > 0 ? 1 : -1) * particleFrac
        const gravY = -65.0 * particleFrac

        p.vx += gravX * 0.016 * (1 - effectT)
        p.vy += gravY * 0.016
        p.vx *= 0.99
        p.vy *= 0.99

        p.x += p.vx * 0.016 * particleFrac
        p.y += p.vy * 0.016 * particleFrac
        p.rotation += p.rotSpeed * particleFrac
        p.life = Math.max(0, Math.min(0.55, time) / 0.55)

        if (p.life <= 0.01) continue

        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      } else {
        // Done — restore visibility in case component doesn't unmount
        el.style.visibility = origVisibility
        onComplete?.()
      }
    }

    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      el.style.visibility = origVisibility
      if (canvasRef.current) {
        canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
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
