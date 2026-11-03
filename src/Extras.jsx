import { useEffect, useRef, useState } from 'react'

const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const token = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()

// Hash corto estilo git (FNV-1a de 32 bits): no es criptográfico, solo identifica la nota.
export function hashCorto(s) {
  let h = 0x811c9dc5
  for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7)
}

// Acepta links de "Compartir > Copiar enlace de la canción", URIs spotify:track: o el id directo.
export function spotifyId(texto) {
  const t = texto.trim()
  return t.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?track\/([A-Za-z0-9]{22})/)?.[1]
    ?? t.match(/^spotify:track:([A-Za-z0-9]{22})$/)?.[1]
    ?? (/^[A-Za-z0-9]{22}$/.test(t) ? t : null)
}

export function Cancion({ id }) {
  return (
    <iframe className="spotify" title="Canción dedicada" loading="lazy" height="80"
      src={`https://open.spotify.com/embed/track/${id}?theme=0`}
      allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
  )
}

// Revelio: el mensaje llega cifrado en binario y se descifra letra por letra al entrar en pantalla.
export function Revelio({ texto }) {
  const ref = useRef(null)
  const [n, setN] = useState(() => (quieto() ? texto.length : 0))
  useEffect(() => {
    if (quieto()) return setN(texto.length)
    let id = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const paso = Math.max(1, Math.ceil(texto.length / 70))
      id = setInterval(() => setN((v) => {
        if (v + paso >= texto.length) { clearInterval(id); return texto.length }
        return v + paso
      }), 28)
    }, { threshold: 0.3 })
    io.observe(ref.current)
    return () => { io.disconnect(); clearInterval(id) }
  }, [texto])
  const resto = texto.slice(n).replace(/\S/g, () => (Math.random() < 0.5 ? '0' : '1'))
  return (
    <p ref={ref} aria-label={texto}>
      <span aria-hidden="true">{texto.slice(0, n)}<span className="cifrado">{resto}</span></span>
    </p>
  )
}

// Juego de la Vida de Conway: el texto aparece formado por células, luego evoluciona y se deshace.
export function Vida({ texto = 'FELIZ CUMPLE', color = '--tinta', alto = 140 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d')
    const celda = 6
    let cols = 0, filas = 0, grid = null, raf = 0, frame = 0, gen = 0, activo = true
    const tinta = token(color)

    const sembrar = () => {
      const o = document.createElement('canvas'); o.width = cols; o.height = filas
      const oc = o.getContext('2d')
      let fuente = Math.floor(filas * 0.78)
      oc.font = `700 ${fuente}px "JetBrains Mono", monospace`
      const ancho = oc.measureText(texto).width
      if (ancho > cols * 0.94) { fuente = Math.floor(fuente * cols * 0.94 / ancho); oc.font = `700 ${fuente}px "JetBrains Mono", monospace` }
      oc.textAlign = 'center'; oc.textBaseline = 'middle'; oc.fillText(texto, cols / 2, filas / 2 + 1)
      const px = oc.getImageData(0, 0, cols, filas).data
      grid = new Uint8Array(cols * filas)
      for (let i = 0; i < grid.length; i++) grid[i] = px[i * 4 + 3] > 110 ? 1 : 0
      gen = 0
    }
    const paso = () => {
      const sig = new Uint8Array(grid.length)
      for (let y = 0; y < filas; y++) for (let x = 0; x < cols; x++) {
        let v = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx || dy) v += grid[((y + dy + filas) % filas) * cols + ((x + dx + cols) % cols)]
        }
        const i = y * cols + x
        sig[i] = v === 3 || (v === 2 && grid[i]) ? 1 : 0
      }
      grid = sig; gen++
    }
    const pintar = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.fillStyle = tinta
      for (let i = 0; i < grid.length; i++) if (grid[i]) ctx.fillRect((i % cols) * celda, Math.floor(i / cols) * celda, celda - 1, celda - 1)
    }
    const ajustar = () => {
      const w = c.parentElement.clientWidth
      c.width = w * devicePixelRatio; c.height = alto * devicePixelRatio
      c.style.width = w + 'px'; c.style.height = alto + 'px'
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      cols = Math.floor(w / celda); filas = Math.floor(alto / celda)
      sembrar(); pintar()
    }
    // Texto quieto 3 s, 120 generaciones a 12 por segundo, y vuelve a empezar.
    const loop = () => {
      frame++
      if (activo && frame > 180 && frame % 5 === 0) {
        if (gen >= 120) { sembrar(); frame = 0 } else paso()
        pintar()
      }
      raf = requestAnimationFrame(loop)
    }
    ajustar()
    const ro = new ResizeObserver(ajustar); ro.observe(c.parentElement)
    const io = new IntersectionObserver(([e]) => { activo = e.isIntersecting }); io.observe(c)
    document.fonts?.ready.then(() => { sembrar(); pintar() })
    if (!quieto()) raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [texto, color, alto])
  return <div className="vida"><canvas ref={ref} aria-label={`Juego de la Vida formando el texto ${texto}`} role="img" /></div>
}

