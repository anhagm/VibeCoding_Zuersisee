// Profil im localStorage. Kein Login, nur auf diesem Gerät.

import { TOLERANZ, STATIONEN, TEMP_MIN, TEMP_MAX } from '../config.js';

const KEY = 'seeampel.profil.v1';
let speicher = null;
const fluechtig = new Map();

// Im Testmodus wird das echte Profil nie angefasst.
export function nutzeFluechtigenSpeicher() {
  speicher = {
    getItem: (k) => (fluechtig.has(k) ? fluechtig.get(k) : null),
    setItem: (k, v) => fluechtig.set(k, v),
    removeItem: (k) => fluechtig.delete(k),
  };
}

function store() {
  if (speicher) return speicher;
  try {
    return window.localStorage;
  } catch {
    nutzeFluechtigenSpeicher();
    return speicher;
  }
}

export function profilGueltig(p) {
  return Boolean(p) &&
    Number.isFinite(p.lieblingstemperatur) && p.lieblingstemperatur >= TEMP_MIN && p.lieblingstemperatur <= TEMP_MAX &&
    Object.hasOwn(TOLERANZ, p.toleranz) &&
    Object.hasOwn(STATIONEN, p.station);
}

export const SCHWIMMARTEN = { geniessen: 'Zum Geniessen', trainieren: 'Zum Trainieren' };
export const NAME_MAX = 30;

// Name: freiwillig, ohne Steuerzeichen, gekürzt. Leer bleibt leer.
export function sauberName(name) {
  return String(name ?? '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

// Ältere Profile ohne die neuen Felder bekommen Standardwerte.
function ergaenze(p) {
  return {
    ...p,
    name: sauberName(p.name),
    art: Object.hasOwn(SCHWIMMARTEN, p.art) ? p.art : 'geniessen',
    wochenziel: Number.isFinite(p.wochenziel) && p.wochenziel >= 1 && p.wochenziel <= 100 ? p.wochenziel : 5,
  };
}

export function ladeProfil() {
  try {
    const p = JSON.parse(store().getItem(KEY));
    return profilGueltig(p) ? ergaenze(p) : null;
  } catch {
    return null;
  }
}

export function speichereProfil(p) {
  const sauber = ergaenze({
    lieblingstemperatur: Number(p.lieblingstemperatur),
    toleranz: p.toleranz,
    station: p.station,
    preset: p.preset || null,
    name: p.name,
    art: p.art,
    wochenziel: Number(p.wochenziel),
  });
  if (!profilGueltig(sauber)) throw new Error('Ungültiges Profil');
  store().setItem(KEY, JSON.stringify(sauber));
  return sauber;
}

export function loescheProfil() {
  try {
    store().removeItem(KEY);
  } catch { /* nichts zu löschen */ }
}
