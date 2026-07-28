# 🚀 Ablaufplan: Firebase einrichten & auf GitHub veröffentlichen

Diese Liste führt dich Schritt für Schritt durch alles. Hak die Punkte einfach ab.
Sachen, die **ich** schon erledigt habe, stehen ganz unten unter „Was schon fertig ist".

> **Reihenfolge lohnt sich:** erst Firebase (Teil 1–3), dann GitHub (Teil 4–6).
> Plane ~20–30 Minuten ein. Nichts davon kostet Geld (Firebase Spark-Plan).

---

## Teil 0 · Voraussetzungen
- [ ] **Google-Konto** (für Firebase) – hast du vermutlich schon.
- [ ] **GitHub-Konto** – falls nicht: https://github.com/signup
- [ ] **Node.js** ✅ (v24 ist installiert) und **Git** ✅ (v2.54 ist installiert).

---

## Teil 1 · Firebase-Projekt anlegen (im Browser)

1. [ ] Gehe zu **https://console.firebase.google.com** → **„Projekt hinzufügen"**.
2. [ ] Projektname, z. B. `pixel-art-jonas-lara` → Weiter.
       Google Analytics kannst du **deaktivieren** (brauchen wir nicht) → **Projekt erstellen**.
3. [ ] **Realtime Database anlegen:** linkes Menü **Build → Realtime Database** →
       **„Datenbank erstellen"** → Region **`europe-west1` (Belgien/Frankfurt)** →
       Sicherheitsregeln: **„Im gesperrten Modus starten"** → **Aktivieren**.
4. [ ] **Anonyme Anmeldung aktivieren:** linkes Menü **Build → Authentication** →
       **„Jetzt starten"** → Reiter **„Sign-in method"** → in der Liste **„Anonym"**
       anklicken → **aktivieren** → **Speichern**.
       ⚠️ *Ohne diesen Schritt lädt die App später nicht!*
5. [ ] **Web-App registrieren:** oben links **Zahnrad ⚙️ → Projekteinstellungen** →
       runterscrollen zu **„Meine Apps"** → **Web-Symbol `</>`** anklicken →
       Spitzname z. B. `Pixel Art` → **Firebase Hosting NICHT** ankreuzen →
       **„App registrieren"**.
6. [ ] Jetzt erscheint ein Codeblock `const firebaseConfig = { … }`.
       **Lass dieses Fenster offen** – die Werte brauchst du im nächsten Teil.

---

## Teil 2 · Firebase-Werte in die App eintragen (an deinem PC)

7. [ ] Öffne im Projektordner die Datei **`.env`** (habe ich schon angelegt) in einem Editor.
8. [ ] Übertrage die Werte aus `firebaseConfig` in die passenden Zeilen:

       | firebaseConfig      | → Zeile in `.env`        |
       |---------------------|--------------------------|
       | `apiKey`            | `VITE_FB_API_KEY=`       |
       | `authDomain`        | `VITE_FB_AUTH_DOMAIN=`   |
       | `databaseURL`       | `VITE_FB_DATABASE_URL=`  |
       | `projectId`         | `VITE_FB_PROJECT_ID=`    |
       | `appId`             | `VITE_FB_APP_ID=`        |

       ⚠️ **`databaseURL`** muss genau stimmen (endet bei europe-west1 auf
       `…-default-rtdb.europe-west1.firebasedatabase.app`). Falls die Zeile im
       Config-Block fehlt, findest du die URL oben in der Realtime Database.
       *(Optional: `VITE_APP_PASSPHRASE=` ein gemeinsames Wort als kleine Hürde.)*

9. [ ] Speichern. Dev-Server neu starten: im Terminal **`Strg + C`**, dann:
       ```bash
       npm run dev
       ```
10. [ ] **Kurztest:** Öffne http://localhost:5173, wähle „Jonas", setze ein Pixel.
        In der **Firebase Console → Realtime Database** sollte jetzt unter `/pixels`
        ein Eintrag auftauchen. In der Browser-Konsole (F12) steht
        `[Pixel Art] Datenquelle: FIREBASE`. 🎉

---

## Teil 3 · Sicherheitsregeln veröffentlichen

11. [ ] Firebase Console → **Realtime Database** → Reiter **„Regeln"**.
12. [ ] Den **kompletten Inhalt** der Datei **`database.rules.json`** (liegt im Projekt)
        in das Regel-Feld kopieren → **„Veröffentlichen"**.
        *Diese Regeln verlangen Anmeldung und prüfen die Datenform – vorher (locked
        mode) würde die App keine Daten schreiben dürfen.*