// Mapa del Merodeador: grafo de fuerzas con la Coordi al centro, las casas como nodos intermedios y cada alumno conectado a su casa.
const NOMBRE_CASA = { gryffindor: 'Gryffindor', hufflepuff: 'Hufflepuff', ravenclaw: 'Ravenclaw', slytherin: 'Slytherin', muggle: 'Sin casa' }

export function Grafo({ mensajes, alto = 460 }) {
  const ref = useRef(null)
  const nodos = useRef(new Map())
  const dims = useRef({ w: 600, h: alto })

  useEffect(() => {
    const m = nodos.current, { w, h } = dims.current
    const entrar = () => { const a = Math.random() * Math.PI * 2; return { x: w / 2 + Math.cos(a) * w, y: h / 2 + Math.sin(a) * h } }
    if (!m.has('centro')) m.set('centro', { x: w / 2, y: h / 2, vx: 0, vy: 0, tipo: 'centro', label: 'Coordi Fernanda' })
    for (const f of mensajes) {
      const casa = f.casa ?? 'muggle'
      if (!m.has(casa)) m.set(casa, { ...entrar(), vx: 0, vy: 0, tipo: 'casa', casa, padre: 'centro', label: NOMBRE_CASA[casa] })
      if (!m.has(f.id)) m.set(f.id, { ...entrar(), vx: 0, vy: 0, tipo: 'alumno', casa, padre: casa, label: f.autor })
    }
  }, [mensajes])

  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d')
    let raf = 0, activo = true
    const colores = { muggle: token('--tinta-suave') }
    for (const k of ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin']) colores[k] = token(`--${k}`)
    const tinta = token('--tinta'), lacre = token('--lacre'), oro = token('--oro')

    const ajustar = () => {
      const w = c.parentElement.clientWidth
      dims.current = { w, h: alto }
      c.width = w * devicePixelRatio; c.height = alto * devicePixelRatio
      c.style.width = w + 'px'; c.style.height = alto + 'px'
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    const simular = () => {
      const { w, h } = dims.current, lista = [...nodos.current.values()]
      const largo = { casa: Math.min(w, h) * 0.3, alumno: Math.min(w, h) * 0.15 }
      for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i], b = lista[j]
        const dx = b.x - a.x, dy = b.y - a.y, d2 = Math.max(dx * dx + dy * dy, 80), d = Math.sqrt(d2)
        const f = 900 / d2
        a.vx -= dx / d * f; a.vy -= dy / d * f; b.vx += dx / d * f; b.vy += dy / d * f
      }
      for (const n of lista) {
        if (!n.padre) continue
        const p = nodos.current.get(n.padre)
        const dx = p.x - n.x, dy = p.y - n.y, d = Math.hypot(dx, dy) || 1
        const f = (d - largo[n.tipo]) * 0.012
        n.vx += dx / d * f; n.vy += dy / d * f
        p.vx -= dx / d * f * 0.3; p.vy -= dy / d * f * 0.3
      }
      for (const n of lista) {
        if (n.tipo === 'centro') { n.x = w / 2; n.y = h / 2; n.vx = n.vy = 0; continue }
        n.vx *= 0.82; n.vy *= 0.82
        n.x = Math.min(w - 20, Math.max(20, n.x + n.vx)); n.y = Math.min(h - 20, Math.max(20, n.y + n.vy))
      }
    }
    const pintar = () => {
      const { w, h } = dims.current, lista = [...nodos.current.values()]
      ctx.clearRect(0, 0, w, h)
      ctx.setLineDash([3, 5]); ctx.lineWidth = 1.2; ctx.strokeStyle = tinta; ctx.globalAlpha = 0.35
      for (const n of lista) if (n.padre) {
        const p = nodos.current.get(n.padre)
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(n.x, n.y); ctx.stroke()
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.textAlign = 'center'
      for (const n of lista) {
        const r = n.tipo === 'centro' ? 16 : n.tipo === 'casa' ? 10 : 6
        if (n.tipo === 'centro') { ctx.shadowColor = oro; ctx.shadowBlur = 18 }
        ctx.fillStyle = n.tipo === 'centro' ? lacre : colores[n.casa]
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = oro; ctx.lineWidth = n.tipo === 'alumno' ? 1 : 2; ctx.stroke()
        ctx.fillStyle = tinta
        ctx.font = n.tipo === 'centro' ? '18px "Homemade Apple", cursive' : n.tipo === 'casa' ? '13px "IM Fell English SC", serif' : 'italic 13px "IM Fell English", serif'
        ctx.fillText(n.label.length > 18 ? n.label.slice(0, 17) + '…' : n.label, n.x, n.y - r - 6)
      }
    }
    const loop = () => { if (activo) { simular(); pintar() } raf = requestAnimationFrame(loop) }
    ajustar()
    const ro = new ResizeObserver(ajustar); ro.observe(c.parentElement)
    const io = new IntersectionObserver(([e]) => { activo = e.isIntersecting }); io.observe(c)
    // El grafo siempre simula: es el acomodo de los nodos, no una decoración, y se asienta en pocos segundos.
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [alto])

  return (
    <div className="grafo">
      <canvas ref={ref} role="img" aria-label={`Mapa con ${mensajes.length} alumnos conectados a la Coordi Fernanda por casa`} />
    </div>
  )
}

