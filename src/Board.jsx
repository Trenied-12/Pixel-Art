import { useCallback, useEffect, useRef, useState } from 'react'
import CanvasView from './canvas/CanvasView.jsx'
import TopBar from './ui/TopBar.jsx'
import Palette from './ui/Palette.jsx'
import Toolbar from './ui/Toolbar.jsx'
import Timeline from './ui/Timeline.jsx'
import { useNow, useQuota, useStats, useProfiles, useSnapshots, useInfinite, useOtherRemaining } from './hooks.js'
import { msUntilNextMidnight, todayStr } from './util/time.js'
import { PALETTE, GRID_SIZE } from './config.js'

export default function Board({ backend, profileId }) {
  useNow(1000) // sekuendlicher Re-Render fuer Countdown & Tageswechsel
  const { profiles, setProfile } = useProfiles(backend)
  const stats = useStats(backend)
  const quota = useQuota(backend, profileId)
  const snapshots = useSnapshots(backend)
  const infinite = useInfinite(backend)
  const otherId = profileId === 'A' ? 'B' : 'A'
  const otherRemaining = useOtherRemaining(backend, otherId)
  const other = { id: otherId, ...profiles[otherId], remaining: otherRemaining }

  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(PALETTE[5]) // warmes Orange als Startfarbe
  const [brushSize, setBrushSize] = useState(1)
  const [mode, setMode] = useState('nav')
  const [showTimeline, setShowTimeline] = useState(false)
  const [toast, setToast] = useState(null)

  const apiRef = useRef(null)
  const toastTimer = useRef(null)
  const snapTimer = useRef(null)
  const pendingStats = useRef(0)
  const statsTimer = useRef(null)

  const me = { id: profileId, ...profiles[profileId] }

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  // Stats gebuendelt schreiben (nicht pro Pixel bei einem Malstrich).
  const addStats = useCallback((n) => {
    pendingStats.current += n
    clearTimeout(statsTimer.current)
    statsTimer.current = setTimeout(() => {
      const v = pendingStats.current
      pendingStats.current = 0
      if (v) backend.bumpStats(v)
    }, 500)
  }, [backend])

  // Tages-Snapshot (debounced) - haelt den heutigen Stand aktuell.
  const scheduleSnapshot = useCallback((delay = 1500) => {
    clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(() => {
      const api = apiRef.current
      if (!api) return
      const day = todayStr(new Date(backend.serverNow()))
      backend.saveSnapshot(day, { png: api.exportPNG(), count: api.pixelCount() })
    }, delay)
  }, [backend])

  const placePixels = useCallback((cells, col) => {
    if (!cells || !cells.length) return
    const t = backend.serverNow()

    // Duplikate innerhalb einer Aktion (z.B. ueberlappender Pinsel) entfernen.
    const uniq = new Map()
    for (const [x, y] of cells) uniq.set(`${x}_${y}`, [x, y])

    if (col === null) {
      // Radieren ist immer erlaubt; eigene HEUTE gesetzte Zellen werden frei.
      const released = []
      for (const [key, [x, y]] of uniq) {
        backend.setPixel(x, y, null)
        if (quota.isTouched(x, y)) released.push(key)
      }
      quota.releaseCells(released)
      scheduleSnapshot()
      return
    }

    if (infinite) {
      // Unbegrenzt-Modus: alles setzen, kein Kontingent abziehen oder tracken.
      for (const [, [x, y]] of uniq) backend.setPixel(x, y, { c: col, b: profileId, t })
      addStats(uniq.size)
      scheduleSnapshot()
      return
    }

    // Setzen: heute schon beruehrte Zellen sind gratis, neue kosten je 1.
    const freeCells = []
    const newCells = []
    for (const [key, [x, y]] of uniq) {
      if (quota.isTouched(x, y)) freeCells.push([key, x, y])
      else newCells.push([key, x, y])
    }
    const budget = quota.getRemaining()
    const allowedNew = newCells.slice(0, budget)
    const toWrite = [...freeCells, ...allowedNew]
    if (!toWrite.length) {
      showToast('Heute keine neuen Pixel mehr übrig 🌙')
      return
    }
    for (const [, x, y] of toWrite) backend.setPixel(x, y, { c: col, b: profileId, t })
    quota.addCells(allowedNew.map(([key]) => key))
    addStats(allowedNew.length)
    if (allowedNew.length < newCells.length) {
      showToast(`Nur noch ${allowedNew.length} neue Pixel heute frei`)
    }
    scheduleSnapshot()
  }, [backend, profileId, quota, addStats, scheduleSnapshot, showToast, infinite])

  // Pixel-Bereich verschieben (Move-Tool). Kostet KEIN Kontingent - es werden
  // nur vorhandene Pixel umgelagert. Der urspruengliche Autor bleibt erhalten.
  const moveRegion = useCallback((cells, dx, dy) => {
    if (!cells.length || (dx === 0 && dy === 0)) return
    const t = backend.serverNow()
    const destSet = new Set()
    const dest = []
    for (const p of cells) {
      const nx = p.x + dx
      const ny = p.y + dy
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue
      destSet.add(`${nx}_${ny}`)
      dest.push({ x: nx, y: ny, c: p.c, b: p.b })
    }
    // Quelle leeren - aber nur Zellen, die nicht ohnehin neu bemalt werden.
    for (const p of cells) {
      if (!destSet.has(`${p.x}_${p.y}`)) backend.setPixel(p.x, p.y, null)
    }
    for (const d of dest) backend.setPixel(d.x, d.y, { c: d.c, b: d.b || profileId, t })
    scheduleSnapshot()
  }, [backend, profileId, scheduleSnapshot])

  // Einmal kurz nach dem Laden den heutigen Snapshot sichern.
  useEffect(() => {
    const id = setTimeout(() => scheduleSnapshot(300), 3500)
    return () => clearTimeout(id)
  }, [scheduleSnapshot])

  const msLeft = msUntilNextMidnight(new Date(backend.serverNow()))

  return (
    <div className="app">
      <TopBar
        me={me}
        remaining={quota.remaining}
        msUntilReset={msLeft}
        total={stats.totalPlaced}
        infinite={infinite}
        other={other}
        onOpenTimeline={() => setShowTimeline(true)}
        onRename={(d) => setProfile(profileId, d)}
      />

      <CanvasView
        backend={backend}
        tool={tool}
        color={color}
        brushSize={brushSize}
        mode={mode}
        profileId={profileId}
        profiles={profiles}
        placePixels={placePixels}
        moveRegion={moveRegion}
        onEyedrop={(c) => { setColor(c); showToast('Farbe aufgenommen 💧') }}
        getBudget={quota.getRemaining}
        onReady={(api) => { apiRef.current = api }}
      />

      <div className="bottom-dock">
        <Palette color={color} onChange={setColor} />
        <Toolbar
          tool={tool}
          setTool={setTool}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          mode={mode}
          setMode={setMode}
          onZoomIn={() => apiRef.current?.zoomBy(1.3)}
          onZoomOut={() => apiRef.current?.zoomBy(1 / 1.3)}
          onCenter={() => apiRef.current?.centerView()}
        />
      </div>

      {toast && <div className="toast">{toast}</div>}
      {showTimeline && <Timeline snapshots={snapshots} onClose={() => setShowTimeline(false)} />}
    </div>
  )
}
