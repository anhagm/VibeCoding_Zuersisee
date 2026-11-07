// Zeitfunktionen. Lokale Zeiten werden als "YYYY-MM-DDTHH:mm" in Europe/Zurich behandelt,
// genau so, wie Open-Meteo sie mit timezone=Europe/Zurich liefert.

import { ZEITZONE } from '../config.js';

const zwei = (n) => String(n).padStart(2, '0');

export function lokalIso(date = new Date()) {
  const teile = Object.fromEntries(
    new Intl.DateTimeFormat('de-CH', {
      timeZone: ZEITZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((t) => [t.type, t.value]),
  );
  return `${teile.year}-${teile.month}-${teile.day}T${teile.hour}:${teile.minute}`;
}

export function datumTeil(iso) {
  return iso.slice(0, 10);
}

export function stundeVon(iso) {
  return Number(iso.slice(11, 13));
}

// Rechnet mit naiven Lokalzeiten. Die Sommerzeit-Umstellung verschiebt hier höchstens eine Stunde.
export function plusStunden(iso, stunden) {
  const [d, t] = iso.split('T');
  const [y, m, tag] = d.split('-').map(Number);
  const [h, min] = (t || '00:00').split(':').map(Number);
  const x = new Date(Date.UTC(y, m - 1, tag, h + stunden, min));
  return `${x.getUTCFullYear()}-${zwei(x.getUTCMonth() + 1)}-${zwei(x.getUTCDate())}T${zwei(x.getUTCHours())}:${zwei(x.getUTCMinutes())}`;
}

export function stundeAbgerundet(iso) {
  return `${iso.slice(0, 13)}:00`;
}

export function plusTage(datum, tage) {
  return plusStunden(`${datum}T12:00`, tage * 24).slice(0, 10);
}

// Montag = 0 … Sonntag = 6
export function wochentag(datum) {
  const [y, m, d] = datum.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function wochenstart(datum) {
  return plusTage(datum, -wochentag(datum));
}

export function minutenZuText(min) {
  return `${zwei(Math.floor(min / 60))}:${zwei(min % 60)}`;
}

export function textZuMinuten(text) {
  const [h, m] = text.split(':').map(Number);
  return h * 60 + m;
}

export function dauerText(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

// Lokales Datum + Minuten seit Mitternacht → echter Zeitpunkt (Date), DST-korrekt.
export function lokalZuDate(datum, minuten) {
  const [y, m, d] = datum.split('-').map(Number);
  const ziel = `${datum}T${minutenZuText(minuten)}`;
  let guess = Date.UTC(y, m - 1, d, Math.floor(minuten / 60), minuten % 60) - 60 * 60000;
  for (let i = 0; i < 3; i++) {
    const ist = lokalIso(new Date(guess));
    const diff = (Date.parse(`${ziel}:00Z`) - Date.parse(`${ist}:00Z`));
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess);
}
