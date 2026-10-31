[README.md](https://github.com/user-attachments/files/34214370/README.md)
# Seeampel

Lohnt es sich jetzt, im Zürichsee zu schwimmen – für mich?
Web-App (PWA) mit drei Profilen: Isbär, Sünneler, Gfrörli.

## Dateien

| Datei | Aufgabe |
|---|---|
| `index.html` | Grundgerüst, PWA-Einbindung, Quellenangaben |
| `styles.css` | Gestaltung, Hell-/Dunkelmodus |
| `app.js` | Bewertung (`rate()`), Datenabruf, Darstellung, Profilwahl, Testmodus |
| `api/messung.js` | Serverless-Funktion auf Vercel: holt die Messung (CORS + Cache) |
| `manifest.webmanifest` | Macht die Seite installierbar (Name, Icons, Farben) |
| `sw.js` | Service Worker: App-Hülle offline, letzte Daten bei fehlendem Netz |
| `icons/` | App-Icons (192, 512, maskable, Apple) |
| `vercel.json` | Header für Service Worker und Manifest |

## Testmodus

An die Adresse anhängen: `?test=normal`, `wind`, `kalt`, `hitze`, `veto_boeen`,
`veto_gewitter`, `ungueltig`, `offline`, `prognose_fehlt`, `veraltet`.
Beispiel: `https://deine-adresse.vercel.app/?test=veto_gewitter`

## Veröffentlichen (erstes Deployment)

1. **GitHub:** Auf github.com → „New repository“ → Name `seeampel` → Public → Create.
   Dann „uploading an existing file“ → den **Inhalt** dieses Ordners hineinziehen
   (inkl. Ordner `api` und `icons`) → „Commit changes“.
2. **Vercel:** Auf vercel.com → „Add New…“ → „Project“ → GitHub verbinden →
   Repository `seeampel` → „Import“. Framework Preset: **Other**. Nichts weiter ändern → „Deploy“.
3. **Prüfen:** Die Adresse öffnen (`…vercel.app`). Dann `…vercel.app/api/messung` öffnen:
   Dort muss JSON der Messstation erscheinen. Wenn nicht: in Vercel unter „Logs“ nachsehen.
4. **Auf dem iPhone installieren:** Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

Jede spätere Änderung auf GitHub veröffentlicht Vercel automatisch neu.
Wer `app.js`, `styles.css` oder `index.html` ändert, erhöht in `sw.js` die `VERSION`,
sonst sehen installierte Apps die alte Version.

## Quellen und Lizenzen

- Messwerte: Wasserschutzpolizei Zürich (Open Data Stadt Zürich), via Tecdottir-API
- Prognose: Open-Meteo, Modell MeteoSchweiz ICON-CH, CC BY 4.0
- Keine offizielle Unwetterwarnung.
