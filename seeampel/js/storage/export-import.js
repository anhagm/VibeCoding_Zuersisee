// Tagebuch als JSON-Datei exportieren und wieder importieren.

import { STATIONEN } from '../config.js';
import { ueberschneidet } from '../logic/diary-validation.js';

const FORMAT = 'seeampel-tagebuch';

const zweiStellen = (n) => String(n).padStart(2, '0');
const zeit = (min) => `${zweiStellen(Math.floor(min / 60))}:${zweiStellen(min % 60)}`;

// Ein Feld für CSV: Semikolon, Anführungszeichen und Zeilenumbrüche werden geschützt.
// Beginnt ein Text mit = + - @, wird ein Apostroph vorangestellt, damit Excel ihn nicht als Formel ausführt.
export function csvFeld(wert) {
  if (wert === null || wert === undefined) return '';
  let t = String(wert);
  if (typeof wert === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

// Tagebuch als CSV für Excel, Numbers und Google Sheets: Semikolon, UTF-8 mit BOM, Punkt als Dezimalzeichen.
export function tagebuchCsv(eintraege, stationName = (id) => id) {
  const kopf = ['Datum', 'Von', 'Bis', 'Dauer (min)', 'Strecke (km)', 'Tempo (min/100 m, dezimal)', 'Badestelle', 'Wasser (°C)', 'Luft (°C)', 'Wind (km/h)', 'Kommentar'];
  const sortiert = [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum) || a.startMin - b.startMin);
  const zeilen = sortiert.map((e) => {
    const dauer = e.endeMin - e.startMin;
    const pace = e.strecke > 0 ? dauer / (e.strecke * 10) : null;
    const mw = e.messwerte || {};
    const r1 = (x) => (x == null ? '' : (Math.round(x * 10) / 10).toFixed(1));
    return [
      e.datum, zeit(e.startMin), zeit(e.endeMin), dauer, e.strecke,
      pace == null ? '' : pace.toFixed(2), stationName(e.station),
      r1(mw.wasser), r1(mw.luft), mw.windKmh == null ? '' : Math.round(mw.windKmh), e.kommentar || '',
    ].map(csvFeld).join(';');
  });
  return `\uFEFF${[kopf.join(';'), ...zeilen].join('\r\n')}\r\n`;
}

function herunterladen(inhalt, typ, dateiname) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvDatei(eintraege, heute, stationName) {
  herunterladen(tagebuchCsv(eintraege, stationName), 'text/csv;charset=utf-8', `seeampel-tagebuch-${heute}.csv`);
}

export function exportDatei(eintraege, heute) {
  const daten = { format: FORMAT, version: 1, exportiert: new Date().toISOString(), eintraege };
  herunterladen(JSON.stringify(daten, null, 2), 'application/json', `seeampel-sicherung-${heute}.json`);
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
