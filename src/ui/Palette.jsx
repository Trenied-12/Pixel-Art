import { useEffect, useRef, useState } from 'react'
import { PALETTE } from '../config.js'

// Farbwahl: kuratierte Schnellwahl-Swatches + voller RGB-Farbwaehler.
// Zuletzt genutzte Farben werden gemerkt (kleine "Recents"-Reihe).
export default function Palette({ color, onChange }) {
  const [recents, setRecents] = useState([])
  const pickerRef = useRef(null)

  useEffect(() => {
    try {
      setRecents(JSON.parse(localStorage.getItem('pac.recents') || '[]'))
    } catch { /* egal */ }
  }, [])

  const remember = (c) => {
    setRecents((prev) => {
      const next = [c, ...prev.filter((x) => x !== c)].slice(0, 6)
      localStorage.setItem('pac.recents', JSON.stringify(next))
      return next
    })
  }

  const pick = (c) => {
    onChange(c)
    remember(c)
  }

  return (
    <div className="palette">
      <div className="palette-swatches">
        {PALETTE.map((c) => (
          <button
            key={c}
            className={'swatch' + (c === color ? ' is-active' : '')}
            style={{ background: c }}
            onClick={() => pick(c)}
            aria-label={c}
            type="button"
          />
        ))}
      </div>

      <div className="palette-tools">
        <label className="rgb-picker" style={{ background: color }}>
          <input
            ref={pickerRef}
            type="color"
            value={color}
            onChange={(e) => pick(e.target.value)}
          />
          <span className="rgb-label">＋</span>
        </label>

        {recents.length > 0 && (
          <div className="recents">
            {recents.map((c) => (
              <button
                key={c}
                className={'swatch small' + (c === color ? ' is-active' : '')}
                style={{ background: c }}
                onClick={() => pick(c)}
                type="button"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
