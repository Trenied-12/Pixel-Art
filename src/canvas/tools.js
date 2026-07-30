import { GRID_SIZE } from '../config.js'

// Verfuegbare Werkzeuge (id -> Anzeige). "brush" = variable Groesse 1/2/3.
export const TOOLS = [
  { id: 'pen', label: 'Stift', icon: '✏️', hint: 'Einzelne Pixel setzen' },
  { id: 'eraser', label: 'Radierer', icon: '🧽', hint: 'Pixel loeschen' },
  { id: 'bucket', label: 'Fuellen', icon: '🪣', hint: 'Flaeche fuellen (bis Kontingent reicht)' },
  { id: 'eyedropper', label: 'Pipette', icon: '💧', hint: 'Farbe vom Canvas aufnehmen' },
  { id: 'move', label: 'Verschieben', icon: '🫳', hint: 'Bereich aufziehen und verschieben (kostet kein Kontingent)' },
]

const inBounds = (x, y) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE

// NxN-Pinselzellen, zentriert (ungerade) bzw. rechts/unten (gerade), geclippt.
export function getBrushCells(gx, gy, size) {
  const cells = []
  const start = -Math.floor((size - 1) / 2)
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const x = gx + start + dx
      const y = gy + start + dy
      if (inBounds(x, y)) cells.push([x, y])
    }
  }
  return cells
}

// Kleines Pixel-Herz (7x6), zentriert um den Klickpunkt.
const HEART = [
  '.XX.XX.',
  'XXXXXXX',
  'XXXXXXX',
  '.XXXXX.',
  '..XXX..',
  '...X...',
]
export function getStampCells(gx, gy) {
  const cells = []
  const w = HEART[0].length
  const h = HEART.length
  const offX = gx - Math.floor(w / 2)
  const offY = gy - Math.floor(h / 2)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (HEART[j][i] === 'X') {
        const x = offX + i
        const y = offY + j
        if (inBounds(x, y)) cells.push([x, y])
      }
    }
  }
  return cells
}

// Flood-Fill ab (sx,sy): fuellt zusammenhaengende Zellen gleicher Farbe.
// getColor(x,y) -> Hex-String oder null (leer). Begrenzt durch cap (Restkontingent).
export function floodFill(getColor, sx, sy, cap) {
  if (!inBounds(sx, sy) || cap <= 0) return []
  const target = getColor(sx, sy) ?? null
  const seen = new Set()
  const result = []
  const queue = [[sx, sy]]
  seen.add(`${sx}_${sy}`)
  const HARD_MAX = GRID_SIZE * GRID_SIZE
  while (queue.length && result.length < cap && result.length < HARD_MAX) {
    const [x, y] = queue.shift()
    if ((getColor(x, y) ?? null) !== target) continue
    result.push([x, y])
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]
    for (const [nx, ny] of neighbors) {
      const key = `${nx}_${ny}`
      if (!inBounds(nx, ny) || seen.has(key)) continue
      seen.add(key)
      if ((getColor(nx, ny) ?? null) === target) queue.push([nx, ny])
    }
  }
  return result
}
