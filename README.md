# 💛 Pixel Art

Ein gemeinsamer Pixel-Art-Canvas für **genau zwei Menschen** – inspiriert von
r/place, aber im kleinen, persönlichen Rahmen. Jede Person setzt **100 Pixel pro
Tag**; wenn der Tages-Topf leer ist, läuft ein Countdown bis Mitternacht. Alles
in Echtzeit, warm & verspielt, mobile-first.

> **Ihr habt es eilig?** `npm install && npm run dev` – die App läuft **sofort im
> Demo-Modus** (ohne Firebase, Sync zwischen zwei Browser-Tabs). Firebase braucht
> ihr erst, wenn ihr euch von zwei echten Geräten aus verbinden wollt.

---

## ✨ Features

- **256×256 Canvas** mit Zoom & Pan (Mausrad, Pinch, Zwei-Finger-Pan) – performant
  gerendert über eine hochskalierte Bitmap (keine DOM-Pixel).
- **Werkzeuge:** Stift (1×1/2×2/3×3), Radierer, Füll-Eimer, Pipette und ein
  **Herz-Stempel** 💗. Voller RGB-Farbwähler + kuratierte Schnellwahl-Palette.
- **Zwei-Modi-Bedienung:** „✋ Bewegen" (tippen setzt, ziehen verschiebt) und
  „🖊 Malen" (ein Finger malt Striche, zwei Finger bewegen/zoomen).
- **Tages-Kontingent:** 100 Pixel/Tag pro Person, sichtbarer Balken + Countdown.
  Radieren ist kostenlos. Reset um Mitternacht (Europe/Berlin).
- **Echtzeit-Sync:** Setzt A ein Pixel, blitzt es bei B sofort auf. ⚡
- **Tagebuch:** Jeden Tag wird automatisch ein Snapshot gespeichert – im 📖-Menü
  könnt ihr durch die Tage blättern.
- **Extras:** „Wer war's?"-Tooltip beim Drüberfahren, gemeinsamer Gesamtzähler.

---

## 🚀 Schnellstart (lokal, ohne Firebase)

