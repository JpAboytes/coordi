import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { Cielo, Esquinas, Huellas, Lechuza, Ornamento, Snitch, Varita } from './Decor.jsx'

const CASAS = [
  { id: 'gryffindor', nombre: 'Gryffindor', lema: 'Valentía' },
  { id: 'hufflepuff', nombre: 'Hufflepuff', lema: 'Lealtad' },
  { id: 'ravenclaw', nombre: 'Ravenclaw', lema: 'Ingenio' },
  { id: 'slytherin', nombre: 'Slytherin', lema: 'Ambición' },
]
const MAX = 1000
const fecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

export default function App() {
  const [mensajes, setMensajes] = useState(null)
  const [error, setError] = useState(false)
  const [nuevos, setNuevos] = useState(() => new Set())
  const [vuelo, setVuelo] = useState(0)
  const modalRef = useRef(null)
  const abrir = () => modalRef.current.showModal()
  // También se puede abrir directo con el link terminado en #proyectar.
  const [proyectando, setProyectando] = useState(() => location.hash === '#proyectar')
  const proyectar = () => { setProyectando(true); document.documentElement.requestFullscreen?.().catch(() => {}) }
  const salir = useCallback(() => { setProyectando(false); if (document.fullscreenElement) document.exitFullscreen() }, [])

  const agregar = (f) => {
    setMensajes((prev) => (prev?.some((m) => m.id === f.id) ? prev : [f, ...(prev ?? [])]))
    setNuevos((s) => new Set(s).add(f.id))
  }

  useEffect(() => {
    supabase.from('felicitaciones').select('id,autor,mensaje,casa,created_at').order('created_at', { ascending: false })
      .then(({ data, error }) => (error ? setError(true) : setMensajes(data)))
    const canal = supabase.channel('felicitaciones')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'felicitaciones' }, (p) => agregar(p.new))
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  return (
    <>
      <Cielo />
      <Snitch />
      <Varita />
      <Lechuza vuelo={vuelo} />
      {proyectando && <Proyeccion mensajes={mensajes ?? []} nuevos={nuevos} onSalir={salir} />}
      <main className="pergamino" hidden={proyectando}>
        <div className="rollo" aria-hidden="true" />
        <article className="hoja">
          <Esquinas />
          <Portada onEscribir={abrir} />
          <Ornamento />
          <Muro mensajes={mensajes} error={error} nuevos={nuevos} onEscribir={abrir} />
          <Huellas />
          <CopaDeLasCasas mensajes={mensajes ?? []} />
          <Ornamento />
          <Carta />
          <footer className="cierre">
            <p className="mano">Con muchísimo cariño,</p>
            <p className="alumnos">Tus alumnos</p>
            <p className="travesura">Travesura realizada.</p>
          </footer>
        </article>
        <div className="rollo" aria-hidden="true" />
      </main>
      {!proyectando && (
        <div className="flotantes">
          <button className="pluma-flotante secundario" type="button" onClick={proyectar}>
            <Pantalla /> Proyectar
          </button>
          <button className="pluma-flotante" type="button" onClick={abrir}>
            <Pluma /> Escribir felicitación
          </button>
        </div>
      )}
      <dialog ref={modalRef} className="modal" aria-labelledby="t-escribir" onClick={(e) => e.target === modalRef.current && modalRef.current.close()}>
        <div className="modal-hoja">
          <button className="cerrar" type="button" aria-label="Cerrar" onClick={() => modalRef.current.close()}>×</button>
          <Formulario onEnviado={(f) => {
            agregar(f); modalRef.current.close(); setVuelo((v) => v + 1)
            // Espera a que React pinte la nota nueva antes de buscarla.
            setTimeout(() => {
              const nota = document.querySelector(`[data-id="${f.id}"]`)
              nota?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              setTimeout(() => {
                const r = nota?.getBoundingClientRect()
                dispatchEvent(new CustomEvent('chispas', { detail: r ? { x: r.left + r.width / 2, y: r.top + 20 } : { x: innerWidth / 2, y: innerHeight / 2 } }))
              }, 700)
            }, 50)
          }} />
        </div>
      </dialog>
    </>
  )
}

