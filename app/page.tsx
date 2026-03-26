'use client'

import { useState, useEffect, useCallback } from 'react'

type MatchRaw = Record<string, unknown>
interface ApiResponse {
  matches?: MatchRaw[]
  raw?: unknown
  endpoint?: string
  count?: number
  error?: string
  date?: string
}

function normalize(m: MatchRaw) {
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  return {
    time:        str(m.time)        || '??:??',
    home:        str(m.home)        || '—',
    away:        str(m.away)        || '—',
    homeBadge:   str(m.homeBadge),
    awayBadge:   str(m.awayBadge),
    competition: str(m.competition) || '',
    channels:    Array.isArray(m.channels) ? (m.channels as { name: string; image: string }[]) : [],
  }
}

function chColor(name: string) {
  const n = name.toLowerCase()
  if (n.includes('dazn'))                              return { bg: '#fff8e1', text: '#b8860b', border: '#f0c040' }
  if (n.includes('movistar') || n.includes('laliga')) return { bg: '#e8f0fe', text: '#1a56db', border: '#3f83f8' }
  if (n.includes('gol'))                              return { bg: '#fde8e8', text: '#c81e1e', border: '#f05252' }
  if (n.includes('teledeporte') || n.includes('tdp')) return { bg: '#fde8e8', text: '#c81e1e', border: '#f05252' }
  if (n.includes('la 1') || n.includes('la1') || n.includes('tve')) return { bg: '#ebf5fb', text: '#1a56db', border: '#3f83f8' }
  if (n.includes('antena'))                           return { bg: '#fff3e0', text: '#c05621', border: '#ed8936' }
  if (n.includes('rtve') || n.includes('rtve play'))  return { bg: '#fde8e8', text: '#c81e1e', border: '#f05252' }
  if (n.includes('vamos'))                            return { bg: '#e6fffa', text: '#047481', border: '#0d9488' }
  if (n.includes('uefa') || n.includes('champions'))  return { bg: '#ede9fe', text: '#5521b5', border: '#7e3af2' }
  return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
}

function pad(n: number) { return String(n).padStart(2, '0') }

function toMadridDate(isoStr: unknown): string {
  if (!isoStr || typeof isoStr !== 'string') return ''
  return new Date(isoStr).toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/').reverse().join('-') // DD/MM/YYYY → YYYY-MM-DD
}

function formatShortDate(isoStr: unknown): string {
  if (!isoStr || typeof isoStr !== 'string') return ''
  return new Date(isoStr).toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short'
  })
}

function formatDayHeader(dateStr: string): string {
  const today = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')
  const label = dateStr === today ? 'Hoy' : dateStr === tomorrow ? 'Mañana' : ''
  const formatted = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return label ? `${label} · ${formatted}` : formatted
}
function nowStr() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
function isPast(time: string) { return time !== '??:??' && time < nowStr() }

const MD = {
  red: '#CC0000', redLight: '#fde8e8', yellow: '#FFD700',
  black: '#1a1a1a', darkGray: '#333', gray: '#666',
  lightGray: '#f7f7f7', border: '#e5e5e5', white: '#fff',
}

