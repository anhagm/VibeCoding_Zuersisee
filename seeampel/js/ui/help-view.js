// Hilfe und Anleitung: aufklappbare Fragen. Direkt verlinkbar mit #hilfe/<id>.

import { h, ICON } from '../util/dom.js';
import { TOLERANZ, SCHWELLEN } from '../config.js';

const ABSCHNITTE = [
  {
    id: 'sterne',
    frage: 'Wie entstehen die Sterne?',
    absaetze: [
      'Ausgangspunkt ist die gemessene Wassertemperatur im Vergleich zu deiner Lieblingstemperatur. Liegt das Wasser höchstens 1 °C daneben, gibt es 5 Sterne. Je weiter es davon abweicht, desto weniger Sterne gibt es, bis hinunter zu 1 Stern.',
      `Wie schnell die Sterne abnehmen, bestimmt deine Toleranz. Bei «mittel» gibt es ${TOLERANZ.mittel} °C ausserhalb dieses Bereichs noch 3 Sterne und ${2 * TOLERANZ.mittel} °C ausserhalb noch 1 Stern. Bei «eng» sind die Schritte ${TOLERANZ.eng} °C, bei «weit» ${TOLERANZ.weit} °C. Dazwischen verläuft die Bewertung fliessend.`,
      `Danach kommen Zu- und Abzüge: Luft über ${SCHWELLEN.luftWarm} °C oder Sonne gibt einen halben Stern mehr. Luft unter ${SCHWELLEN.luftKalt} °C gibt einen halben Stern weniger, ausser deine Lieblingstemperatur liegt bei höchstens ${SCHWELLEN.kaltSchwimmerBis} °C. Wind ab ${SCHWELLEN.windKmh} km/h kostet einen ganzen Stern.`,
      'Die Bewertung liegt immer zwischen 1 und 5 Sternen und wird auf halbe Sterne gerundet. Der Satz unter den Sternen nennt den Faktor, der am meisten ausmacht.',
    ],
  },
  {
    id: 'warnung',
    frage: 'Warum zeigt die App 0 Sterne und eine Warnung?',
    absaetze: [
      `Bei gemessenen Böen ab ${SCHWELLEN.boeenVetoKmh} km/h oder wenn für die nächsten zwei Stunden ein Gewitter oder Sturmböen vorhergesagt sind, zeigt die App 0 Sterne und eine Warnung mit Uhrzeit. Das hat Vorrang vor allem anderen.`,
      'Das ist keine offizielle Unwetterwarnung. Offizielle Warnungen gibt MeteoSchweiz heraus. Im Zweifel: nicht schwimmen.',
    ],
  },
  {
    id: 'keine-sterne',
    frage: 'Warum sehe ich manchmal gar keine Sterne?',
    absaetze: [
      'Fehlt ein Messwert, ist er ungültig oder fehlt die Prognose, schätzt die App nichts. Sie zeigt dann einen Hinweis und den Knopf «Nochmals versuchen». Ohne Prognose lässt sich ein Gewitter nicht ausschliessen, deshalb gibt es auch dann keine Sterne.',
      'Ist die letzte Messung älter als drei Stunden, steht unten «veraltet», und das Wasser im Hintergrund wird trüb und still.',
    ],
  },
  {
    id: 'lila',
    frage: 'Was bedeutet die lila Schrift?',
    absaetze: [
      'Lila steht für Prognosen. Gemessene Werte zeigen, wie es jetzt ist. Prognosen zeigen, wie es werden könnte, und sind weniger sicher. Darum sind sie farblich getrennt und mit «Prognose» beschriftet.',
    ],
  },
  {
    id: 'hintergrund',
    frage: 'Was bedeutet das Wasser im Hintergrund?',
    absaetze: [
      'Jeder Effekt zeigt etwas an: Die Farbe folgt der Wassertemperatur. Lichtnetze und Lichtstrahlen erscheinen bei Sonne. Die Wellen werden mit dem Wind schneller. Bei Luft unter 12 °C beschlägt der Rand. Beim Gewitter wird das Wasser dunkel. Bei veralteten Daten wird es trüb und steht still.',
      'Wenn auf deinem Gerät «Bewegung reduzieren» eingeschaltet ist, bleibt nur die Farbe.',
    ],
  },
  {
    id: 'daten',
    frage: 'Woher kommen die Daten?',
    absaetze: [
      'Die Messwerte (Wasser, Luft, Wind, Böen) stammen von den Wetterstationen der Wasserschutzpolizei Zürich in Tiefenbrunnen und am Mythenquai, abgerufen über die Tecdottir-Schnittstelle. Sie kommen mit etwas Verzögerung.',
      'Die Prognose (Gewitter, Böen, Bewölkung) stammt von Open-Meteo mit dem Modell ICON-CH von MeteoSchweiz, unter der Lizenz CC BY 4.0.',
    ],
  },
  {
    id: 'schwimmart',
    frage: 'Was ändert sich zwischen «Geniessen» und «Trainieren»?',
    absaetze: [
      'Die Bewertung bleibt gleich. Es ändert sich, was dein Tagebuch zeigt: Beim Geniessen siehst du die Anzahl Schwümme und deine Zeit im Wasser. Beim Trainieren siehst du dein Tempo pro 100 m, deine Kilometer dieser Woche und dein Wochenziel als Linie im Diagramm. Geschätzte Strecken zählen zu den Kilometern, aber nicht zum Tempo, weil sie selbst aus einem angenommenen Tempo berechnet sind.',
    ],
  },
  {
    id: 'eintragen',
    frage: 'Wie trage ich einen Schwumm ein?',
    absaetze: [
      'Tippe auf «Schwumm eintragen». Wähle im Kalender den Tag, heute ist schon gewählt. Stell mit den Rädern ein, von wann bis wann du geschwommen bist, und gib die Strecke in Kilometern ein, mit Komma oder Punkt. Ein Kommentar ist freiwillig.',
      'Kennst du die Strecke nicht, tippe auf «Weiss ich nicht – schätzen» und wähle, wie du geschwommen bist: gemütlich (etwa 2 km/h), zügig (etwa 3 km/h) oder sportlich (etwa 4 km/h). Die App rechnet die Strecke aus der Dauer und markiert sie als geschätzt (≈). Unter dem Feld siehst du jederzeit, welchem Tempo deine Angaben entsprechen.',
      'Beim Speichern hängt die App die Messwerte der Badestelle zur Zeit deines Schwumms an. Ist ein Eintrag unmöglich, zum Beispiel schneller als Weltrekordtempo oder zeitgleich mit einem anderen, sagt dir ein Hinweis, was nicht stimmt.',
    ],
  },
  {
    id: 'meine-daten',
    frage: 'Wo sind meine Daten, und wie lösche ich sie?',
    absaetze: [
      'Profil und Tagebuch bleiben auf diesem Gerät, in diesem Browser. Es gibt kein Konto und keinen Server, der sie speichert. Andere Personen sehen sie nicht.',
      'Im Profil kannst du das Tagebuch als Tabelle (CSV) herunterladen oder als Sicherung, um es auf ein anderes Gerät zu übertragen. Ganz unten im Profil kannst du das Profil zurücksetzen oder alle Daten löschen.',
    ],
  },
  {
    id: 'installieren',
    frage: 'Wie installiere ich die App?',
    absaetze: [
      'iPhone: In Safari auf «Teilen» tippen, dann «Zum Home-Bildschirm».',
      'Android: In Chrome das Menü öffnen, dann «App installieren» oder «Zum Startbildschirm hinzufügen».',
      'Danach öffnet sich die Seeampel wie eine App und zeigt auch ohne Internet die zuletzt geladenen Daten, dann mit dem Hinweis «veraltet».',
    ],
  },
];

export function hilfeAnsicht(ctx, offenId = null) {
  const liste = ABSCHNITTE.map((a) => h('details', { class: 'karte faq', id: `hilfe-${a.id}`, open: a.id === offenId },
    h('summary', {}, h('span', { text: a.frage }), ICON.runter()),
    h('div', { class: 'faq-antwort' }, a.absaetze.map((t) => h('p', { text: t })))));

  if (offenId) {
    setTimeout(() => document.getElementById(`hilfe-${offenId}`)?.scrollIntoView({ block: 'start' }), 30);
  }

  return [
    h('div', { class: 'ansicht-titel' },
      h('button', { class: 'knopf knopf-text', type: 'button', onclick: () => (history.length > 1 ? history.back() : ctx.navigiere('#start')) }, ICON.links(), 'Zurück')),
    h('h1', { text: 'Hilfe und Anleitung' }),
    h('div', { class: 'faq-liste' }, liste),
  ];
}
