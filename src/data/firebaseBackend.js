// ─────────────────────────────────────────────────────────────────────────
//  Firebase-Backend: Realtime Database + Anonymous Auth.
//  RTDB liefert granulare Pro-Pixel-Events (child_added/changed/removed) -
//  perfekt fuers Live-Aufblitzen und den "Wer war's"-Tooltip.
// ─────────────────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import {
  getDatabase,
  ref,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  set,
  remove,
  runTransaction,
} from 'firebase/database'
import { firebaseConfig } from '../config.js'
import { pixelKey, parseKey, sortSnapshots } from './shared.js'

export function createFirebaseBackend() {
  const app = initializeApp(firebaseConfig)
  const db = getDatabase(app)
  const auth = getAuth(app)

  // Server-Zeit: RTDB liefert unter '.info/serverTimeOffset' die geschaetzte
  // Differenz zwischen Server- und Geraeteuhr. So basiert "heute" auf der
  // Serverzeit -> das Tages-Kontingent laesst sich nicht durch Verstellen der
  // Geraete-Uhrzeit umgehen. ('.info/*' ist immer lesbar, ohne Auth/Regeln.)
  let serverTimeOffset = 0
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    serverTimeOffset = snap.val() || 0
  })

  let resolveReady
  const ready = new Promise((res) => (resolveReady = res))

  return {
    mode: 'firebase',

    serverNow() {
      return Date.now() + serverTimeOffset
    },

    // Nur-Lesen: der "Unbegrenzt"-Schalter am Root. Die App schreibt ihn NIE;
    // er wird ausschliesslich manuell in der Firebase-Konsole umgestellt.
    onInfinite(cb) {
      return onValue(ref(db, 'infinitePixel'), (s) => cb(s.val() === true))
    },

    init() {
      signInAnonymously(auth).catch((err) => {
        console.error(
          '[Firebase] Anonyme Anmeldung fehlgeschlagen. Ist "Anonym" unter ' +
            'Authentication -> Sign-in method aktiviert?',
          err,
        )
      })
      onAuthStateChanged(auth, (user) => {
        if (user) resolveReady(user)
      })
      return ready
    },

    // ── Pixel ──────────────────────────────────────────────────────────
    // Ein einziger Datensync fuer /pixels wird von RTDB ueber alle Listener
    // geteilt. Der onValue-Listener feuert (aus dem Cache) NACH dem initialen
    // Schwung child_added -> so kennen wir die Hydrations-Grenze und blitzen
    // beim Erst-Laden nicht alles auf.
    onPixels({ onPixel, onHydrated }) {
      const pixelsRef = ref(db, 'pixels')
      let hydrated = false

      const emit = (snap, removed) => {
        const [x, y] = parseKey(snap.key)
        const val = snap.val() || {}
        onPixel({ x, y, c: val.c, b: val.b, t: val.t, removed, hydrating: !hydrated })
      }

      const offAdd = onChildAdded(pixelsRef, (s) => emit(s, false))
      const offChg = onChildChanged(pixelsRef, (s) => emit(s, false))
      const offRem = onChildRemoved(pixelsRef, (s) => emit(s, true))
      const offVal = onValue(pixelsRef, () => {
        if (!hydrated) {
          hydrated = true
          onHydrated()
          offVal() // Hydrations-Detektor nicht mehr gebraucht
        }
      })

      return () => {
        offAdd()
        offChg()
        offRem()
        offVal()
      }
    },

    async setPixel(x, y, pixel) {
      const r = ref(db, `pixels/${pixelKey(x, y)}`)
      if (pixel == null) return remove(r)
      return set(r, { c: pixel.c, b: pixel.b, t: pixel.t })
    },

    // ── Kontingent ─────────────────────────────────────────────────────
    onQuota(profile, cb) {
      return onValue(ref(db, `quota/${profile}`), (s) => cb(s.val()))
    },
    async setQuota(profile, data) {
      return set(ref(db, `quota/${profile}`), data)
    },

    // ── Statistik ──────────────────────────────────────────────────────
    onStats(cb) {
      return onValue(ref(db, 'stats'), (s) =>
        cb(s.val() || { totalPlaced: 0, startedAt: Date.now() }),
      )
    },
    async bumpStats(delta) {
      return runTransaction(ref(db, 'stats'), (cur) => {
        cur = cur || { totalPlaced: 0, startedAt: Date.now() }
        cur.totalPlaced = (cur.totalPlaced || 0) + delta
        if (!cur.startedAt) cur.startedAt = Date.now()
        return cur
      })
    },

    // ── Snapshots ──────────────────────────────────────────────────────
    onSnapshots(cb) {
      return onValue(ref(db, 'snapshots'), (s) => cb(sortSnapshots(s.val())))
    },
    async saveSnapshot(date, data) {
      return set(ref(db, `snapshots/${date}`), { date, ...data })
    },

    // ── Profile ────────────────────────────────────────────────────────
    onProfiles(cb) {
      return onValue(ref(db, 'profiles'), (s) => cb(s.val() || {}))
    },
    async setProfile(profile, data) {
      return runTransaction(ref(db, `profiles/${profile}`), (cur) => ({
        ...(cur || {}),
        ...data,
      }))
    },
  }
}