Voraussetzung: [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Die Konsole zeigt eine lokale Adresse (z. B. `http://localhost:5173`). Öffne sie –
und für den Live-Sync-Test ein **zweites Tab** daneben. Was du im einen Tab malst,
erscheint im anderen. (Im Demo-Modus liegen die Daten in deinem Browser.)

---

## 🔥 Firebase einrichten (für echten Sync zwischen zwei Geräten)

Dauert ~5 Minuten und ist kostenlos (Spark-Plan reicht locker).

1. **Projekt anlegen:** [console.firebase.google.com](https://console.firebase.google.com)
   → *Projekt hinzufügen*.
2. **Realtime Database:** linkes Menü → *Build → Realtime Database* →
   *Datenbank erstellen* → Region z. B. `europe-west1`, Start im
   *gesperrten Modus*.
3. **Anonyme Anmeldung:** *Build → Authentication → Sign-in method* →
   *Anonym* aktivieren. *(Wichtig – ohne das lädt die App nicht.)*
4. **Web-App registrieren:** Projektübersicht → Zahnrad → *Projekteinstellungen*
   → *Meine Apps* → Web `</>`. Aus dem angezeigten `firebaseConfig` brauchst du
   `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`.
5. **`.env` anlegen:** kopiere `.env.example` nach `.env` und trage die Werte ein:

   ```bash
   cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
   ```

6. **Sicherheitsregeln setzen:** in der Realtime Database → Reiter *Regeln* den
   Inhalt von [`database.rules.json`](database.rules.json) einfügen und
   veröffentlichen. (Sie verlangen Anmeldung und prüfen die Datenform.)
7. `npm run dev` neu starten – oben rechts verschwindet das „Demo-Modus"-Abzeichen,
   sobald Firebase aktiv ist.

---

## 🌍 Auf GitHub veröffentlichen (GitHub Pages)

Das Frontend ist eine statische Seite – ideal für GitHub Pages.

1. Repo auf GitHub anlegen und den Code pushen (inkl. Ordner `.github/`).
2. **Secrets hinterlegen:** Repo → *Settings → Secrets and variables → Actions*
   → *New repository secret*. Lege dieselben Namen wie in `.env` an
   (`VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_DATABASE_URL`,
   `VITE_FB_PROJECT_ID`, `VITE_FB_APP_ID`, optional `VITE_APP_PASSPHRASE`).
3. **Pages aktivieren:** Repo → *Settings → Pages* → *Build and deployment* →
   *Source: GitHub Actions*.
4. Push auf `main` → der Workflow [`deploy.yml`](.github/workflows/deploy.yml)
   baut & veröffentlicht automatisch. Die URL steht danach unter *Settings → Pages*.
5. **Firebase-Domain freigeben:** in Firebase → *Authentication → Settings →
   Authorized domains* deine `…​.github.io`-Domain hinzufügen.

> Jede Person bekommt ihren eigenen Direkt-Link mit vorgewähltem Profil:
> `…/?p=A` bzw. `…/?p=B`. Einmal öffnen – die Wahl wird auf dem Gerät gemerkt.

---

## 🗂️ Projektstruktur

```
src/
  config.js            # Stellschrauben: Grid-Größe, Kontingent, Palette, Profile
  App.jsx / Board.jsx  # Init + Login-Gate  /  Haupt-App & Kontingent-Logik
  hooks.js             # useQuota, useStats, useProfiles, useSnapshots, useNow
  auth/                # gemerktes Profil (localStorage) + Login-Screen
  data/
    backend.js         # wählt Mock ODER Firebase
    mockBackend.js     # lokal, Sync über BroadcastChannel (Browser-Tabs)
    firebaseBackend.js # Realtime Database + Anonymous Auth
  canvas/
    CanvasView.jsx     # Rendering-Loop, Zoom/Pan, Multi-Touch, Live-Subscription
    renderer.js        # 256×256-Offscreen-Bitmap, hochskaliert (harte Pixel)
    camera.js          # Screen↔Grid-Mathematik
    tools.js           # Pinsel, Flood-Fill, Herz-Stempel
  ui/                  # TopBar, Palette, Toolbar, Timeline
  styles/theme.css     # warmes, verspieltes Design
database.rules.json    # RTDB-Sicherheitsregeln
```

### Datenmodell (Realtime Database)

```jsonc
/pixels/{x}_{y} : { "c": "#ffcc00", "b": "A", "t": 1753711200000 }  // color, by, time
/quota/{A|B}    : { "date": "2026-07-28", "used": 37 }
/stats          : { "totalPlaced": 1428, "startedAt": 1753000000000 }
/snapshots/{YYYY-MM-DD} : { "png": "<dataURL>", "count": 512 }
/profiles/{A|B} : { "name": "Jonas", "emoji": "🦊" }
```

---

## 🔧 Anpassen

Fast alles steckt in [`src/config.js`](src/config.js):

- `GRID_SIZE` – Canvas-Größe (z. B. 128 für kleiner, 512 für größer).
- `DAILY_QUOTA` – Pixel pro Person und Tag.
- `TIMEZONE` – Zeitzone für den Tageswechsel.
- `PALETTE` – die Schnellwahl-Farben.
- `PROFILES` – Standard-Namen, Emojis und Akzentfarben (im UI später änderbar).

---

## ⚠️ Ein ehrlicher Hinweis zur „Sicherheit"

Das ist eine private Spielerei für zwei vertraute Menschen, kein Hochsicherheits-
system. Das Tages-Kontingent wird **im Browser** durchgesetzt, und das optionale
`VITE_APP_PASSPHRASE` steckt im ausgelieferten Code (also kein echtes Geheimnis) –
es hält höchstens zufällige Besucher der (nicht gelisteten) URL ab. Für zwei Leute,
die sich vertrauen, ist das genau richtig. Wer es später härten will, kann die
Kontingent-Prüfung in eine Firebase Cloud Function verlagern (Blaze-Plan).

Viel Spaß beim gemeinsamen Malen! 🎨💞
