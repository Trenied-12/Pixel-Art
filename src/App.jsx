import { useEffect, useState } from 'react'
import { getBackend } from './data/backend.js'
import { getIdentity, setIdentity } from './auth/identity.js'
import JoinScreen from './auth/JoinScreen.jsx'
import Board from './Board.jsx'

export default function App() {
  const backend = getBackend()
  // Mock ist sofort bereit; Firebase erst nach anonymer Anmeldung.
  const [ready, setReady] = useState(backend.mode === 'mock')
  const [profileId, setProfileId] = useState(() => getIdentity()?.profile || null)

  useEffect(() => {
    let alive = true
    backend.init().then(() => alive && setReady(true))
    return () => { alive = false }
  }, [backend])

  if (!ready) return <Splash />

  if (!profileId) {
    return (
      <JoinScreen
        onJoin={(id) => {
          setIdentity(id)
          setProfileId(id)
        }}
      />
    )
  }

  return <Board backend={backend} profileId={profileId} />
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash-heart">💛</div>
      <div className="splash-text">verbinde euch…</div>
    </div>
  )
}