function Pluma() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M20 3 C12 4 7 9 5 17 L4 21 L7 19 C15 17 19 11 20 3 Z M5 17 L12 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Pantalla() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M3 5 H21 V16 H3 Z M9 20 H15 M12 16 V20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// Vista para proyector: todas las notas en pantalla completa, con desplazamiento automático lento.
function Proyeccion({ mensajes, nuevos, onSalir }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    let raf = 0, pausa = 240, y = 0
    const loop = () => {
      if (pausa > 0) pausa--
      else if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) { pausa = 360; y = 0; el.scrollTo({ top: 0, behavior: 'smooth' }) }
      else { y += 0.5; el.scrollTop = y; if (Math.abs(el.scrollTop - y) > 2) y = el.scrollTop }
      raf = requestAnimationFrame(loop)
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(loop)
    const tecla = (e) => e.key === 'Escape' && !document.fullscreenElement && onSalir()
    addEventListener('keydown', tecla)
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', tecla) }
  }, [onSalir])

  return (
    <section className="proyeccion" ref={ref} aria-label="Mensajes en pantalla completa">
      <header className="proy-cabecera">
        <span className="eyebrow">Con cariño, de tus alumnos</span>
        <h1><span className="tinta">Feliz Cumpleaños</span><span className="nombre">Coordi Fernanda Millán</span></h1>
        <p className="cuenta">{mensajes.length} {mensajes.length === 1 ? 'mensaje' : 'mensajes'} · escribe el tuyo en <strong>{location.host}</strong></p>
      </header>
      <div className="muro proy-muro">
        {mensajes.map((m) => (
          <article key={m.id} className={`nota${nuevos.has(m.id) ? ' nueva' : ''}`}
            style={{ '--r': `${((m.id * 37) % 5 - 2) * 0.7}deg`, ...(m.casa && { '--c': `var(--${m.casa})` }) }}>
            {m.casa && <span className="lacre" aria-label={`Casa ${m.casa}`} />}
            <p>{m.mensaje}</p>
            <footer><span className="autor">— {m.autor}</span></footer>
          </article>
        ))}
      </div>
      <button className="proy-salir" type="button" onClick={onSalir}>Salir de la proyección</button>
    </section>
  )
}

function Portada({ onEscribir }) {
  return (
    <header className="portada">
      <Escudo />
      <span className="eyebrow">Colegio de Magia y Hechicería · Coordinación de Carrera</span>
      <h1>
        <span className="tinta">Feliz Cumpleaños</span>
        <span className="nombre">Coordi Fernanda Millán</span>
      </h1>
      <div className="liston"><span>Con cariño, de tus alumnos</span></div>
      <button className="boton-escribir" type="button" onClick={onEscribir}><Pluma /> Escribir mi felicitación</button>
    </header>
  )
}

function Escudo() {
  return (
    <svg className="escudo" viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <clipPath id="escudo-forma"><path d="M60 6 L110 20 V64 C110 100 88 124 60 134 C32 124 10 100 10 64 V20 Z" /></clipPath>
      </defs>
      <g clipPath="url(#escudo-forma)">
        <rect x="0" y="0" width="60" height="70" fill="var(--gryffindor)" />
        <rect x="60" y="0" width="60" height="70" fill="var(--slytherin)" />
        <rect x="0" y="70" width="60" height="70" fill="var(--hufflepuff)" />
        <rect x="60" y="70" width="60" height="70" fill="var(--ravenclaw)" />
      </g>
      <path d="M60 6 L110 20 V64 C110 100 88 124 60 134 C32 124 10 100 10 64 V20 Z" fill="none" stroke="var(--oro)" strokeWidth="4" />
      <path d="M60 6 V134 M10 70 H110" stroke="var(--oro)" strokeWidth="3" />
      <circle cx="60" cy="70" r="16" fill="var(--papel)" stroke="var(--oro)" strokeWidth="3" />
      <text x="60" y="78" textAnchor="middle" fontFamily="Cinzel Decorative, serif" fontSize="22" fill="var(--tinta)">F</text>
    </svg>
  )
}

