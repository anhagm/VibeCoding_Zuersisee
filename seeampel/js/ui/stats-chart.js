// Überblick: Kilometer pro Woche der letzten acht Wochen, darüber drei Kennzahlen.
// Die Kennzahlen hängen von der Schwimmart ab: Geniessen zeigt Zeit im Wasser, Trainieren Tempo und Wochenziel.

import { h, svg, ICON } from '../util/dom.js';
import { km, datumKurz } from '../util/format.js';
import { dauerText } from '../util/zeit.js';
import { wochenStatistik, paceText } from '../logic/diary-stats.js';

export { wochenStatistik };

const kw = (datum) => {
  const [y, m, d] = datum.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 3));
  const jan4 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
};

function kennzahl(wert, label) {
  return h('div', {}, h('div', { class: 'kennzahl-wert', text: wert }), h('div', { class: 'kennzahl-label', text: label }));
}

// Kopf der Karte: Der Name "Schwimmtagebuch" führt ins Tagebuch, der Knopf direkt zum neuen Eintrag.
function kartenKopf(onOeffnen, untertitel) {
  return h('button', { class: 'karten-kopf', type: 'button', onclick: onOeffnen, 'aria-label': 'Schwimmtagebuch öffnen' },
    h('span', {}, h('span', { class: 'karten-titel', text: 'Schwimmtagebuch' }), untertitel ? h('span', { class: 'karten-untertitel', text: untertitel }) : null),
    ICON.rechts());
}

export function statistikKarte(eintraege, heute, { onEintragen, onOeffnen, art = 'geniessen', wochenziel = 5 }) {
  const training = art === 'trainieren';
  const st = wochenStatistik(eintraege, heute);

  if (!eintraege.length) {
    return h('section', { class: 'karte tagebuch-karte leer-zustand', 'aria-label': 'Schwimmtagebuch' },
      kartenKopf(onOeffnen, null),
      h('p', { class: 'nebentext', text: 'Noch keine Schwümme eingetragen' }),
      h('button', { class: 'knopf knopf-primaer', type: 'button', text: 'Ersten Schwumm eintragen', onclick: onEintragen }));
  }

  const B = 320, H = 132, unten = 20, oben = 16;
  const max = Math.max(1, ...st.wochen.map((w) => w.km), training ? wochenziel : 0);
  const spalte = B / st.wochen.length;
  const breite = Math.min(22, spalte - 14);
  const hoeheMax = H - unten - oben;

  const balken = st.wochen.map((w, i) => {
    const x = i * spalte + (spalte - breite) / 2;
    const hb = w.km > 0 ? Math.max(4, (w.km / max) * hoeheMax) : 2;
    const y = H - unten - hb;
    const r = w.km > 0 ? 4 : 1;
    const pfad = `M${x},${H - unten} V${y + r} Q${x},${y} ${x + r},${y} H${x + breite - r} Q${x + breite},${y} ${x + breite},${y + r} V${H - unten} Z`;
    const titel = `KW ${kw(w.start)} (ab ${datumKurz(w.start)}): ${km(w.km)} km, ${w.anzahl} ${w.anzahl === 1 ? 'Schwumm' : 'Schwümme'}`;
    const istMax = w.km === max && w.km > 0;
    const letzte = i === st.wochen.length - 1;
    return `<g>
      <title>${titel}</title>
      <rect x="${i * spalte}" y="0" width="${spalte}" height="${H}" fill="transparent"/>
      <path class="${w.km > 0 ? 'balken' : 'balken-leer'}" d="${pfad}"/>
      ${(istMax || (letzte && w.km > 0)) ? `<text class="wert" x="${x + breite / 2}" y="${y - 5}" text-anchor="middle">${km(Math.round(w.km * 10) / 10)}</text>` : ''}
      <text class="achse" x="${x + breite / 2}" y="${H - 5}" text-anchor="middle">${letzte ? 'diese' : `KW ${kw(w.start)}`}</text>
    </g>`;
  }).join('');

  // Beim Trainieren: gestrichelte Linie fürs Wochenziel.
  const zielY = H - unten - (wochenziel / max) * hoeheMax;
  const ziellinie = training
    ? `<line class="ziel" x1="0" x2="${B}" y1="${zielY}" y2="${zielY}" stroke-dasharray="4 4"/><text class="ziel-text" x="${B}" y="${zielY - 4}" text-anchor="end">Ziel ${km(wochenziel)} km</text>`
    : '';

  const tabelle = h('table', { class: 'visuell-versteckt' },
    h('caption', { text: 'Kilometer pro Woche' }),
    h('tbody', {}, st.wochen.map((w) => h('tr', {}, h('th', { text: `KW ${kw(w.start)}` }), h('td', { text: `${km(w.km)} km` })))));

  return h('section', { class: 'karte tagebuch-karte', 'aria-label': 'Schwimmtagebuch' },
    kartenKopf(onOeffnen, 'Letzte 8 Wochen'),
    training
      ? h('div', { class: 'statistik-kopf' },
        kennzahl(`${km(Math.round(st.dieseWoche * 10) / 10)} / ${km(wochenziel)} km`, 'diese Woche'),
        kennzahl(`${paceText(st.pace100)}`, 'Ø min pro 100 m'),
        kennzahl(`${km(Math.round(st.total * 10) / 10)} km`, 'in 8 Wochen'))
      : h('div', { class: 'statistik-kopf' },
        kennzahl(String(st.anzahl), st.anzahl === 1 ? 'Schwumm' : 'Schwümme'),
        kennzahl(st.minuten ? dauerText(st.minuten) : '–', 'im Wasser'),
        kennzahl(`${km(Math.round(st.total * 10) / 10)} km`, 'geschwommen')),
    h('div', { class: 'diagramm', 'aria-hidden': 'true' },
      svg(`<svg viewBox="0 0 ${B} ${H}" role="presentation">
        <line x1="0" x2="${B}" y1="${H - unten}" y2="${H - unten}" stroke="currentColor" stroke-opacity=".12"/>
        ${balken}${ziellinie}</svg>`)),
    tabelle,
    h('p', { class: 'sehr-klein nebentext', text: 'Kilometer pro Woche' }),
    h('button', { class: 'knopf knopf-primaer knopf-breit', type: 'button', onclick: onEintragen }, ICON.plus(), 'Schwumm eintragen'));
}
