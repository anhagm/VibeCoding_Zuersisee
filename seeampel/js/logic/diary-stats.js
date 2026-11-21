// Kennzahlen fürs Schwimmtagebuch. Reine Funktionen.

import { wochenstart, plusTage } from '../util/zeit.js';
import { TEMPO, TAGEBUCH } from '../config.js';

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
  // Tempo nur aus selbst eingegebenen Strecken: geschätzte beruhen auf einem angenommenen Tempo.
  const gemessen = imZeitraum.filter((e) => !e.geschaetzt);
  const kmGemessen = gemessen.reduce((s, e) => s + e.strecke, 0);
  const minGemessen = gemessen.reduce((s, e) => s + dauerMin(e), 0);
  return {
    wochen,
    anzahl: imZeitraum.length,
    total,
    minuten,
    laengster: imZeitraum.reduce((m, e) => Math.max(m, e.strecke), 0),
    dieseWoche: wochen[7].km,
    // Tempo als Minuten pro 100 m, über alle Schwümme der acht Wochen.
    pace100: kmGemessen > 0 ? minGemessen / (kmGemessen * 10) : null,
    geschaetzte: imZeitraum.length - gemessen.length,
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
  if (e.geschaetzt) return null;
  return e.strecke > 0 ? (e.endeMin - e.startMin) / (e.strecke * 10) : null;
}

// Strecke aus Dauer und Schwimmart, auf 0,1 km gerundet, mindestens 0,1 km.
export function schaetzeStrecke(dauerMin, art) {
  const t = TEMPO.schaetzen[art];
  if (!t || !(dauerMin > 0)) return null;
  return Math.max(0.1, Math.round((t.kmh * dauerMin) / 60 * 10) / 10);
}

// Tempo während der Eingabe: km/h, min pro 100 m und eine Einordnung. null, wenn nichts zu sagen ist.
export function tempoHinweis(streckeKm, dauerMin) {
  if (!(streckeKm > 0) || !(dauerMin > 0)) return null;
  const kmh = streckeKm / (dauerMin / 60);
  const pace = dauerMin / (streckeKm * 10);
  if (kmh > TAGEBUCH.maxTempoKmh) return { kmh, pace, text: 'unrealistisch schnell', warnung: true };
  const klasse = TEMPO.klassen.find((k) => kmh <= k.bis) || TEMPO.klassen.at(-1);
  return { kmh, pace, text: klasse.text, warnung: false };
}
