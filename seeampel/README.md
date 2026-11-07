# Seeampel

PWA für Menschen in Zürich, die im Zürichsee schwimmen: Bewertung von 0 bis 5 Sternen für die gewählte Badestelle und ein Schwimmtagebuch. HTML, CSS und Vanilla JavaScript als ES-Module, ohne Framework und ohne Build-Schritt. Gehostet auf Vercel.

## Lokal starten

Wegen der ES-Module braucht es einen Server, Doppelklick auf `index.html` reicht nicht.

```bash
npx vercel dev        # mit Proxy /api/messung, echte Daten
# oder ohne Proxy, nur für den Testmodus:
python3 -m http.server 8000
```

## Testmodus

`?test=<szenario>`, optional mit `&uhr=14` für eine feste Uhrzeit. Echtes Profil und echtes Tagebuch bleiben unberührt (eigene Datenbank `seeampel-test`).

| Szenario | Zustand |
|---|---|
| `normal` | 19° Wasser, mässig |
| `sonne`, `perfekt` | Zuschlag durch Sonne bzw. Lieblingstemperatur |
| `wind` | Abzug durch Wind ab 20 km/h |
| `kalt` | kalte Luft, Windchill-Tipp |
| `veto_gewitter`, `veto_sturm`, `veto_boeen` | 0 Sterne mit Warnung |
| `ungueltig` | Messwert mit Status nicht "ok" |
| `offline` | Quelle nicht erreichbar |
| `veraltet` | Messung älter als 3 Stunden |
| `besser` | andere Badestelle mindestens einen Stern besser |
| `tagebuch`, `leer` | mit Beispieleinträgen bzw. leer |
| `erststart` | Profilanlage |

## Tests

```bash
npm test
```

Die Bewertungslogik in `js/logic/` besteht aus reinen Funktionen ohne DOM und ohne Netz, deshalb laufen die Tests direkt mit Node.

## Festlegungen, die nicht in der Spezifikation stehen

- Toleranz T: eng 2 °C, mittel 3 °C, weit 4 °C (`js/config.js`).
- Das beste Zeitfenster verwendet die gemessene Wassertemperatur und die stündliche Prognose für Luft, Wind und Bewölkung, nur Stunden mit Tageslicht, höchstens drei Stunden lang. Stunden, auf die innert zwei Stunden ein Gewitter oder Sturmböen folgen, zählen wie beim Veto als 0 Sterne.
- Tagebucheinträge erhalten die Messwerte der Station zum Startzeitpunkt des Schwumms (über `/api/messung?station=…&zeit=…`, ±60 min), nicht die aktuellen. Gibt es keine, wird der Eintrag ohne Messwerte gespeichert.
- Kennzahlen über dem Diagramm beziehen sich auf die letzten acht Wochen.

## Deployment

Repository-Wurzel = dieser Ordner, Vercel-Preset "Other", keine Build-Einstellungen. Nach jeder Änderung an App-Dateien in `sw.js` die `VERSION` erhöhen.
