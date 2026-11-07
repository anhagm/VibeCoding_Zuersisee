// Testmodus: ?test=<szenario>[&uhr=14]. Liefert Rohdaten im Format der echten Quellen,
// damit auch die Umwandlung getestet wird. Kein echtes Wetter, kein Schreiben ins echte Tagebuch.

import { datumTeil, plusStunden, plusTage, lokalZuDate, textZuMinuten } from '../util/zeit.js';

const BASIS = { wasser: 19, luft: 20, wind: 2, boeen: 4, windchill: 19, bewoelkung: 45, gewitterAb: null, sturmAb: null, alterMin: 40, status: 'ok' };

export const SZENARIEN = {
  normal: {},
  sonne: { wasser: 21.4, luft: 25, bewoelkung: 10, windchill: 25 },
  perfekt: { wasser: 23.2, luft: 24, bewoelkung: 15 },
  wind: { wasser: 17.2, luft: 16, wind: 7, boeen: 10, windchill: 12 },
  kalt: { wasser: 9.1, luft: 4, wind: 3, boeen: 5, windchill: 2, bewoelkung: 90 },
  veto_gewitter: { wasser: 22, luft: 27, bewoelkung: 60, gewitterAb: 1 },
  veto_sturm: { wasser: 20, luft: 18, bewoelkung: 70, sturmAb: 2 },
  veto_boeen: { wasser: 18, luft: 15, wind: 8, boeen: 14 },
  ungueltig: { status: 'broken' },
  veraltet: { alterMin: 300 },
  offline: { offline: true },
  besser: { wind: 6.5, boeen: 9, mythenquai: { wind: 1.5, boeen: 3 } },
  tagebuch: { tagebuch: 'beispiel' },
  leer: { tagebuch: 'leer' },
  erststart: { erststart: true },
};

export function szenario(name) {
  const s = SZENARIEN[name];
  return s ? { name, ...BASIS, ...s } : null;
}

function werte(s, station) {
  return { ...s, ...(station === 'mythenquai' ? s.mythenquai || {} : {}) };
}

export function testMessungJson(s, station, jetztDate) {
  const w = werte(s, station);
  return {
    station,
    timestamp: new Date(jetztDate.getTime() - w.alterMin * 60000).toISOString(),
    values: {
      water_temperature: { value: w.wasser, unit: '°C', status: w.status },
      air_temperature: { value: w.luft, unit: '°C', status: 'ok' },
      wind_speed_avg_10min: { value: w.wind, unit: 'm/s', status: 'ok' },
      wind_gust_max_10min: { value: w.boeen, unit: 'm/s', status: 'ok' },
      windchill: { value: w.windchill, unit: '°C', status: 'ok' },
    },
  };
}

export function testPrognoseJson(s, station, jetzt) {
  const w = werte(s, station);
  const start = `${datumTeil(jetzt)}T00:00`;
  const jetztStunde = Number(jetzt.slice(11, 13));
  const time = [], t = [], cc = [], ws = [], wg = [], wc = [], day = [];
  for (let i = 0; i < 48; i++) {
    const zeit = plusStunden(start, i);
    const h = i % 24;
    const rel = i - jetztStunde;
    time.push(zeit);
    t.push(Math.round((w.luft + Math.sin(((h - 9) / 24) * Math.PI * 2) * 3) * 10) / 10);
    cc.push(Math.min(100, Math.max(0, w.bewoelkung + (h > 15 ? 15 : 0))));
    ws.push(Math.round(w.wind * 3.6 * (h >= 12 && h <= 15 ? 0.7 : 1.1)));
    let boe = Math.round(w.boeen * 3.6);
    if (w.sturmAb !== null && rel >= w.sturmAb && rel <= w.sturmAb + 2) boe = 58;
    wg.push(boe);
    wc.push(w.gewitterAb !== null && rel >= w.gewitterAb && rel <= w.gewitterAb + 2 ? 95 : (w.bewoelkung > 60 ? 3 : 1));
    day.push(h >= 7 && h < 17 ? 1 : 0);
  }
  return {
    current: { cloud_cover: w.bewoelkung, is_day: jetztStunde >= 7 && jetztStunde < 17 ? 1 : 0 },
    hourly: { time, temperature_2m: t, cloud_cover: cc, wind_speed_10m: ws, wind_gusts_10m: wg, weather_code: wc, is_day: day },
  };
}

// Beispielbuch der letzten Wochen.
export function testTagebuch(heute) {
  const roh = [
    [0, '07:10', '07:45', 1.2, 'tiefenbrunnen', 'Ruhig, fast niemand da.'],
    [-2, '18:00', '18:40', 1.5, 'mythenquai', ''],
    [-5, '12:15', '12:35', 0.6, 'tiefenbrunnen', 'Kurz, Wasser kälter als gedacht.'],
    [-9, '17:30', '18:30', 2.4, 'tiefenbrunnen', ''],
    [-12, '08:00', '08:30', 1.0, 'mythenquai', ''],
    [-16, '19:00', '19:50', 2.0, 'tiefenbrunnen', 'Sonnenuntergang.'],
    [-23, '13:00', '13:20', 0.8, 'tiefenbrunnen', ''],
    [-30, '18:10', '19:10', 2.6, 'mythenquai', 'Längster bisher.'],
    [-38, '07:30', '08:00', 1.1, 'tiefenbrunnen', ''],
    [-44, '16:00', '16:30', 1.3, 'tiefenbrunnen', ''],
  ];
  return roh.map(([tage, von, bis, strecke, station, kommentar], i) => {
    const datum = plusTage(heute, tage);
    const startMin = textZuMinuten(von);
    return {
      id: `test-${i}`, datum, startMin, endeMin: textZuMinuten(bis), strecke, station, kommentar,
      messwerte: { wasser: 18 - i * 0.6, luft: 19 - i * 0.8, windKmh: 6 + i, zeit: lokalZuDate(datum, startMin).toISOString() },
      erstellt: new Date().toISOString(),
    };
  });
}
