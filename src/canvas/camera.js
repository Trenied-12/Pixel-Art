import { MIN_SCALE, MAX_SCALE } from '../config.js'

// Die Kamera beschreibt, wie das Grid auf den Bildschirm abgebildet wird:
//   scale  = Bildschirm-Pixel pro Zelle (Zoom)
//   ox, oy = Bildschirmposition (CSS-px) der Grid-Ecke (0,0)
export class Camera {
  constructor(scale, ox, oy) {
    this.scale = scale
    this.ox = ox
    this.oy = oy
  }

  clone() {
    return new Camera(this.scale, this.ox, this.oy)
  }

  // Bildschirm -> Grid-Zelle (ganzzahlig, abgerundet)
  screenToCell(sx, sy) {
    return {
      gx: Math.floor((sx - this.ox) / this.scale),
      gy: Math.floor((sy - this.oy) / this.scale),
    }
  }

  // Grid-Ecke -> Bildschirm (obere linke Ecke der Zelle)
  cellToScreen(gx, gy) {
    return { x: this.ox + gx * this.scale, y: this.oy + gy * this.scale }
  }

  // Verschieben (Pan)
  panBy(dx, dy) {
    this.ox += dx
    this.oy += dy
  }

  // Zoomen, wobei der Grid-Punkt unter (sx,sy) fix bleibt.
  zoomAt(factor, sx, sy) {
    const next = clampScale(this.scale * factor)
    const realFactor = next / this.scale
    this.ox = sx - (sx - this.ox) * realFactor
    this.oy = sy - (sy - this.oy) * realFactor
    this.scale = next
  }
}

export function clampScale(s) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
}

// Haelt das Board grob im Sichtbereich, damit man es nicht "verliert".
// Erlaubt etwas Ueberstand (Rand), begrenzt aber, wie weit weg man pannen kann.
export function clampCamera(cam, boardPx, viewW, viewH) {
  const margin = Math.min(viewW, viewH) * 0.6
  const minOx = viewW - boardPx - margin
  const maxOx = margin
  const minOy = viewH - boardPx - margin
  const maxOy = margin
  cam.ox = Math.min(maxOx, Math.max(minOx, cam.ox))
  cam.oy = Math.min(maxOy, Math.max(minOy, cam.oy))
  return cam
}
