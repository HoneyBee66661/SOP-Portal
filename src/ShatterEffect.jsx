import { useEffect, useRef } from 'react'
import domtoimage from 'dom-to-image-more'

/**
 * Telegram Thanos delete animation — ported to Canvas 2D.
 *
 * Based on Telegram Android's ThanosEffect.java + GLSL shaders:
 *   - Grid-based particle disintegration
 *   - Gravity: (19 * sign(vx), -65) * dp
 *   - Friction: 0.99 per frame
 *   - Duration ~0.6s (snapDuration)
 *   - Stagger left-to-right (uv.x offset)
 *   - Alpha fade out
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

    // Store original visibility to restore on cleanup
    const origVisibility = el.style.visibility

    // Capture the element as a PNG data URL (like Android's View → Bitmap)
    domtoimage.toPng(el, {
      quality: 1,
      bgColor: 'transparent',
      width: W,
      height: H,
      style: {
        transform: 'none',
        margin: '0',
        padding: '0',
      },
    }).then((dataUrl) => {
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
        // Set canvas to viewport size
        const cw = window.innerWidth
        const ch = window.innerHeight
        canvas.width = cw
        canvas.height = ch

        // Hide the original element (like setVisibility(View.GONE))
        el.style.visibility = 'hidden'

        // ── Grid configuration (matches Telegram's gridSize) ──
        const cols = 8
        const rows = 6
        const pw = W / cols
        const ph = H / rows

        // DP scale (like Android density)
        const dp = 1 // on web this is essentially 1

        const pieces = []

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            // Random direction (like Telegram: rand(uv) * 2 * PI)
            const angle = Math.random() * Math.PI * 2
            // Velocity magnitude based on Telegram's: (0.1 + rand * 0.1) * 260 * density
            const speed = (0.1 + Math.random() * 0.1) * 260 * dp
            const vx = Math.cos(angle) * speed
            const vy = Math.sin(angle) * speed

            // Stagger: particles start based on column position (uv.x in Telegram)
            // Telegram: particleFraction = max(0, min(0.2, 0.1 + time - uv.x * uvOffset)) / 0.2
            const staggerDelay = c / cols * 0.15

            pieces.push({
              sx: c * pw,
              sy: r * ph,
              sw: pw + 1, // +1 to avoid 1px gaps
              sh: ph + 1,
              dx: rect.left + c * pw,
              dy: rect.top + r * ph,
              dw: pw + 1,
              dh: ph + 1,
              vx,
              vy,
              rotation: 0,
              rotSpeed: (Math.random() - 0.5) * 16,
              life: 1,
              staggerDelay,
              started: false,
            })
          }
        }

        let frame
        const start = performance.now()
        // Telegram: snapDuration = 0.6
        const duration = 600

        const animate = (now) => {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)

          ctx.clearRect(0, 0, cw, ch)

          for (const p of pieces) {
            const particleTime = (elapsed - p.staggerDelay * 1000) / 1000

            if (particleTime <= 0) {
              // Not started yet — draw in original position
              ctx.drawImage(img, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh)
              continue
            }

            // ── Telegram physics (from vertex shader) ──
            // effectFraction = max(0, min(0.35, time)) / 0.35
            const effectT = Math.max(0, Math.min(0.35, particleTime)) / 0.35
            // particleFraction = max(0, min(0.2, 0.1 + time - uv.x * uvOffset)) / 0.2
            const particleFrac = Math.max(0, Math.min(0.2, 0.1 + particleTime - (p.sx / W) * 0.3)) / 0.2

            // Velocity updated with gravity + friction
            // Gravity: vec2(19.0 * sign(vx), -65.0) * dp * particleFraction
            const gravityX = 19.0 * (p.vx > 0 ? 1 : -1) * dp * particleFrac
            const gravityY = -65.0 * dp * particleFrac

            p.vx += gravityX * (1 - effectT) * 0.016
            p.vy += gravityY * 0.016
            p.vx *= 0.99 // velocityMult
            p.vy *= 0.99

            p.dx += p.vx * 0.016 * particleFrac
            p.dy += p.vy * 0.016 * particleFrac
            p.rotation += p.rotSpeed * particleFrac

            // Life / alpha: Telegram uses max(0, min(0.55, particleTime) / 0.55)
            p.life = Math.max(0, Math.min(0.55, particleTime) / 0.55)

            if (p.life <= 0.01) continue

            ctx.save()
            ctx.globalAlpha = p.life
            ctx.translate(p.dx + p.dw / 2, p.dy + p.dh / 2)
            ctx.rotate((p.rotation * Math.PI) / 180)
            ctx.drawImage(
              img,
              p.sx, p.sy, p.sw, p.sh,
              -p.dw / 2, -p.dh / 2, p.dw, p.dh
            )
            ctx.restore()
          }

          if (progress < 1) {
            frame = requestAnimationFrame(animate)
          } else {
            // Animation complete
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
        const ctx = c.getContext('2d')
        ctx?.clearRect(0, 0, c.width, c.height)
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
