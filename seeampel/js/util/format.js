// Formatierung in Schweizer Schreibweise.

import { ZEITZONE } from '../config.js';

const zahlFmt = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 1 });
const kmFmt = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 });

export const ganz = (x) => Math.round(x);
export const zahl = (x) => zahlFmt.format(x);
export const km = (x) => kmFmt.format(x);

export function msZuKmh(ms) {
  return ms * 3.6;
}

export function sterneText(s) {
  return s === 1 ? '1 Stern' : `${zahl(s)} Sterne`;
}

export function uhrzeit(date) {
  return new Intl.DateTimeFormat('de-CH', { timeZone: ZEITZONE, hour: '2-digit', minute: '2-digit' }).format(date);
}

export function datumLang(datum) {
  const [y, m, d] = datum.split('-').map(Number);
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function datumKurz(datum) {
  const [y, m, d] = datum.split('-').map(Number);
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function monatTitel(jahr, monat) {
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(jahr, monat - 1, 1)));
}
