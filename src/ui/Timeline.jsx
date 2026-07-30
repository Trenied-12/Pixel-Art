import { useRef, useState } from 'react'

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
function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' })
  const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] })
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (canShareFiles && touch) {
    navigator.share({ files: [file], title: 'Pixel Art' }).catch(() => {})
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
  const imgRef = useRef(null)
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

  // Speichern im gewaehlten Massstab:
  //   scale = 1  -> Original (256x256, unveraendert)
  //   scale = 10 -> jeder Pixel wird 10x10 => 2560x2560, OHNE Glaettung (scharf)
  // Gezeichnet wird das bereits geladene Vorschaubild -> alles synchron, damit
  // das iOS-Teilen die User-Geste behaelt.
  const saveImage = (scale) => {
    if (!current?.png) return
    if (scale === 1) {
      shareOrDownload(dataURLtoBlob(current.png), `pixel-art-${current.date}.png`)
      return
    }
    const img = imgRef.current
    const base = img?.naturalWidth || 256
    const size = base * scale
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false // harte Pixel statt unscharfem Hochskalieren

    const draw = (source) => {
      ctx.drawImage(source, 0, 0, size, size)
      shareOrDownload(
        dataURLtoBlob(canvas.toDataURL('image/png')),
        `pixel-art-${current.date}-${size}px.png`,
      )
    }

    if (img && img.complete && img.naturalWidth) {
      draw(img) // synchron -> iOS-Teilen bleibt erlaubt
    } else {
      const im = new Image()
      im.onload = () => draw(im)
      im.src = current.png
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
                ref={imgRef}
                className="timeline-img"
                src={current?.png}
                alt={'Stand vom ' + current?.date}
              />
              <div className="timeline-meta">
                <div className="timeline-date">{fmtDate(current?.date)}</div>
                <div className="muted">{(current?.count ?? 0).toLocaleString('de-DE')} Pixel auf dem Board</div>
                {current?.png && (
                  <div className="timeline-actions">
                    <button type="button" className="timeline-download" onClick={() => saveImage(1)}>
                      ⬇ Original · 256×256
                    </button>
                    <button type="button" className="timeline-download alt" onClick={() => saveImage(10)}>
                      ⬇ Hochauflösend · 2560×2560
                    </button>
                  </div>
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
