import { useCallback, useEffect, useRef, useState } from 'react'
import CanvasView from './canvas/CanvasView.jsx'
import TopBar from './ui/TopBar.jsx'
import Palette from './ui/Palette.jsx'
import Toolbar from './ui/Toolbar.jsx'
import Timeline from './ui/Timeline.jsx'
import { useNow, useQuota, useStats, useProfiles, useSnapshots } from './hooks.js'
import { msUntilNextMidnight, todayStr } from './util/time.js'
import { PALETTE } from './config.js'

export default function Board({ backend, profileId }) {
  const now = useNow(1000)
  const { profiles, setProfile } = useProfiles(backend)
  const stats = useStats(backend)
  const quota = useQuota(backend, profileId)
  const snapshots = useSnapshots(backend)

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
      backend.saveSnapshot(todayStr(), { png: api.exportPNG(), count: api.pixelCount() })
    }, delay)
  }, [backend])

  const placePixels = useCallback((cells, col) => {
    if (!cells || !cells.length) return
    const t = Date.now()

    if (col === null) {
      // Radieren ist kostenlos (verbraucht kein Tageskontingent).
      for (const [x, y] of cells) backend.setPixel(x, y, null)
      scheduleSnapshot()
      return
    }

    const budget = quota.getRemaining()
    if (budget <= 0) {
      showToast('Heute keine Pixel mehr übrig 🌙')
      return
    }
    const allowed = cells.length > budget ? cells.slice(0, budget) : cells
    for (const [x, y] of allowed) backend.setPixel(x, y, { c: col, b: profileId, t })
    quota.consume(allowed.length)
    addStats(allowed.length)
    if (allowed.length < cells.length) showToast(`Nur noch ${allowed.length} Pixel heute frei`)
    scheduleSnapshot()
  }, [backend, profileId, quota, addStats, scheduleSnapshot, showToast])

  // Einmal kurz nach dem Laden den heutigen Snapshot sichern.
  useEffect(() => {
    const id = setTimeout(() => scheduleSnapshot(300), 3500)
    return () => clearTimeout(id)
  }, [scheduleSnapshot])

  const msLeft = msUntilNextMidnight(new Date(now))

  return (
    <div className="app">
      <TopBar
        me={me}
        remaining={quota.remaining}
        msUntilReset={msLeft}
        total={stats.totalPlaced}
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
