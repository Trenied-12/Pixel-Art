import { TIMEZONE } from '../config.js'

// Datum als "YYYY-MM-DD" in der konfigurierten Zeitzone (nicht UTC/lokal).
// 'en-CA' liefert praktischerweise genau das ISO-Format.
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayStr(date = new Date()) {
  return dayFmt.format(date)
}

// Millisekunden bis zum naechsten Mitternacht in der Zeitzone.
// Trick: aktuelle Uhrzeit in der TZ auslesen und vom Tagesende abziehen.
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function msUntilNextMidnight(date = new Date()) {
  const parts = timeFmt.formatToParts(date)
  const get = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  let h = get('hour')
  if (h === 24) h = 0 // manche Runtimes liefern "24" fuer Mitternacht
  const m = get('minute')
  const s = get('second')
  const elapsedMs = ((h * 60 + m) * 60 + s) * 1000 + date.getMilliseconds()
  const dayMs = 24 * 60 * 60 * 1000
  return dayMs - elapsedMs
}

// "2h 14m" oder "3m 09s" - kompakte Countdown-Anzeige.
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

// "vor 3 Min" / "gerade eben" - fuer den "Wer war's"-Tooltip.
export function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return 'gerade eben'
  const min = Math.floor(sec / 60)
  if (min < 60) return `vor ${min} Min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `vor ${hrs} Std`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `vor ${days} Tag${days === 1 ? '' : 'en'}`
  const d = new Date(ts)
  return d.toLocaleDateString('de-DE')
}
