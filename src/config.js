// ─────────────────────────────────────────────────────────────────────────
//  Zentrale App-Konfiguration & Konstanten
//  Hier kannst du die wichtigsten Stellschrauben anpassen.
// ─────────────────────────────────────────────────────────────────────────

// Canvas: festes 256x256-Gitter (siehe README, leicht aenderbar).
export const GRID_SIZE = 256

// Tages-Kontingent pro Person (Anzahl heute veraenderter Pixel/Zellen).
export const DAILY_QUOTA = 150

// Zeitzone fuer den Tageswechsel (Kontingent-Reset & Snapshot-Datum).
export const TIMEZONE = 'Europe/Berlin'

// Hintergrund/"leere" Farbe des Boards (warmes Creme).
export const BOARD_COLOR = '#fdf3e7'
export const GRID_LINE_COLOR = 'rgba(120, 90, 60, 0.12)'

// Zoom-Grenzen (Bildschirm-Pixel pro Zelle).
export const MIN_SCALE = 1.5
export const MAX_SCALE = 40
export const DEFAULT_SCALE = 12

// Dauer der Aufblitz-Animation beim Setzen eines Pixels (ms).
export const FLASH_MS = 450

// Die zwei festen Profile. Namen & Emojis sind spaeter im UI editierbar;
// das hier sind nur die Startwerte. "accent" faerbt die Person im UI ein.
export const PROFILES = {
  A: { id: 'A', name: 'Jonas', emoji: '🐥', accent: '#f0803c' },
  B: { id: 'B', name: 'Lara', emoji: '🦖', accent: '#8a6cf0' },
}

// Kuratierte Schnellwahl-Palette (warme, verspielte Toene + Basics).
// Zusaetzlich gibt es einen vollen RGB-Farbwaehler.
export const PALETTE = [
  '#2b2b2b', '#ffffff', '#8d6e63', '#c0392b',
  '#e74c3c', '#f0803c', '#ffb27a', '#f6c945',
  '#fff2a8', '#7bc86c', '#2e8b57', '#3ab0c9',
  '#4a90d9', '#8a6cf0', '#c98ad6', '#ff8fb3',
]

// ── Firebase-Config aus den Umgebungsvariablen (Vite: import.meta.env) ──
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FB_DATABASE_URL,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}

// Firebase gilt als konfiguriert, wenn zumindest die DB-URL + apiKey da sind.
export const HAS_FIREBASE = Boolean(
  firebaseConfig.databaseURL && firebaseConfig.apiKey,
)

// Optionales weiches Zugangs-Passwort (leer = keine Abfrage).
export const APP_PASSPHRASE = import.meta.env.VITE_APP_PASSPHRASE || ''