// Mensajes por generación (año de ingreso): una sola serie, barras verticales con el conteo encima.
export function Generaciones({ mensajes }) {
  const cuenta = {}
  for (const m of mensajes) if (m.generacion) cuenta[m.generacion] = (cuenta[m.generacion] ?? 0) + 1
  const anios = Object.keys(cuenta).sort()
  if (!anios.length) return <p className="sub">Cuando los alumnos digan su generación, aquí verás de qué año llegaron más mensajes.</p>
  const max = Math.max(...Object.values(cuenta))
  const ancho = 44, gap = 14, alto = 140, w = anios.length * (ancho + gap) + gap
  return (
    <div className="generaciones">
      <svg viewBox={`0 0 ${w} ${alto + 44}`} style={{ maxWidth: w * 1.4 }} role="img" aria-label="Mensajes por generación">
        <line x1="0" x2={w} y1={alto + 20} y2={alto + 20} className="eje" />
        {anios.map((a, i) => {
          const hb = Math.max(4, (cuenta[a] / max) * alto), x = gap + i * (ancho + gap), y = alto + 20 - hb
          return (
            <g key={a} className="barra">
              <title>{`Generación ${a}: ${cuenta[a]} ${cuenta[a] === 1 ? 'mensaje' : 'mensajes'}`}</title>
              <rect x={x - gap / 2} y="0" width={ancho + gap} height={alto + 44} fill="transparent" />
              <path d={`M${x} ${alto + 20} V${y + 4} Q${x} ${y} ${x + 4} ${y} H${x + ancho - 4} Q${x + ancho} ${y} ${x + ancho} ${y + 4} V${alto + 20} Z`} />
              <text x={x + ancho / 2} y={y - 6} className="valor">{cuenta[a]}</text>
              <text x={x + ancho / 2} y={alto + 38} className="anio">{a}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Vista alternativa del muro: los mensajes como un `git log --graph`.
export function GitLog({ mensajes, fecha }) {
  return (
    <div className="gitlog" role="list">
      <div className="prompt">alumnos@icc:~/coordi$ git log --graph --all</div>
      {mensajes.map((m, i) => (
        <div key={m.id} className="commit" role="listitem">
          <div><span className="grafo-l">*</span> <span className="hash">{hashCorto(`${m.id}${m.autor}${m.mensaje}`)}</span>
            {i === 0 && <span className="ref head"> (HEAD -&gt; main)</span>}
            {m.casa && <span className="ref" style={{ color: `var(--${m.casa}-claro)` }}> (casa/{m.casa})</span>}
          </div>
          <div><span className="grafo-l">|</span> Author: {m.autor}{m.generacion ? ` <gen-${m.generacion}@icc>` : ''}</div>
          <div><span className="grafo-l">|</span> Date:   {fecha.format(new Date(m.created_at))}</div>
          <div className="msg"><span className="grafo-l">|</span>{'\n'}{m.mensaje}</div>
          {m.spotify && <div><span className="grafo-l">|</span>     ♫ spotify:track:{m.spotify}</div>}
        </div>
      ))}
      {!mensajes.length && <div>fatal: your current branch 'main' does not have any commits yet</div>}
    </div>
  )
}

const PASTEL = String.raw`
          *    *    *
         _|____|____|_
        |  ~ ~ ~ ~ ~  |
        |    FELIZ    |
     ___|  CUMPLEAÑOS |___
    |   ~ ~ ~ ~ ~ ~ ~ ~   |
    |   COORDI FERNANDA   |
    |_____________________|
`
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

// Terminal escondida: se abre con el código Konami, escribiendo "sudo" fuera de un campo, o tocando 5 veces el escudo.
export function Terminal({ mensajes, abrirRef }) {
  const dlg = useRef(null), inp = useRef(null), fin = useRef(null)
  const [lineas, setLineas] = useState([])
  const [cmd, setCmd] = useState('')

  useEffect(() => {
    const abrir = () => {
      if (dlg.current.open) return
      setLineas(['Hogwarts OS 9¾ (ICC edition) — tty1', 'Escribe "help" para ver los hechizos disponibles.', ''])
      dlg.current.showModal(); setTimeout(() => inp.current?.focus(), 50)
    }
    abrirRef.current = abrir
    let buf = [], tecleado = ''
    const tecla = (e) => {
      if (e.target.closest('input, textarea, select, dialog')) return
      buf = [...buf, e.key].slice(-KONAMI.length)
      tecleado = (tecleado + (e.key.length === 1 ? e.key : '')).slice(-4)
      if (buf.join() === KONAMI.join() || tecleado === 'sudo') { buf = []; tecleado = ''; abrir() }
    }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }, [abrirRef])

  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [lineas])

  const ejecutar = (e) => {
    e.preventDefault()
    const c = cmd.trim()
    let out = []
    switch (c.replace(/\s+/g, ' ')) {
      case '': break
      case 'help': out = ['help                      esta ayuda', 'whoami                    quién eres', 'ls                        archivos del pergamino', 'cat carta.txt             la carta para la Coordi', 'git log                   últimos mensajes', 'sudo feliz-cumpleaños     ya sabes qué hace', 'lumos / nox               enciende o apaga la varita', 'clear / exit']; break
      case 'whoami': out = ['alumno de ICC, fan número 1 de la Coordi']; break
      case 'ls': out = ['carta.txt  mensajes/  pastel.ascii  playlist.m3u']; break
      case 'ls mensajes': case 'ls mensajes/': out = [`${mensajes.length} archivos`]; break
      case 'cat carta.txt': out = ['Querida Coordi Fernanda: gracias por resolver nuestros horarios imposibles', 'y por creer en nosotros. Hoy no se trabaja. Con cariño, tus alumnos.']; break
      case 'cat pastel.ascii': out = PASTEL.split('\n')
        break
      case 'git log': out = mensajes.slice(0, 5).map((m) => `${hashCorto(`${m.id}${m.autor}${m.mensaje}`)} ${m.autor}: ${m.mensaje.split('\n')[0].slice(0, 48)}`); if (!out.length) out = ['(sin commits todavía)']; break
      case 'sudo feliz-cumpleaños': case 'sudo feliz-cumpleanos': case 'sudo feliz cumpleaños':
        out = ['[sudo] contraseña para alumnos: ********', 'Permiso concedido.', ...PASTEL.split('\n'), '¡Feliz cumpleaños, Coordi Fernanda! ✦']
        for (let i = 0; i < 4; i++) setTimeout(() => dispatchEvent(new CustomEvent('chispas', { detail: { x: innerWidth * (0.2 + Math.random() * 0.6), y: innerHeight * (0.2 + Math.random() * 0.4) } })), i * 300)
        break
      case 'lumos': document.documentElement.classList.add('lumos'); out = ['✦ La punta de la varita se enciende.']; break
      case 'nox': document.documentElement.classList.remove('lumos'); out = ['La varita se apaga.']; break
      case 'clear': setLineas([]); setCmd(''); return
      case 'exit': dlg.current.close(); setCmd(''); return
      default: out = c.startsWith('sudo') ? ['alumnos no está en el archivo sudoers. Este incidente será reportado a la Coordi.'] : [`${c.split(' ')[0]}: comando no encontrado. Escribe "help".`]
    }
    setLineas((l) => [...l, `alumnos@icc:~/coordi$ ${c}`, ...out])
    setCmd('')
  }

  return (
    <dialog ref={dlg} className="terminal" aria-label="Terminal secreta" onClick={(e) => e.target === dlg.current ? dlg.current.close() : inp.current?.focus()}>
      <div className="term-barra"><span /><span /><span /><b>alumnos@icc: ~/coordi</b></div>
      <div className="term-cuerpo">
        {lineas.map((l, i) => <div key={i}>{l || ' '}</div>)}
        <form onSubmit={ejecutar} className="term-linea">
          <label htmlFor="term-cmd">alumnos@icc:~/coordi$</label>
          <input ref={inp} id="term-cmd" value={cmd} onChange={(e) => setCmd(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck="false" />
        </form>
        <div ref={fin} />
      </div>
    </dialog>
  )
}
