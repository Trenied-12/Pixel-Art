import { useState } from 'react'
import { PROFILES, APP_PASSPHRASE } from '../config.js'
import { profileFromUrl } from './identity.js'

export default function JoinScreen({ onJoin }) {
  const [selected, setSelected] = useState(profileFromUrl())
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')

  const confirm = () => {
    if (!selected) return setError('Bitte waehl aus, wer du bist 🙂')
    if (APP_PASSPHRASE && pass !== APP_PASSPHRASE) {
      return setError('Passwort stimmt nicht ganz…')
    }
    onJoin(selected)
  }

  return (
    <div className="join-screen">
      <div className="join-card">
        <div className="join-logo">💛</div>
        <h1>Pixel Art</h1>
        <p className="join-sub">Euer gemeinsamer Pixel-Canvas. Wer bist du?</p>

        <div className="join-people">
          {['A', 'B'].map((id) => {
            const p = PROFILES[id]
            return (
              <button
                key={id}
                className={'join-person' + (selected === id ? ' is-selected' : '')}
                style={{ '--accent': p.accent }}
                onClick={() => { setSelected(id); setError('') }}
                type="button"
              >
                <span className="join-emoji">{p.emoji}</span>
                <span className="join-name">{p.name}</span>
              </button>
            )
          })}
        </div>

        {APP_PASSPHRASE ? (
          <input
            className="join-pass"
            type="password"
            placeholder="Gemeinsames Passwort"
            value={pass}
            onChange={(e) => { setPass(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
          />
        ) : null}

        {error && <div className="join-error">{error}</div>}

        <button className="btn-primary join-go" onClick={confirm} type="button">
          Los geht's ✨
        </button>
        <p className="join-hint">
          Deine Wahl wird auf diesem Geraet gemerkt – du musst das nicht jedes Mal machen.
        </p>
      </div>
    </div>
  )
}
