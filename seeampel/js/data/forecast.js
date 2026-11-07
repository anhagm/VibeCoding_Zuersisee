// Prognose von Open-Meteo, Modell MeteoSchweiz ICON-CH.

import { OPEN_METEO, STATIONEN, ZEITZONE } from '../config.js';

const STUNDLICH = ['temperature_2m', 'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m', 'weather_code', 'is_day'];

export function prognoseUrl(station, modell) {
  const s = STATIONEN[station];
  const p = new URLSearchParams({
    latitude: String(s.lat),
    longitude: String(s.lon),
    hourly: STUNDLICH.join(','),
    current: 'cloud_cover,is_day',
    models: modell,
    timezone: ZEITZONE,
    forecast_days: '2',
    wind_speed_unit: 'kmh',
  });
  return `${OPEN_METEO.url}?${p}`;
}

const zahlOderNull = (x) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? null : Number(x));

export function normalisierePrognose(json) {
  const h = json?.hourly;
  if (!h || !Array.isArray(h.time)) return null;
  const stunden = h.time.map((zeit, i) => ({
    zeit,
    luft: zahlOderNull(h.temperature_2m?.[i]),
    bewoelkung: zahlOderNull(h.cloud_cover?.[i]),
    windKmh: zahlOderNull(h.wind_speed_10m?.[i]),
    boeenKmh: zahlOderNull(h.wind_gusts_10m?.[i]),
    code: zahlOderNull(h.weather_code?.[i]),
    tag: h.is_day?.[i] === 1,
  }));
  const c = json.current || {};
  const aktuell = {
    bewoelkung: zahlOderNull(c.cloud_cover),
    tag: c.is_day === 1,
  };
  return { stunden, aktuell };
}

export async function ladePrognose(station, { signal } = {}) {
  let letzterFehler = null;
  for (const modell of OPEN_METEO.modelle) {
    try {
      const antwort = await fetch(prognoseUrl(station, modell), { signal });
      if (!antwort.ok) throw new Error(`Open-Meteo ${antwort.status}`);
      const json = await antwort.json();
      if (json.error) throw new Error(json.reason || 'Open-Meteo Fehler');
      return json;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      letzterFehler = err;
    }
  }
  const err = new Error(letzterFehler ? letzterFehler.message : 'Prognose nicht erreichbar');
  err.art = 'quelle';
  throw err;
}
