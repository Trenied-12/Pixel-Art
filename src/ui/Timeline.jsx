import { useState } from 'react'

// data:-URL synchron in einen Blob wandeln (synchron, damit die User-Geste
// fuer navigator.share() auf iOS erhalten bleibt).
function dataURLtoBlob(dataurl) {
  const [head, b64] = dataurl.split(',')
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// Bild speichern - iOS-tauglich:
//   Touch-Geraete (iPhone/iPad) -> Teilen-Menue ("Bild sichern"), da dort das
//   download-Attribut nicht greift. Desktop -> klassischer Datei-Download.
function saveSnapshotImage(snap) {
  if (!snap?.png) return
  const filename = `pixel-art-${snap.date}.png`
  const blob = dataURLtoBlob(snap.png)
  const file = new File([blob], filename, { type: 'image/png' })
  const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] })
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (canShareFiles && touch) {
    navigator
      .share({ files: [file], title: 'Pixel Art', text: `Pixel-Art ${snap.date}` })
      .catch(() => {})
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

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
          <h2>📖 Unser Pixel-Tagebuch</h2>
          <button className="icon-btn" onClick={onClose} title="Schliessen" type="button">✕</button>
        </div>

        {snapshots.length === 0 ? (
          <div className="timeline-empty">
            <p>Noch keine Schnappschüsse.</p>
            <p className="muted">
              Ab dem ersten gemeinsamen Maltag wird jeden Tag automatisch ein Stand
              gespeichert
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
                {current?.png && (
                  <button
                    type="button"
                    className="timeline-download"
                    onClick={() => saveSnapshotImage(current)}
                  >
                    ⬇ Original speichern (256×256 PNG)
                  </button>
                )}
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