function Badge({ src, alt }: { src: string; alt: string }) {
  if (!src) return null
  return (
    <img src={src} alt={alt} width={20} height={20}
      style={{ objectFit: 'contain', flexShrink: 0, display: 'inline-block' }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

export default function GuiaFutbolMD() {
  const [data, setData]       = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [clock, setClock]     = useState(nowStr())
  const [filter, setFilter]   = useState('all')
  const [rawMode, setRawMode] = useState(false)
  const [compFilter, setCompFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const t = setInterval(() => setClock(nowStr()), 30000)
    return () => clearInterval(t)
  }, [])

  const resetAll = () => {
    setFilter('all')
    setCompFilter('')
    setTeamFilter('')
    setSelectedDate('')
    load()
  }

  const load = useCallback(async (date?: string) => {
    setLoading(true); setError('')
    if (date) setSelectedDate(date)
    try {
      const res = await fetch(date ? `/api/matches?date=${date}` : '/api/matches')
      const json: ApiResponse = await res.json()
      setData(json)
      if (json.error) setError(json.error)
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const dateStr  = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const matches = data?.matches || []
  const competitions = Array.from(new Set(matches.map(m => String(m.competition || '')))).filter(Boolean).sort() as string[]
  const teams = Array.from(new Set(matches.reduce(function(acc: string[], m){ return acc.concat([String(m.home||''), String(m.away||'')]); }, [] as string[]))).filter(Boolean).sort()
  const FREE_KW = ['gol', 'la 1', 'la1', 'teledeporte', 'tdp', 'antena', 'lasexta', 'cuatro', 'telecinco', 'tve', 'rtve']
  const filtered = matches.filter(m => {
    const n = normalize(m)
    if (filter === 'free') return n.channels.some(c => FREE_KW.some(k => c.name.toLowerCase().includes(k)))
    if (filter === 'pay')  return n.channels.some(c => ['dazn', 'movistar', 'laliga', 'vamos', 'ppv'].some(k => c.name.toLowerCase().includes(k)))
    return true
  }).filter(m => {
    const n = normalize(m)
    if (compFilter && n.competition !== compFilter) return false
    if (teamFilter && n.home !== teamFilter && n.away !== teamFilter) return false
    return true
  })
  const grouped: Record<string, MatchRaw[]> = {}
  filtered.forEach(m => {
    const key = normalize(m).competition || 'Otros'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  })

  const tabBtn = (active: boolean): React.CSSProperties => ({
    background: active ? MD.red : MD.white,
    color: active ? MD.white : MD.darkGray,
    border: `1px solid ${active ? MD.red : MD.border}`,
    borderRadius: 2, padding: '6px 14px', cursor: 'pointer',
    fontWeight: active ? 700 : 500, fontSize: 12,
    letterSpacing: 0.3, textTransform: 'uppercase',
    fontFamily: 'inherit', transition: 'all .15s',
  })

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: MD.white, color: MD.black, minHeight: '100vh' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: #fff; }

        .match-row {
          display: grid;
          grid-template-columns: 56px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid ${MD.border};
          border-left: 3px solid ${MD.red};
          background: ${MD.white};
        }
        .match-row.past {
          opacity: 0.55;
          border-left: 3px solid transparent;
          background: ${MD.lightGray};
        }
        .match-teams {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          overflow: hidden;
        }
        .match-name {
          font-weight: 700;
          font-size: 14px;
          color: ${MD.black};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .match-name span { color: ${MD.gray}; font-weight: 400; font-size: 12px; margin: 0 4px; }
        .match-comp {
          font-size: 11px;
          color: ${MD.gray};
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .match-channels {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: center;
        }
        .ch-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 2px;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-width: 1px;
          border-style: solid;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .match-row {
            grid-template-columns: 46px 1fr;
            grid-template-rows: auto auto;
          }
          .match-channels {
            grid-column: 2;
            justify-content: flex-start;
            margin-top: 4px;
          }
          .match-name { font-size: 13px; }
          .ch-tag { font-size: 9px; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: `3px solid ${MD.red}` }}>
        <div style={{ background: '#111', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 4, height: 24, background: MD.red, transform: 'skewX(-12deg)', marginRight: 8 }} />
            <span style={{ fontWeight: 900, fontSize: 18, color: MD.white, letterSpacing: -0.5, fontStyle: 'italic', fontFamily: "'Arial Black', Arial, sans-serif" }}>MUNDO</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: MD.yellow, letterSpacing: -0.5, fontStyle: 'italic', fontFamily: "'Arial Black', Arial, sans-serif" }}>DEPORTIVO</span>
          </div>
          <div style={{ fontSize: 11, color: '#aaa', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: MD.red, display: 'inline-block' }} />
            EN DIRECTO · {clock}
          </div>
        </div>
        <div style={{ padding: '10px 16px 10px', background: MD.white }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MD.red, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>⚽ Fútbol · Guía TV</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: MD.black, lineHeight: 1.2, fontStyle: 'italic' }}>Fútbol en la TV hoy en España</h1>
          <p style={{ fontSize: 12, color: MD.gray, marginTop: 3, textTransform: 'capitalize' }}>{dateStr}</p>
        </div>
      </div>

      {/* CONTROLES */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${MD.border}`, background: MD.lightGray, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(Date.now() + i * 86400000).toISOString().split('T')[0]
            const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
            return <button key={d} onClick={() => load(d)} style={tabBtn(selectedDate === d)}>{label}</button>
          })}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={resetAll}
            style={tabBtn(filter === 'all' && !compFilter && !teamFilter)}
          >Todos</button>
          {(['free','pay'] as const).map(v => {
            const L = { free: 'En abierto', pay: 'De pago' }
            return <button key={v} onClick={() => setFilter(v)} style={tabBtn(filter === v)}>{L[v]}</button>
          })}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={compFilter} onChange={e => { setCompFilter(e.target.value); setTeamFilter('') }}
            style={{ fontSize: 11, padding: '5px 8px', border: `1px solid ${MD.border}`, borderRadius: 2, background: MD.white, color: MD.darkGray, cursor: 'pointer', maxWidth: 180 }}>
            <option value="">Competición</option>
            {competitions.map(comp => <option key={comp} value={comp}>{comp}</option>)}
          </select>
          <select value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setCompFilter('') }}
            style={{ fontSize: 11, padding: '5px 8px', border: `1px solid ${MD.border}`, borderRadius: 2, background: MD.white, color: MD.darkGray, cursor: 'pointer', maxWidth: 180 }}>
            <option value="">Equipo</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(compFilter || teamFilter) && (
            <button onClick={() => { setCompFilter(''); setTeamFilter('') }}
              style={{ fontSize: 11, padding: '5px 8px', border: `1px solid ${MD.red}`, borderRadius: 2, background: MD.redLight, color: MD.red, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕ Limpiar
            </button>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: MD.gray }}>{filtered.length} partido{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={() => load()} style={{ ...tabBtn(false), padding: '6px 10px' }} title="Actualizar">↻</button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ padding: '12px 16px 48px', maxWidth: 900, margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: MD.gray }}>
            <div style={{ fontSize: 22, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</div>
            <p style={{ marginTop: 10, fontSize: 13 }}>Cargando partidos...</p>
          </div>
        )}

        {(!!error && !loading) && (
          <div style={{ padding: '16px', margin: '16px 0', background: MD.redLight, borderLeft: `4px solid ${MD.red}` }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: MD.red, marginBottom: 4 }}>⚠️ Error al conectar con la API</p>
            <p style={{ fontSize: 12, color: MD.darkGray }}>{error}</p>
          </div>
        )}

        {(data?.raw !== undefined && !loading) && (
          <div style={{ padding: '16px', margin: '16px 0', background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>⚠️ Formato inesperado — endpoint: <code>{data.endpoint}</code></p>
            <button onClick={() => setRawMode(!rawMode)} style={{ fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid #d97706', borderRadius: 2, padding: '3px 8px', color: '#92400e' }}>
              {rawMode ? 'Ocultar' : 'Ver'} respuesta raw
            </button>
            {rawMode && <pre style={{ fontSize: 10, marginTop: 10, overflow: 'auto', maxHeight: 300 }}>{JSON.stringify(data.raw, null, 2)}</pre>}
          </div>
        )}

        {(!loading && !error && matches.length === 0 && data?.raw === undefined) && (
          <div style={{ textAlign: 'center', padding: '48px', color: MD.gray }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📅</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: MD.darkGray, marginBottom: 4 }}>No hay partidos televisados hoy</p>
            <p style={{ fontSize: 13 }}>Consulta la programación de mañana</p>
          </div>
        )}

        {(!loading && !error && Object.entries(grouped).length > 0) && (() => {
          // Agrupar partidos por día local
          const byDay: Record<string, MatchRaw[]> = {}
          filtered.forEach(m => {
            const day = toMadridDate(m.date) || 'Sin fecha'
            if (!byDay[day]) byDay[day] = []
            byDay[day].push(m)
          })
          const days = Object.keys(byDay).sort()
          return days.map(day => {
            const dayMatches = byDay[day]
            // Agrupar por competición dentro del día
            const dayGrouped: Record<string, MatchRaw[]> = {}
            dayMatches.forEach(m => {
              const key = normalize(m).competition || 'Otros'
              if (!dayGrouped[key]) dayGrouped[key] = []
              dayGrouped[key].push(m)
            })
            return (
              <div key={day}>
                {/* Separador de día */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px', padding: '6px 10px', background: MD.black, borderLeft: `4px solid ${MD.red}` }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: MD.white, textTransform: 'uppercase', letterSpacing: 1 }}>
                    📅 {formatDayHeader(day)}
                  </span>
                  <span style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>{dayMatches.length} partido{dayMatches.length !== 1 ? 's' : ''}</span>
                </div>
                {Object.entries(dayGrouped).map(([comp, cmatches]) => (
                <div key={comp} style={{ marginBottom: 20 }}>
                  {/* Cabecera competición */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: `2px solid ${MD.black}` }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: MD.white, background: MD.red, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: 1 }}>{comp}</span>
                    <span style={{ fontSize: 11, color: MD.gray, marginLeft: 'auto' }}>{cmatches.length} partido{cmatches.length !== 1 ? 's' : ''}</span>
                  </div>

            {cmatches.map((m, i) => {
              const n = normalize(m)
              const past = isPast(n.time)
              return (
                <div key={i} className={`match-row${past ? ' past' : ''}`}>

                  {/* Hora */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: past ? MD.gray : MD.red, fontStyle: 'italic', fontVariantNumeric: 'tabular-nums' }}>{n.time}</div>
                    <div style={{ fontSize: 9, color: MD.gray, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1 }}>
                      {past ? 'Jugado' : formatShortDate(m.date)}
                    </div>
                  </div>

                  {/* Equipos */}
                  <div style={{ minWidth: 0 }}>
                    <div className="match-teams">
                      <Badge src={n.homeBadge} alt={n.home} />
                      <div className="match-name">
                        {n.home}<span>vs</span>{n.away}
                      </div>
                      <Badge src={n.awayBadge} alt={n.away} />
                    </div>
                    <div className="match-comp">{n.competition}</div>
                  </div>

                  {/* Canales */}
                  <div className="match-channels">
                    {n.channels.length > 0
                      ? n.channels.map((ch, ci) => {
                          const col = chColor(ch.name)
                          return (
                            <span key={ci} className="ch-tag" style={{ background: col.bg, color: col.text, borderColor: col.border, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {ch.image && (
                                <img src={ch.image} alt={ch.name} width={14} height={14}
                                  style={{ objectFit: 'contain', flexShrink: 0 }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                              {ch.name}
                            </span>
                          )
                        })
                      : <span style={{ fontSize: 11, color: MD.gray, fontStyle: 'italic' }}>Sin TV</span>
                    }
                  </div>

                </div>
              )
            })}
                </div>
                ))}
              </div>
            )
          })
        })()}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: `2px solid ${MD.black}`, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <span style={{ fontSize: 10, color: MD.gray }}>Datos: <a href="https://www.futbolenlatv.es" target="_blank" rel="noreferrer" style={{ color: MD.red }}>futbolenlatv.es</a> · WOSTI API</span>
        <span style={{ fontSize: 10, color: MD.gray }}>{dateStr}</span>
      </div>
    </div>
  )
}
