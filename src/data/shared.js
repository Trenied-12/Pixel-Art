// Kleine Helfer, die beide Backends teilen.

export function pixelKey(x, y) {
  return `${x}_${y}`
}

export function parseKey(key) {
  const i = key.indexOf('_')
  return [Number(key.slice(0, i)), Number(key.slice(i + 1))]
}

// Snapshot-Objekt { "2026-07-28": {...} } -> nach Datum absteigend sortiertes Array.
export function sortSnapshots(obj) {
  if (!obj) return []
  return Object.entries(obj)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}