function Carta() {
  return (
    <section className="carta">
      <p className="capitular">
        Querida Coordi Fernanda: por medio de la presente, sus alumnos le informamos que ha sido nombrada, por votación unánime,
        la mejor coordinadora de carrera de todo el colegio. Gracias por resolver nuestros horarios imposibles, por escucharnos en los
        semestres difíciles y por creer en nosotros incluso antes de que nosotros lo hiciéramos.
      </p>
      <p>Para celebrar su cumpleaños, le adjuntamos la lista oficial de materiales:</p>
      <ul className="materiales">
        <li>Un pastel enorme, sin calorías por arte de magia</li>
        <li>Una taza de cerveza de mantequilla, bien espumosa</li>
        <li>Un día completo sin correos ni trámites</li>
        <li>Muchos abrazos de sus alumnos (cantidad ilimitada)</li>
      </ul>
      <p>Se le recuerda que está estrictamente prohibido trabajar el día de hoy. Abajo encontrará los mensajes que cada uno de nosotros escribió para usted.</p>
    </section>
  )
}

function CopaDeLasCasas({ mensajes }) {
  const cuenta = Object.fromEntries(CASAS.map((c) => [c.id, mensajes.filter((m) => m.casa === c.id).length]))
  const max = Math.max(1, ...Object.values(cuenta))
  return (
    <section className="copa" aria-labelledby="t-copa">
      <h2 id="t-copa">Copa de las Casas</h2>
      <p className="sub">Cada mensaje suma un punto para tu casa. ¿Qué casa quiere más a la Coordi?</p>
      <div className="relojes">
        {CASAS.map((c) => {
          const lleno = cuenta[c.id] / max
          return (
            <figure key={c.id} className="reloj" style={{ '--c': `var(--${c.id})` }}>
              <svg viewBox="0 0 60 110" aria-hidden="true">
                <defs>
                  <clipPath id={`vidrio-${c.id}`}><path d="M10 8 H50 C50 34 34 46 32 55 C34 64 50 76 50 102 H10 C10 76 26 64 28 55 C26 46 10 34 10 8 Z" /></clipPath>
                </defs>
                <g clipPath={`url(#vidrio-${c.id})`}>
                  <rect x="0" y="8" width="60" height="47" className="gemas arriba" style={{ transform: `scaleY(${1 - lleno})` }} />
                  <rect x="0" y={102 - 47 * lleno} width="60" height={47 * lleno} className="gemas" />
                </g>
                <path d="M10 8 H50 C50 34 34 46 32 55 C34 64 50 76 50 102 H10 C10 76 26 64 28 55 C26 46 10 34 10 8 Z" fill="none" stroke="var(--oro)" strokeWidth="2" />
                <rect x="4" y="2" width="52" height="7" rx="2" fill="var(--madera)" />
                <rect x="4" y="101" width="52" height="7" rx="2" fill="var(--madera)" />
              </svg>
              <figcaption>
                <strong>{cuenta[c.id]}</strong>
                <span>{c.nombre}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

function Formulario({ onEnviado }) {
  const [autor, setAutor] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [casa, setCasa] = useState(null)
  const [estado, setEstado] = useState({ texto: '', error: false })
  const [enviando, setEnviando] = useState(false)
  const autorRef = useRef(null), mensajeRef = useRef(null)

  const enviar = async (e) => {
    e.preventDefault()
    if (!autor.trim()) { setEstado({ texto: 'Escribe tu nombre para firmar el mensaje.', error: true }); autorRef.current.focus(); return }
    if (!mensaje.trim()) { setEstado({ texto: 'El mensaje está vacío. Escribe unas palabras para la Coordi.', error: true }); mensajeRef.current.focus(); return }
    setEnviando(true)
    setEstado({ texto: 'Sellando con lacre...', error: false })
    const { data, error } = await supabase.from('felicitaciones')
      .insert({ autor: autor.trim(), mensaje: mensaje.trim(), casa })
      .select('id,autor,mensaje,casa,created_at').single()
    setEnviando(false)
    if (error) { setEstado({ texto: 'La lechuza no pudo salir. Revisa tu conexión e inténtalo otra vez.', error: true }); return }
    setAutor(''); setMensaje(''); setCasa(null)
    setEstado({ texto: '', error: false })
    onEnviado(data)
  }

  return (
    <section aria-labelledby="t-escribir">
      <h2 id="t-escribir">Escribe tu felicitación</h2>
      <p className="sub">Moja la pluma, firma con tu nombre y elige tu casa. Tu mensaje aparecerá en el pergamino al instante.</p>
      <form className="formulario" onSubmit={enviar} noValidate>
        <label htmlFor="autor">Tu nombre
          <input ref={autorRef} id="autor" type="text" maxLength={60} autoComplete="name" value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Tu nombre y semestre, si quieres" />
        </label>
        <label htmlFor="mensaje">Tu mensaje
          <textarea ref={mensajeRef} id="mensaje" maxLength={MAX} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Feliz cumpleaños, Coordi..." />
        </label>
        <div className="contador">{mensaje.length} / {MAX}</div>
        <fieldset>
          <legend>Tu casa (opcional)</legend>
          <div className="casas">
            {CASAS.map((c) => (
              <span key={c.id} style={{ '--c': `var(--${c.id})` }}>
                <input type="radio" name="casa" id={`c-${c.id}`} checked={casa === c.id} onChange={() => setCasa(c.id)} />
                <label htmlFor={`c-${c.id}`}>{c.nombre}<small>{c.lema}</small></label>
              </span>
            ))}
          </div>
        </fieldset>
        <div className="acciones">
          <button className="sello" type="submit" disabled={enviando}>
            <span>Sellar<br />y enviar</span>
          </button>
        </div>
        <p className={`estado${estado.error ? ' error' : ''}`} role="status" aria-live="polite">{estado.texto}</p>
      </form>
    </section>
  )
}

function Muro({ mensajes, error, nuevos, onEscribir }) {
  return (
    <section aria-labelledby="t-muro">
      <h2 id="t-muro">Mensajes para la Coordi</h2>
      {mensajes?.length > 0 && <p className="cuenta">{mensajes.length} {mensajes.length === 1 ? 'mensaje recibido' : 'mensajes recibidos'}</p>}
      {error && <p className="vacio">No se pudo abrir el pergamino. Revisa tu conexión y recarga la página.</p>}
      {!error && mensajes === null && <p className="vacio">Abriendo el pergamino...</p>}
      {mensajes?.length === 0 && (
        <div className="vacio">
          <p>El pergamino aún está en blanco. Sé el primer alumno en escribir.</p>
          <button className="boton-escribir" type="button" onClick={onEscribir}><Pluma /> Escribir la primera</button>
        </div>
      )}
      <div className="muro">
        {mensajes?.map((m) => (
          <article key={m.id} data-id={m.id} className={`nota${nuevos.has(m.id) ? ' nueva' : ''}`}
            style={{ '--r': `${((m.id * 37) % 5 - 2) * 0.7}deg`, ...(m.casa && { '--c': `var(--${m.casa})` }) }}>
            {m.casa && <span className="lacre" title={m.casa} aria-label={`Casa ${m.casa}`} />}
            <p>{m.mensaje}</p>
            <footer>
              <span className="autor">— {m.autor}</span>
              <time dateTime={m.created_at}>{fecha.format(new Date(m.created_at))}</time>
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}
