// Waehlt zur Laufzeit das passende Backend:
//   - Firebase, wenn eine Config vorhanden ist (.env)
//   - sonst der lokale Mock (sofort lauffaehig, Sync ueber Browser-Tabs)
import { HAS_FIREBASE } from '../config.js'
import { createMockBackend } from './mockBackend.js'
import { createFirebaseBackend } from './firebaseBackend.js'

let instance = null

export function getBackend() {
  if (!instance) {
    instance = HAS_FIREBASE ? createFirebaseBackend() : createMockBackend()
    if (import.meta.env.DEV) {
      console.info(
        `[Pixel Art] Datenquelle: ${instance.mode.toUpperCase()}` +
          (instance.mode === 'mock'
            ? ' (keine Firebase-Config gefunden - Sync laeuft zwischen Browser-Tabs)'
            : ''),
      )
    }
  }
  return instance
}
