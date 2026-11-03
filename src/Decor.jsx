import { useEffect, useMemo, useRef } from 'react'

const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Cielo() {
  const estrellas = useMemo(() => Array.from({ length: 70 }, () => ({
    left: Math.random() * 100, top: Math.random() * 100,
    size: Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1,
    delay: -Math.random() * 5,
  })), [])
  const velas = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    left: i * 9 + Math.random() * 5, top: 3 + Math.random() * 30,
    delay: -Math.random() * 7, alto: 34 + Math.random() * 22, opacidad: 0.5 + Math.random() * 0.5,
  })), [])
  return (
    <div className="cielo" aria-hidden="true">
      {estrellas.map((e, i) => (
        <span key={i} className="estrella" style={{ left: `${e.left}%`, top: `${e.top}%`, width: e.size, height: e.size, animationDelay: `${e.delay}s` }} />
      ))}
      {velas.map((v, i) => (
        <span key={i} className="vela" style={{ left: `${v.left}%`, top: `${v.top}%`, height: v.alto, opacity: v.opacidad, animationDelay: `${v.delay}s` }} />
      ))}
      <svg className="castillo" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 220 V170 L60 150 L120 165 L180 130 L260 150 L300 120 V90 L310 70 L320 90 V120 L360 120 V60 L372 30 L384 60 V120 L420 125 L470 100 V70 L480 50 L490 70 V100 L540 110 V40 L556 0 L572 40 V110 L620 105 V75 L632 55 L644 75 V105 L700 115 V80 L712 60 L724 80 V115 L780 125 L840 110 L900 140 L980 125 L1060 150 L1120 140 L1200 160 V220 Z" />
        {[[366, 80], [548, 60], [562, 85], [480, 80], [632, 85], [712, 90]].map(([x, y], i) => (
          <rect key={i} className="ventana" x={x} y={y} width="5" height="9" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
      </svg>
    </div>
  )
}

// Rastro de chispas que sigue al cursor, como una varita. También escucha el evento `chispas` para lanzar ráfagas.
export function Varita() {
  const ref = useRef(null)
  useEffect(() => {
    if (quieto()) return
    const c = ref.current, ctx = c.getContext('2d')
    const ps = []
    let raf = 0
    const ajustar = () => { c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0) }
    ajustar()
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.vida -= 0.018
        if (p.vida <= 0) { ps.splice(i, 1); continue }
        ctx.globalAlpha = p.vida
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.vida, 0, Math.PI * 2); ctx.fill()
      }
      raf = ps.length ? requestAnimationFrame(loop) : 0
    }
    const soltar = (x, y, n, fuerza) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = Math.random() * fuerza
        ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - fuerza * 0.3, r: 1.5 + Math.random() * 2.5, vida: 1, color: Math.random() < 0.7 ? '#ffd879' : '#fff4d6' })
      }
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const mover = (e) => { if (e.pointerType === 'mouse') soltar(e.clientX, e.clientY, 2, 1.2) }
    const rafaga = (e) => soltar(e.detail.x, e.detail.y, 90, 6)
    addEventListener('pointermove', mover)
    addEventListener('chispas', rafaga)
    addEventListener('resize', ajustar)
    return () => { removeEventListener('pointermove', mover); removeEventListener('chispas', rafaga); removeEventListener('resize', ajustar); cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={ref} className="varita" aria-hidden="true" />
}

