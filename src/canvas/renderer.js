import { GRID_SIZE, BOARD_COLOR, GRID_LINE_COLOR, FLASH_MS } from '../config.js'

// ─────────────────────────────────────────────────────────────────────────
//  Renderer: haelt ein 256x256-Offscreen-Canvas als "Bitmap-Wahrheit".
//  Ein Pixel setzen = 1 Pixel in der Bitmap. Gezeichnet wird die Bitmap dann
//  hochskaliert (imageSmoothingEnabled = false -> knackige, harte Pixel).
//  Das ist auch auf dem Handy sehr performant: pro Frame nur EIN drawImage.
// ─────────────────────────────────────────────────────────────────────────
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d')

  // Offscreen-Bitmap in Originalaufloesung
  const off = document.createElement('canvas')
  off.width = GRID_SIZE
  off.height = GRID_SIZE
  const octx = off.getContext('2d')

  let dpr = 1
  let cssW = 0
  let cssH = 0

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2) // 2x reicht, spart Fuellrate
    const rect = canvas.getBoundingClientRect()
    cssW = rect.width
    cssH = rect.height
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
  }

  function setPixel(x, y, color) {
    if (color == null) {
      octx.clearRect(x, y, 1, 1)
    } else {
      octx.fillStyle = color
      octx.fillRect(x, y, 1, 1)
    }
  }

  function clearAll() {
    octx.clearRect(0, 0, GRID_SIZE, GRID_SIZE)
  }

  // Zeichnet einen Frame. state = { cam, flashes, hover, brushCells }
  function draw(state) {
    const { cam } = state
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const boardPx = GRID_SIZE * cam.scale
    const { x: bx, y: by } = cam.cellToScreen(0, 0)

    // Board-Untergrund (warmes Creme) mit weichem Schatten
    ctx.save()
    ctx.shadowColor = 'rgba(120, 80, 40, 0.18)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 6
    ctx.fillStyle = BOARD_COLOR
    ctx.fillRect(bx, by, boardPx, boardPx)
    ctx.restore()

    // Die Bitmap hochskaliert zeichnen (harte Pixelkanten)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(off, 0, 0, GRID_SIZE, GRID_SIZE, bx, by, boardPx, boardPx)

    // Gitterlinien nur bei genug Zoom und nur im sichtbaren Bereich
    if (cam.scale >= 7) drawGrid(cam, bx, by, boardPx)

    // Aufblitz-Animation fuer frisch gesetzte Pixel
    drawFlashes(state.flashes, cam)

    // Board-Rahmen
    ctx.strokeStyle = 'rgba(120, 80, 40, 0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(bx + 0.5, by + 0.5, boardPx - 1, boardPx - 1)

    // Hover-/Pinsel-Vorschau
    if (state.brushCells && state.brushCells.length) {
      drawBrushPreview(state.brushCells, cam)
    }
  }

  function drawGrid(cam, bx, by, boardPx) {
    // Sichtbaren Zellbereich bestimmen (Culling)
    const x0 = Math.max(0, Math.floor((0 - cam.ox) / cam.scale))
    const y0 = Math.max(0, Math.floor((0 - cam.oy) / cam.scale))
    const x1 = Math.min(GRID_SIZE, Math.ceil((cssW - cam.ox) / cam.scale))
    const y1 = Math.min(GRID_SIZE, Math.ceil((cssH - cam.oy) / cam.scale))
    ctx.strokeStyle = GRID_LINE_COLOR
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let gx = x0; gx <= x1; gx++) {
      const sx = Math.round(cam.ox + gx * cam.scale) + 0.5
      ctx.moveTo(sx, Math.max(by, 0))
      ctx.lineTo(sx, Math.min(by + boardPx, cssH))
    }
    for (let gy = y0; gy <= y1; gy++) {
      const sy = Math.round(cam.oy + gy * cam.scale) + 0.5
      ctx.moveTo(Math.max(bx, 0), sy)
      ctx.lineTo(Math.min(bx + boardPx, cssW), sy)
    }
    ctx.stroke()
  }

  function drawFlashes(flashes, cam) {
    if (!flashes || !flashes.length) return
    const now = performance.now()
    for (const f of flashes) {
      const t = (now - f.start) / FLASH_MS
      if (t < 0 || t > 1) continue
      const { x: sx, y: sy } = cam.cellToScreen(f.x, f.y)
      const s = cam.scale
      // heller Aufblitz, der ausblendet
      ctx.globalAlpha = (1 - t) * 0.85
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(sx, sy, s, s)
      // expandierender Ring
      const grow = t * s * 1.4
      ctx.globalAlpha = (1 - t) * 0.7
      ctx.strokeStyle = f.color || '#ffffff'
      ctx.lineWidth = Math.max(1.5, s * 0.12)
      ctx.strokeRect(sx - grow / 2, sy - grow / 2, s + grow, s + grow)
    }
    ctx.globalAlpha = 1
  }

  function drawBrushPreview(cells, cam) {
    const s = cam.scale
    ctx.save()
    ctx.strokeStyle = 'rgba(30,30,30,0.9)'
    ctx.lineWidth = Math.max(1.5, s * 0.08)
    ctx.shadowColor = 'rgba(255,255,255,0.9)'
    ctx.shadowBlur = 2
    for (const [gx, gy] of cells) {
      const { x, y } = cam.cellToScreen(gx, gy)
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1)
    }
    ctx.restore()
  }

  // Exportiert die aktuelle Bitmap als PNG-DataURL (fuer Tages-Snapshots).
  // Untergrund wird auf BOARD_COLOR gelegt, damit leere Pixel nicht transparent sind.
  function exportPNG() {
    const out = document.createElement('canvas')
    out.width = GRID_SIZE
    out.height = GRID_SIZE
    const c = out.getContext('2d')
    c.fillStyle = BOARD_COLOR
    c.fillRect(0, 0, GRID_SIZE, GRID_SIZE)
    c.drawImage(off, 0, 0)
    return out.toDataURL('image/png')
  }

  return { resize, setPixel, clearAll, draw, exportPNG, get dpr() { return dpr } }
}
