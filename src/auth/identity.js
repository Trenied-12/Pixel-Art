// Simple 2-Personen-"Auth": kein echtes Login, nur ein gemerktes Profil.
// Gespeichert in localStorage, damit man nach einmaliger Auswahl direkt drin ist.
const KEY = 'pac.identity'

export function getIdentity() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setIdentity(profile) {
  localStorage.setItem(KEY, JSON.stringify({ profile }))
}

export function clearIdentity() {
  localStorage.removeItem(KEY)
}

// Magic-Link-Komfort: ?p=A (oder ?p=B) in der URL waehlt das Profil vor.
// Kein echter Sicherheitstoken - nur damit jede Person ihren eigenen
// Bookmark/Link haben kann, der direkt "ihr" Profil oeffnet.
export function profileFromUrl() {
  try {
    const p = new URLSearchParams(location.search).get('p')
    return p === 'A' || p === 'B' ? p : null
  } catch {
    return null
  }
}