// Una pelotita dorada alada que revolotea por la pantalla.
export function Snitch() {
  const ref = useRef(null)
  useEffect(() => {
    if (quieto()) return
    let x = innerWidth * 0.8, y = innerHeight * 0.2, tx = x, ty = y, raf = 0, t = 0
    const nuevo = () => { tx = 40 + Math.random() * (innerWidth - 80); ty = 40 + Math.random() * (innerHeight * 0.7) }
    const loop = () => {
      t++
      if (t % 140 === 0 || Math.hypot(tx - x, ty - y) < 20) nuevo()
      x += (tx - x) * 0.025; y += (ty - y) * 0.025 + Math.sin(t / 8) * 0.8
      if (ref.current) ref.current.style.transform = `translate(${x}px, ${y}px) rotate(${(tx - x) * 0.05}deg)`
      raf = requestAnimationFrame(loop)
    }
    nuevo(); loop()
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <svg ref={ref} className="snitch" viewBox="0 0 80 40" aria-hidden="true">
      <path className="ala izq" d="M30 20 C18 6 4 4 0 8 C8 12 14 18 30 22 Z" />
      <path className="ala der" d="M50 20 C62 6 76 4 80 8 C72 12 66 18 50 22 Z" />
      <circle cx="40" cy="21" r="9" fill="url(#oro)" />
      <path d="M33 18 Q40 14 47 18 M33 24 Q40 28 47 24" stroke="#8a6416" strokeWidth="0.8" fill="none" />
      <defs>
        <radialGradient id="oro" cx="35%" cy="30%"><stop offset="0" stopColor="#fff2b0" /><stop offset=".5" stopColor="#e6b43c" /><stop offset="1" stopColor="#8a6416" /></radialGradient>
      </defs>
    </svg>
  )
}

export function Esquinas() {
  const adorno = (
    <svg viewBox="0 0 90 90">
      <path d="M4 86 V30 C4 14 14 4 30 4 H86" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 86 V36 C12 22 22 12 36 12 H86" fill="none" stroke="currentColor" strokeWidth=".8" />
      <path d="M22 22 C34 24 38 36 30 40 C24 42 20 36 26 32 M22 22 C24 34 36 38 40 30 C42 24 36 20 32 26" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="22" cy="22" r="3" fill="currentColor" />
      <path d="M50 8 L54 4 L58 8 L54 12 Z M8 50 L4 54 L8 58 L12 54 Z" fill="currentColor" />
    </svg>
  )
  return ['tl', 'tr', 'bl', 'br'].map((p) => <span key={p} className={`esquina ${p}`} aria-hidden="true">{adorno}</span>)
}

export function Ornamento() {
  return (
    <svg className="ornamento" viewBox="0 0 320 24" aria-hidden="true">
      <path d="M0 12 H118 M202 12 H320" stroke="currentColor" />
      <path d="M118 12 C128 2 136 2 142 12 C136 22 128 22 118 12 Z M202 12 C192 2 184 2 178 12 C184 22 192 22 202 12 Z" fill="none" stroke="currentColor" />
      <path d="M160 2 L170 12 L160 22 L150 12 Z" fill="currentColor" />
      <circle cx="160" cy="12" r="2.5" fill="var(--papel)" />
    </svg>
  )
}

// Huellas que caminan por el pergamino hasta el nombre, como en un mapa encantado.
export function Huellas() {
  const pasos = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const x = 20 + i * 36
    const y = 40 + Math.sin(i / 2.2) * 14 + (i % 2 ? 7 : -7)
    return { x, y, izq: i % 2 === 0, delay: i * 0.35 }
  }), [])
  return (
    <div className="huellas" aria-hidden="true">
      <svg viewBox="0 0 620 80">
        {pasos.map((p, i) => (
          <g key={i} className="paso" transform={`translate(${p.x} ${p.y}) rotate(${p.izq ? 80 : 100}) scale(${p.izq ? 1 : -1} 1)`} style={{ animationDelay: `${p.delay}s` }}>
            <ellipse cx="0" cy="0" rx="4" ry="7" />
            <ellipse cx="0" cy="11" rx="3" ry="4" />
          </g>
        ))}
      </svg>
      <span className="etiqueta">Coordi Fernanda Millán</span>
    </div>
  )
}

export function Lechuza({ vuelo }) {
  if (!vuelo) return null
  return (
    <svg key={vuelo} className="lechuza" viewBox="0 0 64 64" aria-hidden="true">
      <path className="alas" d="M18 34 Q0 18 4 46 Q14 40 20 44 Z M46 34 Q64 18 60 46 Q50 40 44 44 Z" fill="#6e5234" />
      <ellipse cx="32" cy="36" rx="14" ry="18" fill="#8a6a45" />
      <path d="M22 20 L24 14 L28 19 M42 20 L40 14 L36 19" fill="#8a6a45" />
      <circle cx="26" cy="28" r="5" fill="#f3e3c0" /><circle cx="38" cy="28" r="5" fill="#f3e3c0" />
      <circle cx="26" cy="28" r="2.2" fill="#1d140d" /><circle cx="38" cy="28" r="2.2" fill="#1d140d" />
      <path d="M30 33 L32 37 L34 33 Z" fill="#c9a14a" />
      <rect x="25" y="50" width="14" height="9" fill="#ecd9ae" stroke="#8e1b1b" />
      <circle cx="32" cy="54.5" r="2" fill="#8e1b1b" />
    </svg>
  )
}
