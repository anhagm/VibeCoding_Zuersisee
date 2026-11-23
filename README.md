# Seeampel

**Lohnt es sich jetzt, im Zürichsee zu schwimmen – für mich?**

Die Seeampel macht aus den Messwerten der Wasserschutzpolizei Zürich und der Prognose von MeteoSchweiz eine persönliche Antwort: 0 bis 5 Sterne und genau ein Satz mit dem entscheidenden Grund. Für die Badestellen Tiefenbrunnen und Mythenquai, als Web-App (PWA) und als iOS-Widget.

Projekt im Modul Vibe Coding, HF Interaction Design, Schule für Gestaltung Zürich (Klasse HFIAD26), Anna Hagmayer, November 2026.

| | |
|---|---|
| App (PWA) | https://seeampel.vercel.app |
| Widget-Skript (Scriptable, iOS) | https://seeampel.vercel.app/widget/Seeampel.js |

## Aufbau des Repositorys

| Ordner | Inhalt |
|---|---|
| [`seeampel/`](seeampel/) | **Aktuelle Version 3 (Abgabe).** PWA, Proxy, Widget, Tests. Diesen Ordner veröffentlicht Vercel. Details im [README der App](seeampel/README.md). |
| [`seeampel-app/`](seeampel-app/) | Version 2 vom 7.11.2026, nur als Archiv. Nicht mehr live. |

Wichtige Stellen in `seeampel/`:

| Pfad | Aufgabe |
|---|---|
| `js/logic/rating.js` | Bewertung: Grundwertung, Zu- und Abschläge, Veto, Begründungssatz |
| `js/logic/` | Weitere reine Logik: bestes Zeitfenster, Vergleich, Seefarbe, Tagebuch |
| `js/config.js` | Alle Schwellen und Profile an einem Ort |
| `js/ui/` | Ansichten: Start, Profil, Tagebuch, Hilfe, Hintergrund |
| `api/messung.js` | Serverless-Funktion auf Vercel: Proxy zur Messstation (CORS, Cache) |
| `widget/Seeampel.js` | Widget für die iOS-App Scriptable, gleiche Logik wie die PWA |
| `tests/` | 45 Tests mit `node --test` |

## Was die Seeampel kann

- **Persönliche Bewertung:** Profil mit Lieblingstemperatur und Toleranz. Drei Schwimmtypen als Kurzwahl: Isbär (7°), Sünneler (23°), Gfrörli (25°). Das Profil verschiebt die ganze Bewertungskurve, darum zeigt dasselbe Wasser für jede Person eine andere Antwort.
- **Sicherheit vor Komfort:** Gewitter oder Sturmböen in den nächsten zwei Stunden ergeben 0 Sterne mit Uhrzeit.
- **Messung und Prognose getrennt:** Alles aus der Prognose ist lila. Ohne gültige Daten gibt es keine Sterne.
- **Kontext:** bestes Zeitfenster des Tages, Vergleich der beiden Badestellen, Tipp zum Mitnehmen.
- **Schwimmtagebuch:** Kalender, Strecke (auch geschätzt nach Tempo), Messwerte zum Zeitpunkt, Wochenziel, Export als CSV.
- **Gestaltung «Der See zeigt, was er weiss»:** Seefarbe, Licht, Wellen und Gewitterwasser folgen den echten Daten.
- **Widget:** Homescreen (klein, mittel, gross) und Sperrbildschirm, Profil-Einrichtung direkt im Skript.

## Ausprobieren ohne passendes Wetter

Der Testmodus simuliert Wetter, ohne echtes Profil oder Tagebuch zu verändern:

| Zustand | Link |
|---|---|
| Sommer, 5 Sterne | https://seeampel.vercel.app/?test=sonne |
| Gewitter-Warnung | https://seeampel.vercel.app/?test=veto_gewitter |
| Isbär bei 9° Wasser | https://seeampel.vercel.app/?test=kalt&profil=isbaer |
| Sünneler bei 9° Wasser | https://seeampel.vercel.app/?test=kalt&profil=suenneler |
| Andere Badestelle besser | https://seeampel.vercel.app/?test=besser |
| Messung veraltet | https://seeampel.vercel.app/?test=veraltet |
| Keine Verbindung | https://seeampel.vercel.app/?test=offline |
| Tagebuch mit Einträgen | https://seeampel.vercel.app/?test=training&name=Anna#tagebuch |
| Erster Start | https://seeampel.vercel.app/?test=erststart |

Optional: `&name=Anna`, `&uhr=10`, `&profil=isbaer|suenneler|gfroerli`. Im Widget: Parameter `test=veto_gewitter`.

Hinweis: Die Messstation liefert ihre Daten mit 2 bis 3 Stunden Verzögerung. Erscheint «Messung veraltet», ist das gewollt.

## Lokal starten und testen

```bash
cd seeampel
npx vercel dev            # mit Proxy, echte Daten
python3 -m http.server    # ohne Proxy, nur Testmodus
npm test                  # 45 Tests, keine Abhängigkeiten (Node 22)
```

## Technik

HTML, CSS und Vanilla JavaScript als ES-Module, ohne Framework und ohne Build-Schritt. Gehostet auf Vercel. Persönliche Daten bleiben auf dem Gerät (localStorage, IndexedDB), es gibt kein Login und keine Datenbank auf einem Server. Service Worker für Installation und Offline-Betrieb. Schriften Fraunces und Manrope lokal eingebunden (SIL Open Font License).

**Datenquellen:** Messwerte der Wasserschutzpolizei Zürich über die [Tecdottir-API](https://tecdottir.metaodi.ch). Prognose von [Open-Meteo](https://open-meteo.com), Modell MeteoSchweiz ICON-CH, CC BY 4.0. Keine offizielle Unwetterwarnung.

## Getestet

- **Geräte:** PWA auf iPhone (Safari und installiert), Android (durch eine Mitstudentin) und Mac (Chrome, Safari). Widget auf iPhone-Homescreen und Sperrbildschirm. Das Widget läuft nur auf iOS, weil Scriptable eine iOS-App ist.
- **Automatisch:** 45 Tests für Bewertung, Veto, Begründungssatz, Zeitfenster, Tagebuch, CSV und Farben. Ein Test vergleicht Widget und PWA mit 3000 zufälligen Wetterlagen. Barrierefreiheit mit axe in hell und dunkel ohne Befund.
- **Usability-Test 1 (mit Aufgaben, 1 Person):** Das Tagebuch war schwer zu finden, und die Namen der Schwimmtypen waren unklar. Gelöst mit einer immer sichtbaren Tagebuch-Karte und Beschreibungen mit Temperaturskala.
- **Usability-Test 2 (offen, mehrere Mitstudierende):** Freies Ausprobieren von PWA und Widget, ohne Aufgaben und ohne Fragebogen, eine Person davon auf Android.

## Entstehung

Entwickelt mit Vibe Coding (Claude von Anthropic). Konzept, Gestaltungs- und Produktentscheide stammen von mir; die KI hat umgesetzt, getestet und Varianten vorgeschlagen.

1. **Version 1 (Oktober):** Scriptable-Widget mit Profilen und Veto.
2. **Version 2 (7.11.):** Erste PWA auf Vercel, Ordner `seeampel-app/`.
3. **Version 3 (November):** Neubau mit Schwimmtagebuch, Gestaltung «Der See zeigt, was er weiss», neuem Widget und Massnahmen aus den Usability-Tests, Ordner `seeampel/`.
