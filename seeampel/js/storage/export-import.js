// Tagebuch als JSON-Datei exportieren und wieder importieren.

import { STATIONEN } from '../config.js';
import { ueberschneidet } from '../logic/diary-validation.js';

const FORMAT = 'seeampel-tagebuch';

export function exportDatei(eintraege, heute) {
  const daten = { format: FORMAT, version: 1, exportiert: new Date().toISOString(), eintraege };
  const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seeampel-tagebuch-${heute}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function eintragGueltig(e) {
  return e && typeof e.id === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.datum) &&
    Number.isInteger(e.startMin) && Number.isInteger(e.endeMin) &&
    e.startMin >= 0 && e.endeMin <= 24 * 60 && e.endeMin > e.startMin &&
    Number.isFinite(e.strecke) && e.strecke > 0 &&
    Object.hasOwn(STATIONEN, e.station) &&
    (e.kommentar === undefined || (typeof e.kommentar === 'string' && e.kommentar.length <= 280));
}

// Gibt zurück, was neu übernommen wird und was übersprungen wurde.
export function pruefeImport(text, bestehende) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { fehler: 'Die Datei ist kein gültiges Tagebuch.' };
  }
  if (json?.format !== FORMAT || !Array.isArray(json.eintraege)) {
    return { fehler: 'Die Datei stammt nicht aus der Seeampel.' };
  }
  const ids = new Set(bestehende.map((e) => e.id));
  const neu = [];
  let uebersprungen = 0;
  for (const e of json.eintraege) {
    if (!eintragGueltig(e) || ids.has(e.id) ||
      [...bestehende, ...neu].some((b) => ueberschneidet(b, e))) {
      uebersprungen++;
      continue;
    }
    neu.push({ ...e, kommentar: e.kommentar || '' });
  }
  return { neu, uebersprungen };
}
