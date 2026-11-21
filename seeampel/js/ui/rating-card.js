// Bewertung (frei auf dem Wasser), Messkarte, Hinweise, Badestellen und Messzeit.

import { h, ICON, sterne } from '../util/dom.js';
import { zahl, ganz, uhrzeit, sterneText } from '../util/format.js';
import { vetoFenster, stundenVeto } from '../logic/rating.js';
import { stundeVon, stundeAbgerundet, plusStunden } from '../util/zeit.js';

const FEHLERTEXT = {
  quelle: ['Messwerte nicht erreichbar', 'Die Station oder die Prognose antwortet gerade nicht.'],
  ungueltig: ['Keine gültigen Messwerte', 'Die Station liefert im Moment unvollständige Werte.'],
  prognose: ['Prognose unvollständig', 'Ohne Prognose lässt sich ein Gewitter nicht ausschliessen.'],
};

export function bewertungKarte({ status, art, ergebnis, name = '', onNochmals }) {
  const fuer = `Jetzt · für ${name || 'dich'}`;
  const wieLink = () => h('a', { class: 'wie-link', href: '#hilfe/sterne', text: 'Wie entsteht die Bewertung?' });
  if (status === 'laden') {
    return h('section', { class: 'bewertung', 'aria-busy': 'true' },
      h('p', { class: 'bewertung-ort', text: fuer }),
      h('p', { class: 'laden-text', text: 'Messwerte werden geladen' }));
  }
  if (status === 'fehler') {
    const [titel, text] = FEHLERTEXT[art] || FEHLERTEXT.quelle;
    return h('section', { class: 'karte fehlerzustand', role: 'alert' },
      art === 'quelle' ? ICON.offline() : ICON.wellen(),
      h('h2', { text: titel }),
      h('p', { class: 'nebentext klein', text: `${text} Darum zeigt die Seeampel bewusst keine Sterne.` }),
      h('button', { class: 'knopf knopf-primaer', type: 'button', text: 'Nochmals versuchen', onclick: onNochmals }));
  }

  if (ergebnis.veto) {
    return h('section', { class: 'bewertung veto', 'aria-live': 'polite' },
      h('p', { class: 'bewertung-ort', text: fuer }),
      h('div', { class: 'veto-kopf' }, ICON.warn(), h('span', { class: 'veto-null', text: '0 Sterne' })),
      h('p', { class: 'satz', text: ergebnis.satz.text }),
      wieLink());
  }
  return h('section', { class: 'bewertung', 'aria-live': 'polite' },
    h('p', { class: 'bewertung-ort', text: fuer }),
    sterne(ergebnis.sterne),
    h('p', { class: `satz${ergebnis.satz.prognose ? ' prognose' : ''}`, text: ergebnis.satz.text }),
    wieLink());
}

function wert({ icon, label, wert, zusatz }) {
  return h('div', { class: 'messwert' },
    h('span', { class: 'messwert-label' }, icon, label),
    h('span', { class: 'messwert-wert', text: wert }),
    zusatz ? h('span', { class: 'messwert-zusatz', text: zusatz }) : null);
}

function alterText(min) {
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} min`;
  const std = Math.floor(min / 60);
  return `vor ${std} h ${min % 60} min`;
}

function prognoseText(prognose, jetzt) {
  const fenster = vetoFenster(prognose.stunden, jetzt);
  const g = fenster.find((s) => stundenVeto(s) === 'gewitter');
  const boeen = Math.max(...fenster.map((s) => s.boeenKmh ?? 0));
  const bis = stundeVon(plusStunden(stundeAbgerundet(jetzt), 3));
  return {
    bis,
    text: g ? `Gewitter möglich ab ${stundeVon(g.zeit)} Uhr, Böen bis ${ganz(boeen)} km/h` : `Kein Gewitter, Böen bis ${ganz(boeen)} km/h`,
  };
}

export function messKarte(messung, prognose, jetzt) {
  const p = prognoseText(prognose, jetzt);
  return h('section', { class: 'karte messkarte', 'aria-label': 'Messwerte' },
    h('span', { class: 'etikett', text: `Gemessen · ${alterText(messung.alterMin)}` }),
    h('div', { class: 'messwerte' },
      wert({ icon: ICON.wellen(), label: 'Wasser', wert: `${zahl(messung.wasser)}°` }),
      wert({ icon: ICON.thermometer(), label: 'Luft', wert: `${zahl(messung.luft)}°` }),
      wert({ icon: ICON.wind(), label: 'Wind', wert: `${ganz(messung.windKmh)} km/h`, zusatz: `Böen ${ganz(messung.boeenKmh)} km/h` })),
    h('div', { class: 'prognose-zeile' },
      h('span', { class: 'etikett prognose', text: `Prognose bis ${p.bis} Uhr` }),
      h('span', { text: p.text })));
}

function stundenStreifen(fenster) {
  if (!fenster?.stunden || fenster.stunden.length < 2) return null;
  const liste = fenster.stunden.slice(0, 12);
  const istBeste = (s) => fenster.art === 'fenster' && s.stunde >= fenster.von && s.stunde < fenster.bis;
  const titel = (s) => `${s.stunde} Uhr: ${sterneText(s.sterne)}`;
  return [
    h('div', { class: 'stundenstreifen', role: 'img', 'aria-label': `Prognose der Sterne pro Stunde: ${liste.map(titel).join(', ')}` },
      liste.map((s) => {
        const el = h('span', { class: istBeste(s) ? 'beste' : '', title: titel(s) });
        el.style.height = `${Math.max(6, (s.sterne / 5) * 100)}%`;
        return el;
      })),
    h('div', { class: 'stundenachse', 'aria-hidden': 'true' },
      liste.map((s) => h('span', { class: istBeste(s) ? 'beste' : '', text: String(s.stunde) }))),
  ];
}

export function hinweise({ fenster, vergleich, tipp, onWechsel }) {
  const liste = [];
  if (fenster) {
    liste.push(h('span', { class: 'etikett prognose', text: 'Heute · Prognose' }));
    const streifen = stundenStreifen(fenster);
    if (streifen) liste.push(...streifen);
    liste.push(h('p', { class: 'hinweis prognose' }, ICON.uhr(), h('span', { text: fenster.text })));
  }
  if (vergleich) {
    liste.push(h('button', { class: 'hinweis-knopf', type: 'button', onclick: onWechsel }, ICON.ort(), h('span', { text: vergleich.text })));
  }
  if (tipp) {
    liste.push(h('p', { class: 'hinweis' }, ICON.tasche(), h('span', { text: tipp })));
  }
  if (!liste.length) return null;
  return h('section', { class: 'karte hinweise', 'aria-label': 'Hinweise' }, liste);
}

// Beide Badestellen nebeneinander, nur am Desktop sichtbar.
export function badestellen({ orte, onWahl }) {
  return h('section', { class: 'orte nur-breit', 'aria-label': 'Badestellen' },
    orte.map((o) => h('button', {
      class: `ort${o.aktiv ? ' aktiv' : ''}`, type: 'button', 'aria-pressed': o.aktiv ? 'true' : 'false',
      onclick: o.aktiv ? null : () => onWahl(o.id),
    },
    h('span', { class: 'ort-name', text: o.name }),
    h('span', { class: 'ort-info', text: o.info }),
    h('span', { class: 'ort-sterne', text: o.sterne }))));
}

export function messzeit(messung, stationName) {
  return h('p', { class: 'messzeit' },
    `Gemessen um ${uhrzeit(messung.zeit)} Uhr, ${stationName}`,
    messung.veraltet ? h('span', { class: 'warnung', text: ' · veraltet' }) : null);
}
