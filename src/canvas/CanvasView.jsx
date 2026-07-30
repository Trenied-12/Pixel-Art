import { useEffect, useRef, useState } from 'react'
import { GRID_SIZE, DEFAULT_SCALE } from '../config.js'
import { Camera, clampCamera } from './camera.js'
import { createRenderer } from './renderer.js'
import { getBrushCells, getStampCells, floodFill } from './tools.js'
import { pixelKey } from '../data/shared.js'
import { relativeTime } from '../util/time.js'

const TAP_MOVE_THRESHOLD = 6 // px, darunter gilt es als "Tippen" statt "Ziehen"

// Bresenham: alle Zellen auf der Linie (a)->(b), damit schnelle Striche keine Luecken haben.
function lineCells(x0, y0, x1, y1) {
  const cells = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0
  let y = y0
  while (true) {
    cells.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 < dx) { err += dx; y += sy }
  }
  return cells
}

export default function CanvasView(props) {
  const { backend } = props
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)

  // Alle veraenderlichen Props in einem Ref, damit die nativen Event-Handler
  // immer die aktuellen Werte sehen (ohne Handler neu zu binden).
  const live = useRef(props)
  live.current = props

  const rendererRef = useRef(null)
  const camRef = useRef(null)
  const mapRef = useRef(new Map()) // "x_y" -> { c, b, t }
  const flashesRef = useRef([])
  const pointersRef = useRef(new Map())
  const gestureRef = useRef({ lastDist: 0, lastMid: null })
  const singleRef = useRef(null) // { startX, startY, lastX, lastY, moved, time, drawing, lastCell }
  const hoverCellRef = useRef(null)
  const runningRef = useRef(false)

  // Move-Tool
  const selRef = useRef(null) // aktive Auswahl { x0,y0,w,h,dx,dy,floatCanvas,cells }
  const marqueeRef = useRef(null) // Rechteck waehrend des Aufziehens { ax,ay,bx,by }
  const moveActiveRef = useRef(null) // laufende Verschiebung
  const requestRenderRef = useRef(null)

  const [tooltip, setTooltip] = useState(null) // { x, y, text }

  const getColor = (x, y) => mapRef.current.get(pixelKey(x, y))?.c ?? null

  // Auswahl verwerfen, sobald ein anderes Werkzeug gewaehlt wird.
  useEffect(() => {
    if (props.tool !== 'move') {
      selRef.current = null
      marqueeRef.current = null
      moveActiveRef.current = null
      requestRenderRef.current?.()
    }
  }, [props.tool])

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = createRenderer(canvas)
    rendererRef.current = renderer

    // ── Render-Loop (laeuft nur solange noetig: Flashes / Interaktion) ──
    function frame() {
      const cam = camRef.current
      const now = performance.now()
      flashesRef.current = flashesRef.current.filter((f) => now - f.start < 700)
      renderer.draw({
        cam,
        flashes: flashesRef.current,
        brushCells: currentBrushPreview(),
        move: currentMoveState(),
      })
      if (flashesRef.current.length > 0) {
        requestAnimationFrame(frame)
      } else {
        runningRef.current = false
      }
    }
    function requestRender() {
      if (!runningRef.current) {
        runningRef.current = true
        requestAnimationFrame(frame)
      }
    }
    requestRenderRef.current = requestRender

    function currentBrushPreview() {
      const cell = hoverCellRef.current
      if (!cell) return []
      const { tool, brushSize } = live.current
      if (tool === 'move' || tool === 'eyedropper' || tool === 'bucket') {
        return tool === 'move' ? [] : [[cell.gx, cell.gy]]
      }
      return getBrushCells(cell.gx, cell.gy, brushSize)
    }

    // ── Move-Tool: Helfer ─────────────────────────────────────────────
    function cellInSelection(gx, gy) {
      const sel = selRef.current
      if (!sel) return false
      const x0 = sel.x0 + sel.dx
      const y0 = sel.y0 + sel.dy
      return gx >= x0 && gy >= y0 && gx < x0 + sel.w && gy < y0 + sel.h
    }
    function buildFloatCanvas(x0, y0, w, h) {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const cx = c.getContext('2d')
      const cells = []
      for (let ry = 0; ry < h; ry++) {
        for (let rx = 0; rx < w; rx++) {
          const px = mapRef.current.get(pixelKey(x0 + rx, y0 + ry))
          if (px && px.c) {
            cx.fillStyle = px.c
            cx.fillRect(rx, ry, 1, 1)
            cells.push({ rx, ry, c: px.c, b: px.b })
          }
        }
      }
      return { canvas: c, cells }
    }
    function commitMove() {
      const sel = selRef.current
      if (!sel || (sel.dx === 0 && sel.dy === 0)) return
      const src = sel.cells.map((p) => ({ x: sel.x0 + p.rx, y: sel.y0 + p.ry, c: p.c, b: p.b }))
      live.current.moveRegion?.(src, sel.dx, sel.dy)
      sel.x0 += sel.dx
      sel.y0 += sel.dy
      sel.dx = 0
      sel.dy = 0
    }
    function currentMoveState() {
      if (live.current.tool !== 'move') return null
      if (marqueeRef.current) {
        const mq = marqueeRef.current
        return {
          x0: Math.min(mq.ax, mq.bx),
          y0: Math.min(mq.ay, mq.by),
          w: Math.abs(mq.bx - mq.ax) + 1,
          h: Math.abs(mq.by - mq.ay) + 1,
          dx: 0, dy: 0, floatCanvas: null,
        }
      }
      const sel = selRef.current
      if (sel) {
        return { x0: sel.x0, y0: sel.y0, w: sel.w, h: sel.h, dx: sel.dx, dy: sel.dy, floatCanvas: sel.floatCanvas }
      }
      return null
    }

    // ── Kamera initial: Board mittig einpassen ──
    function centerView() {
      const rect = canvas.getBoundingClientRect()
      const scale = DEFAULT_SCALE
      const ox = (rect.width - GRID_SIZE * scale) / 2
      const oy = (rect.height - GRID_SIZE * scale) / 2
      camRef.current = new Camera(scale, ox, oy)
      requestRender()
    }

    function doResize() {
      renderer.resize()
      requestRender()
    }

    renderer.resize()
    centerView()

    // ── Live-Subscription: einzige Stelle, die Bitmap + Map + Flash aendert ──
    const unsub = backend.onPixels({
      onPixel: ({ x, y, c, b, t, removed, hydrating }) => {
        const key = pixelKey(x, y)
        if (removed) {
          mapRef.current.delete(key)
          renderer.setPixel(x, y, null)
        } else {
          mapRef.current.set(key, { c, b, t })
          renderer.setPixel(x, y, c)
        }
        if (!hydrating) {
          flashesRef.current.push({ x, y, color: c, start: performance.now() })
        }
        requestRender()
      },
      onHydrated: () => requestRender(),
    })

    // ── Eingabe (Pointer Events: Maus, Touch, Stift einheitlich) ──
    const relPos = (e) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    function paintAt(gx, gy) {
      const { tool, color, brushSize, placePixels } = live.current
      if (tool === 'eraser') placePixels(getBrushCells(gx, gy, brushSize), null)
      else placePixels(getBrushCells(gx, gy, brushSize), color)
    }

    function onPointerDown(e) {
      try { canvas.setPointerCapture(e.pointerId) } catch { /* kein aktiver Zeiger */ }
      const p = relPos(e)
      pointersRef.current.set(e.pointerId, p)

      if (pointersRef.current.size === 2) {
        // Pinch startet -> evtl. laufenden Strich beenden
        singleRef.current = null
        const pts = [...pointersRef.current.values()]
        gestureRef.current.lastDist = dist(pts[0], pts[1])
        gestureRef.current.lastMid = mid(pts[0], pts[1])
        return
      }
      if (pointersRef.current.size !== 1) return

      const { gx, gy } = camRef.current.screenToCell(p.x, p.y)
      const { mode, tool } = live.current

      if (tool === 'move') {
        if (selRef.current && cellInSelection(gx, gy)) {
          // bestehende Auswahl greifen und verschieben
          moveActiveRef.current = { startGx: gx, startGy: gy, dx0: selRef.current.dx, dy0: selRef.current.dy }
          marqueeRef.current = null
        } else {
          // neue Auswahl aufziehen (alte verwerfen)
          selRef.current = null
          moveActiveRef.current = null
          marqueeRef.current = { ax: gx, ay: gy, bx: gx, by: gy }
        }
        singleRef.current = { moveMode: true, startX: p.x, startY: p.y, moved: false, time: Date.now(), lastCell: { gx, gy } }
        hoverCellRef.current = { gx, gy }
        requestRender()
        return
      }

      const isPaintTool = tool === 'pen' || tool === 'eraser'
      const drawing = mode === 'draw' && isPaintTool
      singleRef.current = {
        startX: p.x, startY: p.y, lastX: p.x, lastY: p.y,
        moved: false, time: Date.now(), drawing, lastCell: { gx, gy },
      }
      if (drawing) paintAt(gx, gy)
      hoverCellRef.current = { gx, gy }
      requestRender()
    }

    function onPointerMove(e) {
      const p = relPos(e)
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, p)
      }

      // Hover/Vorschau (v.a. Maus) aktualisieren
      const cellNow = camRef.current.screenToCell(p.x, p.y)
      hoverCellRef.current = cellNow
      updateTooltip(e, cellNow)

      if (pointersRef.current.size >= 2) {
        // ── Pinch-Zoom + Zwei-Finger-Pan ──
        const pts = [...pointersRef.current.values()]
        const d = dist(pts[0], pts[1])
        const m = mid(pts[0], pts[1])
        const g = gestureRef.current
        if (g.lastDist > 0) {
          camRef.current.zoomAt(d / g.lastDist, m.x, m.y)
          if (g.lastMid) camRef.current.panBy(m.x - g.lastMid.x, m.y - g.lastMid.y)
        }
        g.lastDist = d
        g.lastMid = m
        clampView()
        requestRender()
        return
      }

      const s = singleRef.current
      if (!s) { requestRender(); return }

      if (s.moveMode) {
        if (Math.hypot(p.x - s.startX, p.y - s.startY) > TAP_MOVE_THRESHOLD) s.moved = true
        if (marqueeRef.current) {
          marqueeRef.current.bx = cellNow.gx
          marqueeRef.current.by = cellNow.gy
        } else if (moveActiveRef.current && selRef.current) {
          const ma = moveActiveRef.current
          selRef.current.dx = ma.dx0 + (cellNow.gx - ma.startGx)
          selRef.current.dy = ma.dy0 + (cellNow.gy - ma.startGy)
        }
        requestRender()
        return
      }

      if (s.drawing) {
        // Kontinuierlicher Strich: Luecken per Linie fuellen
        const from = s.lastCell
        for (const [cx, cy] of lineCells(from.gx, from.gy, cellNow.gx, cellNow.gy)) {
          if (cx === s.lastCell.gx && cy === s.lastCell.gy && s.painted) continue
          paintAt(cx, cy)
        }
        s.lastCell = cellNow
        s.painted = true
      } else {
        // Pan
        const dx = p.x - s.lastX
        const dy = p.y - s.lastY
        camRef.current.panBy(dx, dy)
        if (Math.hypot(p.x - s.startX, p.y - s.startY) > TAP_MOVE_THRESHOLD) s.moved = true
        clampView()
      }
      s.lastX = p.x
      s.lastY = p.y
      requestRender()
    }

    function onPointerUp(e) {
      const wasSingle = pointersRef.current.size === 1
      pointersRef.current.delete(e.pointerId)
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* ignorieren */ }
      if (pointersRef.current.size < 2) {
        gestureRef.current.lastDist = 0
        gestureRef.current.lastMid = null
      }

      const s = singleRef.current

      if (s && s.moveMode) {
        if (marqueeRef.current) {
          const mq = marqueeRef.current
          marqueeRef.current = null
          const x0 = Math.max(0, Math.min(mq.ax, mq.bx))
          const y0 = Math.max(0, Math.min(mq.ay, mq.by))
          const x1 = Math.min(GRID_SIZE - 1, Math.max(mq.ax, mq.bx))
          const y1 = Math.min(GRID_SIZE - 1, Math.max(mq.ay, mq.by))
          if (!s.moved || x1 < x0 || y1 < y0) {
            selRef.current = null // Tipp -> Auswahl aufheben
          } else {
            const w = x1 - x0 + 1
            const h = y1 - y0 + 1
            const built = buildFloatCanvas(x0, y0, w, h)
            selRef.current = { x0, y0, w, h, dx: 0, dy: 0, floatCanvas: built.canvas, cells: built.cells }
          }
        } else if (moveActiveRef.current) {
          moveActiveRef.current = null
          commitMove()
        }
        singleRef.current = null
        requestRender()
        return
      }

      if (wasSingle && s && !s.drawing && !s.moved && Date.now() - s.time < 600) {
        handleTap(s.lastCell.gx, s.lastCell.gy, e)
      }
      singleRef.current = null
    }

    function handleTap(gx, gy) {
      if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return
      const { tool, color, brushSize, placePixels, onEyedrop, getBudget } = live.current
      switch (tool) {
        case 'pen': placePixels(getBrushCells(gx, gy, brushSize), color); break
        case 'eraser': placePixels(getBrushCells(gx, gy, brushSize), null); break
        case 'heart': placePixels(getStampCells(gx, gy), color); break
        case 'bucket': {
          const cells = floodFill(getColor, gx, gy, getBudget())
          placePixels(cells, color)
          break
        }
        case 'eyedropper': {
          const c = getColor(gx, gy)
          if (c) onEyedrop(c)
          break
        }
      }
    }

    function onWheel(e) {
      e.preventDefault()
      const p = relPos(e)
      const factor = Math.pow(1.0016, -e.deltaY)
      camRef.current.zoomAt(factor, p.x, p.y)
      clampView()
      hoverCellRef.current = camRef.current.screenToCell(p.x, p.y)
      requestRender()
    }

    function updateTooltip(e, cell) {
      if (e.pointerType && e.pointerType !== 'mouse') return
      const px = mapRef.current.get(pixelKey(cell.gx, cell.gy))
      if (!px) { setTooltip(null); return }
      const prof = live.current.profiles?.[px.b]
      const name = prof?.name || (px.b === 'A' ? 'Person A' : 'Person B')
      const emoji = prof?.emoji || ''
      const r = canvasRef.current.getBoundingClientRect()
      setTooltip({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        text: `${emoji} ${name} · ${relativeTime(px.t)}`,
      })
    }

    function clampView() {
      const rect = canvas.getBoundingClientRect()
      clampCamera(camRef.current, GRID_SIZE * camRef.current.scale, rect.width, rect.height)
    }

    // native Listener (wheel non-passive fuer preventDefault)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', () => setTooltip(null))
    canvas.addEventListener('wheel', onWheel, { passive: false })
    const ro = new ResizeObserver(doResize)
    ro.observe(canvas)

    // API nach oben reichen (Snapshot-Export, Ansicht zentrieren, Zoomen)
    props.onReady?.({
      exportPNG: () => renderer.exportPNG(),
      pixelCount: () => mapRef.current.size,
      centerView,
      zoomBy: (factor) => {
        const rect = canvas.getBoundingClientRect()
        camRef.current.zoomAt(factor, rect.width / 2, rect.height / 2)
        clampView()
        requestRender()
      },
    })

    return () => {
      unsub?.()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend])

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="pixel-canvas" />
      {tooltip && (
        <div className="pixel-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}
