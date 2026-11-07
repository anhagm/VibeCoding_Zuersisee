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

export function ladeProfil() {
  try {
    const p = JSON.parse(store().getItem(KEY));
    return profilGueltig(p) ? p : null;
  } catch {
    return null;
  }
}

export function speichereProfil(p) {
  const sauber = {
    lieblingstemperatur: Number(p.lieblingstemperatur),
    toleranz: p.toleranz,
    station: p.station,
    preset: p.preset || null,
  };
  if (!profilGueltig(sauber)) throw new Error('Ungültiges Profil');
  store().setItem(KEY, JSON.stringify(sauber));
  return sauber;
}
