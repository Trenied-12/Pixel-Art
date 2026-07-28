import { useState } from 'react'

// Zeitleiste / Tagebuch: durch die Tages-Snapshots klicken.
export default function Timeline({ snapshots, onClose }) {
  const [idx, setIdx] = useState(0)
  const current = snapshots[idx]

  const fmtDate = (d) => {
    try {
      return new Date(d + 'T12:00:00').toLocaleDateString('de-DE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch {
      return d
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal timeline" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>📖 Euer Pixel-Tagebuch</h2>
          <button className="icon-btn" onClick={onClose} title="Schliessen" type="button">✕</button>
        </div>

        {snapshots.length === 0 ? (
          <div className="timeline-empty">
            <p>Noch keine Schnappschüsse.</p>
            <p className="muted">
              Ab dem ersten gemeinsamen Maltag wird jeden Tag automatisch ein Stand
              gespeichert – dann könnt ihr hier durch die Zeit blättern. 🌱
            </p>
          </div>
        ) : (
          <>
            <div className="timeline-stage">
              <img
                className="timeline-img"
                src={current?.png}
                alt={'Stand vom ' + current?.date}
              />
              <div className="timeline-meta">
                <div className="timeline-date">{fmtDate(current?.date)}</div>
                <div className="muted">{(current?.count ?? 0).toLocaleString('de-DE')} Pixel auf dem Board</div>
              </div>
            </div>

            <div className="timeline-strip">
              {snapshots.map((s, i) => (
                <button
                  key={s.date}
                  className={'strip-item' + (i === idx ? ' is-active' : '')}
                  onClick={() => setIdx(i)}
                  type="button"
                  title={s.date}
                >
                  <img src={s.png} alt={s.date} />
                  <span>{s.date.slice(5)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
