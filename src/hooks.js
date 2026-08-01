import { useEffect, useReducer, useRef, useState } from 'react'
import { DAILY_QUOTA, PROFILES } from './config.js'
import { todayStr } from './util/time.js'

// Tickt jede Sekunde -> fuer Countdown & Mitternachts-Reset.
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

// Tages-Kontingent fuer das eigene Profil.
//
// Gezaehlt werden nicht Setz-Aktionen, sondern die MENGE der heute (Serverzeit)
// veraenderten Zellen. Deshalb wird ein Set der beruehrten Zellkoordinaten
// gefuehrt: eine Zelle noch einmal (um-)faerben ist gratis, und radiert man
// eine heute gesetzte Zelle wieder, wird sie freigegeben (zaehlt also nicht).
// Datenmodell: /quota/{profile} = { date: "YYYY-MM-DD", cells: { "x_y": true } }
export function useQuota(backend, profileId) {
  const ref = useRef({ date: '', cells: {} })
  const persistTimer = useRef(null)
  const [, bump] = useReducer((x) => x + 1, 0)

  useEffect(() => {
    if (!profileId) return
    return backend.onQuota(profileId, (v) => {
      if (v && typeof v === 'object') {
        ref.current = { date: v.date || '', cells: v.cells || {} }
        bump()
      }
    })
  }, [backend, profileId])

  // "Heute" auf Basis der Serverzeit (nicht der manipulierbaren Geraeteuhr).
  const serverToday = () => todayStr(new Date(backend.serverNow()))

  // Zellen, die HEUTE zaehlen; an einem neuen Tag automatisch leer.
  const cellsToday = () => (ref.current.date === serverToday() ? ref.current.cells : {})

  const getUsed = () => Object.keys(cellsToday()).length
  const getRemaining = () => Math.max(0, DAILY_QUOTA - getUsed())
  const isTouched = (x, y) => Boolean(cellsToday()[`${x}_${y}`])

  const persist = () => {
    // Persistenz entprellen: bei einem Malstrich nicht pro Pixel schreiben.
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => backend.setQuota(profileId, ref.current), 350)
  }

  // Neu beruehrte Zellen aufnehmen (Budget hat der Aufrufer schon geprueft).
  const addCells = (keys) => {
    if (!keys.length) return
    const t = serverToday()
    const cells = ref.current.date === t ? { ...ref.current.cells } : {}
    for (const k of keys) cells[k] = true
    ref.current = { date: t, cells }
    bump()
    persist()
  }

  // Heute beruehrte Zellen wieder freigeben (eigene Pixel radiert/entfernt).
  const releaseCells = (keys) => {
    if (!keys.length || ref.current.date !== serverToday()) return
    const cells = { ...ref.current.cells }
    let changed = false
    for (const k of keys) if (cells[k]) { delete cells[k]; changed = true }
    if (changed) {
      ref.current = { date: ref.current.date, cells }
      bump()
      persist()
    }
  }

  return {
    remaining: getRemaining(),
    used: getUsed(),
    getRemaining,
    isTouched,
    addCells,
    releaseCells,
  }
}

// "Unbegrenzt"-Schalter (Root-Boolean 'infinitePixel' in Firebase, nur lesbar).
export function useInfinite(backend) {
  const [inf, setInf] = useState(false)
  useEffect(() => backend.onInfinite(setInf), [backend])
  return inf
}

// Verbleibende Pixel des ANDEREN Spielers (nur Anzeige, Serverdatum).
export function useOtherRemaining(backend, otherId) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!otherId) return
    return backend.onQuota(otherId, setData)
  }, [backend, otherId])
  const today = todayStr(new Date(backend.serverNow()))
  const used = data && data.date === today ? Object.keys(data.cells || {}).length : 0
  return Math.max(0, DAILY_QUOTA - used)
}

// Gemeinsamer Gesamtzaehler ("Ihr habt zusammen X Pixel gesetzt").
export function useStats(backend) {
  const [stats, setStats] = useState({ totalPlaced: 0, startedAt: Date.now() })
  useEffect(() => backend.onStats(setStats), [backend])
  return stats
}

// Profile (Namen/Avatare), Defaults aus config gemischt mit Overrides aus DB.
export function useProfiles(backend) {
  const [overrides, setOverrides] = useState({})
  useEffect(() => backend.onProfiles(setOverrides), [backend])
  const profiles = {
    A: { ...PROFILES.A, ...(overrides.A || {}) },
    B: { ...PROFILES.B, ...(overrides.B || {}) },
  }
  const setProfile = (id, data) => backend.setProfile(id, data)
  return { profiles, setProfile }
}

// Tages-Snapshots (Tagebuch), absteigend nach Datum.
export function useSnapshots(backend) {
  const [snaps, setSnaps] = useState([])
  useEffect(() => backend.onSnapshots(setSnaps), [backend])
  return snaps
}
