import { DAILY_QUOTA } from '../config.js'
import { formatDuration } from '../util/time.js'

export default function TopBar({
  me, remaining, msUntilReset, total, onOpenTimeline, onRename,
}) {
  const pct = Math.round((remaining / DAILY_QUOTA) * 100)
  const empty = remaining <= 0

  const rename = () => {
    const name = window.prompt('Dein Name:', me.name)
    if (name == null) return
    const emoji = window.prompt('Dein Emoji-Avatar:', me.emoji) || me.emoji
    onRename({ name: name.trim() || me.name, emoji })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="me-chip" style={{ '--accent': me.accent }} onClick={rename} title="Name/Avatar aendern">
          <span className="me-emoji">{me.emoji}</span>
          <span className="me-name">{me.name}</span>
          <span className="me-edit">✏️</span>
        </button>
      </div>

      <div className="topbar-center">
        <div className={'quota' + (empty ? ' is-empty' : '')}>
          <div className="quota-bar">
            <div className="quota-fill" style={{ width: pct + '%' }} />
          </div>
          <div className="quota-text">
            {empty ? (
              <>Leer · neue Pixel in <strong>{formatDuration(msUntilReset)}</strong></>
            ) : (
              <><strong>{remaining}</strong> / {DAILY_QUOTA} Pixel heute</>
            )}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <div className="total-counter" title="Gemeinsam gesetzte Pixel seit dem Start">
          <span className="total-num">{total.toLocaleString('de-DE')}</span>
          <span className="total-label">zusammen gesetzt</span>
        </div>
        <button className="icon-btn" onClick={onOpenTimeline} title="Tagebuch / Zeitleiste">📖</button>
      </div>
    </header>
  )
}
