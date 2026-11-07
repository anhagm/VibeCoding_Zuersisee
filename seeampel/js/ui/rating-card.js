// Bewertungskarte (Fokus), Messkarte, Hinweise und Messzeit.

import { h, ICON, sterne } from '../util/dom.js';
import { zahl, ganz, uhrzeit } from '../util/format.js';
import { vetoFenster, stundenVeto } from '../logic/rating.js';
import { stundeVon } from '../util/zeit.js';

const FEHLERTEXT = {
  quelle: ['Messwerte nicht erreichbar', 'Die Station oder die Prognose antwortet gerade nicht.'],
  ungueltig: ['Keine gültigen Messwerte', 'Die Station liefert im Moment unvollständige Werte.'],
  prognose: ['Prognose unvollständig', 'Ohne Prognose lässt sich ein Gewitter nicht ausschliessen.'],
};

export function bewertungKarte({ status, art, ergebnis, stationName, onNochmals }) {
  if (status === 'laden') {
    return h('section', { class: 'karte bewertung', 'aria-busy': 'true' },
      h('p', { class: 'bewertung-ort', text: stationName }),
      h('p', { class: 'laden-text', text: 'Messwerte werden geladen' }));
  }
  if (status === 'fehler') {
    const [titel, text] = FEHLERTEXT[art] || FEHLERTEXT.quelle;
    return h('section', { class: 'karte fehlerzustand', role: 'alert' },
      art === 'quelle' ? ICON.offline() : ICON.wellen(),
      h('p', { class: 'bewertung-ort', text: stationName }),
      h('h2', { text: titel }),
      h('p', { class: 'nebentext klein', text: `${text} Darum zeigt die Seeampel bewusst keine Sterne.` }),
      h('button', { class: 'knopf knopf-primaer', type: 'button', text: 'Nochmals versuchen', onclick: onNochmals }));
  }

  if (ergebnis.veto) {
    return h('section', { class: 'karte bewertung veto', 'aria-live': 'polite' },
      h('p', { class: 'bewertung-ort', text: `${stationName} · jetzt` }),
      ICON.warn(),
      h('p', { class: 'veto-null', text: '0 Sterne' }),
      h('p', { class: 'satz', text: ergebnis.satz.text }));
  }
  return h('section', { class: 'karte bewertung', 'aria-live': 'polite' },
    h('p', { class: 'bewertung-ort', text: `${stationName} · jetzt` }),
    sterne(ergebnis.sterne),
    h('p', { class: `satz${ergebnis.satz.prognose ? ' prognose' : ''}`, text: ergebnis.satz.text }));
}

function wert({ icon, label, wert, zusatz, prognose = false }) {
  return h('div', { class: `messwert${prognose ? ' prognose' : ''}` },
    h('span', { class: 'messwert-label' }, icon, label),
    h('span', { class: 'messwert-wert', text: wert }),
    zusatz ? h('span', { class: 'messwert-zusatz', text: zusatz }) : null);
}

function gewitterText(prognose, jetzt) {
  const fenster = vetoFenster(prognose.stunden, jetzt);
  const g = fenster.find((s) => stundenVeto(s) === 'gewitter');
  return g ? `möglich ab ${stundeVon(g.zeit)} Uhr` : 'keins bis in 2 h';
}

export function messKarte(messung, prognose, jetzt) {
  return h('section', { class: 'karte', 'aria-label': 'Messwerte' },
    h('div', { class: 'messwerte' },
      wert({ icon: ICON.wellen(), label: 'Wasser', wert: `${zahl(messung.wasser)} °C` }),
      wert({ icon: ICON.thermometer(), label: 'Luft', wert: `${zahl(messung.luft)} °C` }),
      wert({ icon: ICON.wind(), label: 'Wind', wert: `${ganz(messung.windKmh)} km/h`, zusatz: `Böen ${ganz(messung.boeenKmh)} km/h` }),
      wert({ icon: ICON.blitz(), label: 'Gewitter (Prognose)', wert: gewitterText(prognose, jetzt), prognose: true })));
}

export function hinweise({ fenster, vergleich, tipp, onWechsel }) {
  const liste = [];
  if (fenster) {
    liste.push(h('p', { class: 'hinweis prognose' }, ICON.uhr(), h('span', { class: 'prognose', text: fenster.text })));
  }
  if (vergleich) {
    liste.push(h('button', { class: 'hinweis-knopf', type: 'button', onclick: onWechsel }, ICON.ort(), h('span', { text: vergleich.text })));
  }
  if (tipp) {
    liste.push(h('p', { class: 'hinweis' }, ICON.tasche(), h('span', { text: tipp })));
  }
  if (!liste.length) return null;
  return h('section', { class: 'karte karte-flach hinweise', 'aria-label': 'Hinweise' }, liste);
}

export function messzeit(messung, stationName) {
  return h('p', { class: 'messzeit' },
    `Gemessen um ${uhrzeit(messung.zeit)} Uhr, ${stationName}`,
    messung.veraltet ? h('span', { class: 'warnung', text: ' · veraltet' }) : null);
}
