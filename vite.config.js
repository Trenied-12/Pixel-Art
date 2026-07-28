import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' erzeugt relative Asset-Pfade, damit der Build sowohl unter
// https://<user>.github.io/<repo>/ als auch lokal (npm run preview) laeuft,
// ohne dass der Repo-Name hart eincodiert werden muss.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true, // erreichbar im lokalen Netz (praktisch zum Testen vom Handy)
  },
})
