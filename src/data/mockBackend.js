// ─────────────────────────────────────────────────────────────────────────
//  Mock-Backend: laeuft komplett lokal, OHNE Firebase.
//  - Persistenz ueber localStorage
//  - "Echtzeit"-Sync zwischen offenen Browser-Tabs ueber BroadcastChannel
//  Ideal zum sofortigen Ausprobieren und um den Live-Sync in zwei Tabs zu sehen.
// ─────────────────────────────────────────────────────────────────────────
import { pixelKey, parseKey, sortSnapshots } from './shared.js'

const LS = {
  pixels: 'pac.mock.pixels',
  quota: (p) => `pac.mock.quota.${p}`,
  stats: 'pac.mock.stats',
  snapshots: 'pac.mock.snapshots',
  profiles: 'pac.mock.profiles',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch (e) {
    console.warn('localStorage voll?', e)
  }
}

export function createMockBackend() {
  const channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('pac-mock')
      : null

  // lokale Subscriber (fuer denselben Tab, den der Channel NICHT benachrichtigt)
  const subs = { pixel: new Set(), quota: {}, stats: new Set(), snapshots: new Set(), profiles: new Set() }

  const notify = (set, arg) => set && set.forEach((cb) => cb(arg))

  function broadcast(msg) {
    channel?.postMessage(msg)
  }

  if (channel) {
    channel.onmessage = (ev) => {
      const m = ev.data
      switch (m.type) {
        case 'pixel': {
          const [x, y] = parseKey(m.key)
          notify(subs.pixel, { x, y, c: m.val?.c, b: m.val?.b, t: m.val?.t, removed: m.val == null })
          break
        }
        case 'quota':
          notify(subs.quota[m.profile], m.val)
          break
        case 'stats':
          notify(subs.stats, m.val)
          break
        case 'snapshot': {
          const all = read(LS.snapshots, {})
          notify(subs.snapshots, sortSnapshots(all))
          break
        }
        case 'profile':
          notify(subs.profiles, read(LS.profiles, {}))
          break
      }
    }
  }

  return {
    mode: 'mock',

    // Ohne Server nur die Geraetezeit (im Demo-Modus ausreichend).
    serverNow() {
      return Date.now()
    },

    // "Unbegrenzt"-Schalter (im Demo-Modus aus localStorage; Standard: aus).
    onInfinite(cb) {
      const v = read('pac.mock.infinitePixel', false)
      cb(v === true || v === 'true' || v === 1)
      return () => {}
    },

    async init() {
      // nichts einzurichten - sofort bereit
      return { uid: 'mock-user' }
    },

    // ── Pixel ──────────────────────────────────────────────────────────
    onPixels({ onPixel, onHydrated }) {
      subs.pixel.add(onPixel)
      // Bestehende Pixel initial ausliefern (hydrating=true -> kein Aufblitzen)
      const map = read(LS.pixels, {})
      for (const [key, val] of Object.entries(map)) {
        const [x, y] = parseKey(key)
        onPixel({ x, y, c: val.c, b: val.b, t: val.t, hydrating: true })
      }
      Promise.resolve().then(onHydrated)
      return () => subs.pixel.delete(onPixel)
    },

    async setPixel(x, y, pixel) {
      const key = pixelKey(x, y)
      const map = read(LS.pixels, {})
      if (pixel == null) delete map[key]
      else map[key] = { c: pixel.c, b: pixel.b, t: pixel.t }
      write(LS.pixels, map)
      // lokale Subscriber sofort + andere Tabs via Channel (x,y sind bereits Parameter)
      notify(subs.pixel, { x, y, c: pixel?.c, b: pixel?.b, t: pixel?.t, removed: pixel == null })
      broadcast({ type: 'pixel', key, val: pixel == null ? null : map[key] })
    },

    // ── Kontingent ─────────────────────────────────────────────────────
    onQuota(profile, cb) {
      ;(subs.quota[profile] ||= new Set()).add(cb)
      cb(read(LS.quota(profile), null))
      return () => subs.quota[profile]?.delete(cb)
    },
    async setQuota(profile, data) {
      write(LS.quota(profile), data)
      notify(subs.quota[profile], data)
      broadcast({ type: 'quota', profile, val: data })
    },

    // ── Statistik ──────────────────────────────────────────────────────
    onStats(cb) {
      subs.stats.add(cb)
      cb(read(LS.stats, { totalPlaced: 0, startedAt: Date.now() }))
      return () => subs.stats.delete(cb)
    },
    async bumpStats(delta) {
      const cur = read(LS.stats, { totalPlaced: 0, startedAt: Date.now() })
      cur.totalPlaced = (cur.totalPlaced || 0) + delta
      if (!cur.startedAt) cur.startedAt = Date.now()
      write(LS.stats, cur)
      notify(subs.stats, cur)
      broadcast({ type: 'stats', val: cur })
    },

    // ── Snapshots (Tagebuch) ───────────────────────────────────────────
    onSnapshots(cb) {
      subs.snapshots.add(cb)
      cb(sortSnapshots(read(LS.snapshots, {})))
      return () => subs.snapshots.delete(cb)
    },
    async saveSnapshot(date, data) {
      const all = read(LS.snapshots, {})
      all[date] = { date, ...data }
      write(LS.snapshots, all)
      notify(subs.snapshots, sortSnapshots(all))
      broadcast({ type: 'snapshot', date })
    },

    // ── Profile (Namen/Avatare) ────────────────────────────────────────
    onProfiles(cb) {
      subs.profiles.add(cb)
      cb(read(LS.profiles, {}))
      return () => subs.profiles.delete(cb)
    },
    async setProfile(profile, data) {
      const all = read(LS.profiles, {})
      all[profile] = { ...(all[profile] || {}), ...data }
      write(LS.profiles, all)
      notify(subs.profiles, all)
      broadcast({ type: 'profile', profile })
    },
  }
}
