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

// Tages-Kontingent fuer das eigene Profil (Tages-Topf-Modell).
export function useQuota(backend, profileId) {
  const ref = useRef({ date: todayStr(), used: 0 })
  const persistTimer = useRef(null)
  const [, bump] = useReducer((x) => x + 1, 0)

  useEffect(() => {
    if (!profileId) return
    return backend.onQuota(profileId, (v) => {
      if (v && typeof v.used === 'number') {
        // Eingehender (evtl. hoeherer) Serverstand gewinnt, nicht ueberschreiben.
        if (v.date !== ref.current.date || v.used >= ref.current.used) {
          ref.current = v
          bump()
        }
      }
    })
  }, [backend, profileId])

  const getRemaining = () => {
    const t = todayStr()
    const used = ref.current.date === t ? ref.current.used : 0
    return Math.max(0, DAILY_QUOTA - used)
  }

  const consume = (n) => {
    const t = todayStr()
    const base = ref.current.date === t ? ref.current.used : 0
    ref.current = { date: t, used: base + n }
    bump()
    // Persistenz entprellen: bei einem Malstrich nicht pro Pixel schreiben.
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      backend.setQuota(profileId, ref.current)
    }, 350)
  }

  const remaining = getRemaining()
  return { remaining, used: DAILY_QUOTA - remaining, getRemaining, consume }
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
