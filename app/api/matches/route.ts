import { NextResponse } from 'next/server'

const KEY  = process.env.RAPIDAPI_KEY!
const HOST = process.env.RAPIDAPI_HOST!
const HEADERS = {
  'x-rapidapi-key':  KEY,
  'x-rapidapi-host': HOST,
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  try {
    const res = await fetch(`https://${HOST}/api/Events`, {
      headers: HEADERS,
      next: { revalidate: date ? 10800 : 0 },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `API returned ${res.status}`, matches: [] }, { status: 502 })
    }

    const raw = await res.json()
    type WostiMatch = Record<string, unknown>
    const rawMatches: WostiMatch[] = Array.isArray(raw) ? raw : []

    const IMG = '/api/badge?img='
    const matches = rawMatches.map((m) => {
      const local = m.LocalTeam  as Record<string, unknown> | undefined
      const away  = m.AwayTeam   as Record<string, unknown> | undefined
      const comp  = m.Competition as Record<string, unknown> | undefined
      const chs   = Array.isArray(m.Channels)
        ? (m.Channels as Record<string, unknown>[]).map(c => ({
            name:  String(c.Name  ?? ''),
            image: c.Image ? `${IMG}${String(c.Image)}` : '',
          }))
        : []

      let time = '??:??'
      let localDateStr = ''
      if (typeof m.Date === 'string') {
        const d = new Date(m.Date)
        const madridTime = new Intl.DateTimeFormat('es-ES', {
          timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(d)
        const madridDate = new Intl.DateTimeFormat('es-ES', {
          timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d)
        const [dd, mm, yyyy] = madridDate.split('/')
        localDateStr = `${yyyy}-${mm}-${dd}`
        time = madridTime
      }

      return {
        id:          m.Id,
        time,
        date:        m.Date,
        localDate:   localDateStr,
        home:        String(local?.Name ?? '—'),
        away:        String(away?.Name  ?? '—'),
        homeBadge:   local?.Image ? `${IMG}${String(local.Image)}` : '',
        awayBadge:   away?.Image  ? `${IMG}${String(away.Image)}`  : '',
        competition: String(comp?.Name  ?? ''),
        channels:    chs as { name: string; image: string }[],
      }
    })

    // Filtrar por fecha local Madrid
    const filtered = date ? matches.filter(m => m.localDate === date) : matches
    filtered.sort((a, b) => { var d = String(a.localDate).localeCompare(String(b.localDate)); return d !== 0 ? d : String(a.time).localeCompare(String(b.time)); })

    return NextResponse.json({
      matches:  filtered,
      count:    filtered.length,
      endpoint: '/api/Events',
      date,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err), matches: [] }, { status: 500 })
  }
}
