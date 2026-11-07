// Messwerte der Wasserschutzpolizei über den eigenen Proxy.

import { SCHWELLEN } from '../config.js';
import { msZuKmh } from '../util/format.js';

export function messwert(v) {
  if (!v || v.status !== 'ok' || v.value === null || v.value === undefined || v.value === '') return null;
  const n = Number(v.value);
  return Number.isFinite(n) ? n : null;
}

function windKmh(v) {
  const n = messwert(v);
  if (n === null) return null;
  return v.unit && /km\/?h/i.test(v.unit) ? n : msZuKmh(n);
}

// Wandelt die Proxy-Antwort in Messwerte um. Fehlt ein Pflichtwert, gibt es keinen Ersatz.
export function normalisiereMessung(json, jetztMs = Date.now()) {
  const v = json?.values || {};
  const messung = {
    wasser: messwert(v.water_temperature),
    luft: messwert(v.air_temperature),
    windKmh: windKmh(v.wind_speed_avg_10min),
    boeenKmh: windKmh(v.wind_gust_max_10min),
    windchill: messwert(v.windchill),
  };
  const zeit = json?.timestamp ? new Date(json.timestamp) : null;
  const fehlend = ['wasser', 'luft', 'windKmh', 'boeenKmh'].filter((k) => messung[k] === null);
  if (!zeit || Number.isNaN(zeit.getTime())) fehlend.push('zeit');
  if (fehlend.length) return { ok: false, fehler: 'ungueltig', fehlend };

  const alterMin = Math.max(0, Math.round((jetztMs - zeit.getTime()) / 60000));
  return { ok: true, messung: { ...messung, zeit, alterMin, veraltet: alterMin > SCHWELLEN.veraltetMinuten } };
}

export async function ladeMessung(station, { signal } = {}) {
  const antwort = await fetch(`/api/messung?station=${encodeURIComponent(station)}`, { signal, cache: 'no-store' });
  if (!antwort.ok) {
    const err = new Error(`Messung ${antwort.status}`);
    err.art = 'quelle';
    throw err;
  }
  return antwort.json();
}

// Messwerte zu einem vergangenen Zeitpunkt, für Tagebucheinträge. Gibt null zurück statt zu schätzen.
export async function ladeHistorischeMessung(station, date) {
  try {
    const antwort = await fetch(`/api/messung?station=${encodeURIComponent(station)}&zeit=${encodeURIComponent(date.toISOString())}`);
    if (!antwort.ok) return null;
    const n = normalisiereMessung(await antwort.json(), date.getTime());
    return n.ok ? n.messung : null;
  } catch {
    return null;
  }
}
