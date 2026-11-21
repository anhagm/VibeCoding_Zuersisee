// Kennzahlen fürs Schwimmtagebuch. Reine Funktionen.

import { wochenstart, plusTage } from '../util/zeit.js';

const dauerMin = (e) => e.endeMin - e.startMin;

export function wochenStatistik(eintraege, heute) {
  const aktuelleWoche = wochenstart(heute);
  const wochen = Array.from({ length: 8 }, (_, i) => {
    const start = plusTage(aktuelleWoche, (i - 7) * 7);
    return { start, ende: plusTage(start, 6), km: 0, anzahl: 0 };
  });
  const erste = wochen[0].start;
  const imZeitraum = eintraege.filter((e) => e.datum >= erste && e.datum <= heute);
  for (const e of imZeitraum) {
    const w = wochen.find((x) => e.datum >= x.start && e.datum <= x.ende);
    if (w) { w.km += e.strecke; w.anzahl++; }
  }
  const total = imZeitraum.reduce((s, e) => s + e.strecke, 0);
  const minuten = imZeitraum.reduce((s, e) => s + dauerMin(e), 0);
  return {
    wochen,
    anzahl: imZeitraum.length,
    total,
    minuten,
    laengster: imZeitraum.reduce((m, e) => Math.max(m, e.strecke), 0),
    dieseWoche: wochen[7].km,
    // Tempo als Minuten pro 100 m, über alle Schwümme der acht Wochen.
    pace100: total > 0 ? minuten / (total * 10) : null,
  };
}

// 2.0833 → "2:05"
export function paceText(minProHundert) {
  if (minProHundert == null || !Number.isFinite(minProHundert)) return '–';
  let min = Math.floor(minProHundert);
  let sek = Math.round((minProHundert - min) * 60);
  if (sek === 60) { min += 1; sek = 0; }
  return `${min}:${String(sek).padStart(2, '0')}`;
}

export function paceEintrag(e) {
  return e.strecke > 0 ? (e.endeMin - e.startMin) / (e.strecke * 10) : null;
}