> 💡 Alternative per Kommandozeile (statt Schritt 11–12):
> ```bash
> npm install -g firebase-tools
> firebase login
> firebase use --add        # dein Projekt auswählen
> firebase deploy --only database
> ```

---

## Teil 4 · Code auf GitHub hochladen

13. [ ] Neues Repo anlegen: **https://github.com/new** →
        Name z. B. `pixel-art` → Sichtbarkeit **Privat** (empfohlen) →
        **KEINE** Haken bei „Add a README / .gitignore / license" (leer lassen) →
        **„Create repository"**.
14. [ ] Ich habe lokal schon `git init` + einen ersten Commit gemacht. Verbinde das
        Repo mit GitHub und lade es hoch – GitHub zeigt dir unter
        *„…or push an existing repository from the command line"* genau diese Zeilen
        (mit deinem Namen statt `<DEIN-NAME>`):
        ```bash
        git remote add origin https://github.com/<DEIN-NAME>/pixel-art.git
        git branch -M main
        git push -u origin main
        ```
        - Beim Push wirst du evtl. nach Login gefragt → am einfachsten über den
          Browser-Login-Popup, oder ein **Personal Access Token** als Passwort
          (Anleitung: https://github.com/settings/tokens). Alternativ **GitHub Desktop**.

---

## Teil 5 · GitHub Pages aktivieren & Secrets setzen

15. [ ] Im Repo: **Settings → Secrets and variables → Actions → „New repository secret"**.
        Lege **dieselben** Werte wie in deiner `.env` an (Name → Wert):
        - [ ] `VITE_FB_API_KEY`
        - [ ] `VITE_FB_AUTH_DOMAIN`
        - [ ] `VITE_FB_DATABASE_URL`
        - [ ] `VITE_FB_PROJECT_ID`
        - [ ] `VITE_FB_APP_ID`
        - [ ] `VITE_APP_PASSPHRASE` *(nur falls du eins nutzt)*
16. [ ] Im Repo: **Settings → Pages** → unter „Build and deployment" bei **Source**
        **„GitHub Actions"** auswählen.
17. [ ] Der Deploy läuft ab jetzt **automatisch bei jedem Push auf `main`**.
        Fortschritt siehst du im Reiter **„Actions"**. Nach 1–2 Min ist die Seite live;
        die URL steht unter **Settings → Pages** (Form:
        `https://<dein-name>.github.io/pixel-art/`).
        - Falls der allererste Lauf fehlschlug, weil Pages noch nicht aktiv war:
          in **Actions** den Workflow **„Re-run all jobs"**.

---

## Teil 6 · Firebase für die Live-Domain freigeben ⚠️ (nicht vergessen!)

18. [ ] Firebase Console → **Authentication → Settings → „Authorized domains"** →
        **„Domain hinzufügen"** → deine GitHub-Pages-Domain eintragen –
        **nur den Host**, also z. B. `dein-name.github.io` (ohne `https://` und ohne Pfad).
        *Ohne diesen Schritt funktioniert die anonyme Anmeldung auf der
        veröffentlichten Seite nicht.*

---

## Teil 7 · Zu zweit testen 💛

19. [ ] Öffne die `…github.io/pixel-art/`-URL auf **deinem** Gerät → wähle **Jonas**
        (oder Direktlink `…/pixel-art/?p=A`).
20. [ ] **Lara** öffnet dieselbe URL auf **ihrem** Gerät → wählt **Lara**
        (oder `…/pixel-art/?p=B`).
21. [ ] Einer setzt ein Pixel → beim anderen blitzt es **live** auf. Fertig! 🎨

---

## Später etwas ändern & neu veröffentlichen
Code ändern, dann:
```bash
git add -A
git commit -m "beschreibung der aenderung"
git push
```
GitHub Pages baut automatisch neu. Fertig.

---

## Was ich schon für dich fertig gemacht habe ✅
- Komplette App (läuft), Production-Build getestet.
- **`.env`** angelegt (nur noch Werte eintragen) – ist von GitHub ausgeschlossen.
- **`database.rules.json`** – die fertigen Sicherheitsregeln zum Reinkopieren.
- **`firebase.json`** – falls du die Regeln lieber per CLI deployen willst.
- **`.github/workflows/deploy.yml`** – automatischer Build & Deploy zu GitHub Pages.
- **`.gitignore`** – schützt `.env` und `node_modules` vorm Hochladen.
- **Git-Repo initialisiert** inkl. erstem Commit – du musst es nur noch mit GitHub
  verbinden und pushen (Teil 4).

Wenn irgendwo etwas hakt: sag mir genau, an welchem Schritt und was auf dem Schirm
steht – dann lotse ich dich durch. 🙂
