import { TOOLS } from '../canvas/tools.js'

export default function Toolbar({
  tool, setTool, brushSize, setBrushSize, mode, setMode,
  onZoomIn, onZoomOut, onCenter,
}) {
  const showBrush = tool === 'pen' || tool === 'eraser'

  return (
    <div className="toolbar">
      <div className="tool-row">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={'tool-btn' + (tool === t.id ? ' is-active' : '')}
            onClick={() => setTool(t.id)}
            title={t.hint}
            type="button"
          >
            <span className="tool-icon">{t.icon}</span>
            <span className="tool-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="tool-secondary">
        {showBrush && (
          <div className="brush-size" role="group" aria-label="Pinselgroesse">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                className={'size-btn' + (brushSize === s ? ' is-active' : '')}
                onClick={() => setBrushSize(s)}
                type="button"
              >
                {s}×{s}
              </button>
            ))}
          </div>
        )}

        <button
          className={'mode-toggle' + (mode === 'draw' ? ' is-draw' : '')}
          onClick={() => setMode(mode === 'draw' ? 'nav' : 'draw')}
          title={
            mode === 'draw'
              ? 'Modus: Malen (1 Finger malt, 2 Finger bewegen/zoomen)'
              : 'Modus: Bewegen (tippen setzt, ziehen verschiebt)'
          }
          type="button"
        >
          {mode === 'draw' ? '🖊 Malen' : '✋ Bewegen'}
        </button>

        <div className="view-controls">
          <button className="icon-btn" onClick={onZoomOut} title="Rauszoomen" type="button">➖</button>
          <button className="icon-btn" onClick={onCenter} title="Ansicht zentrieren" type="button">🎯</button>
          <button className="icon-btn" onClick={onZoomIn} title="Reinzoomen" type="button">➕</button>
        </div>
      </div>
    </div>
  )
}
