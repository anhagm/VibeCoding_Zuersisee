// Proxy für die Tecdottir-API (Wasserschutzpolizei Zürich), gegen CORS und mit kurzem Cache.
// GET /api/messung?station=tiefenbrunnen          → neueste Messung
// GET /api/messung?station=mythenquai&zeit=ISO    → Messung, die dem Zeitpunkt am nächsten liegt (±3 h,
//                                                  weil die Daten mit 2–3 h Verzögerung ankommen)

const BASIS = 'https://tecdottir.metaodi.ch/measurements';
const STATIONEN = new Set(['tiefenbrunnen', 'mythenquai']);
const FELDER = ['water_temperature', 'air_temperature', 'wind_speed_avg_10min', 'wind_gust_max_10min', 'windchill'];

const tag = (d) => d.toISOString().slice(0, 10);

// Tecdottir liefert Zeitstempel teils mit, teils ohne Offset. Ohne Offset gilt MEZ (UTC+1).
export function parseZeit(eintrag) {
  const roh = eintrag?.timestamp ?? eintrag?.values?.timestamp_cet?.value;
  if (!roh) return null;
  const s = String(roh).trim();
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}):(\d{2})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+01:00`);
  m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (m) return new Date(`${m[1]}T${m[2]}:00+01:00`);
  return null;
}

function reduziere(station, eintrag) {
  const zeit = parseZeit(eintrag);
  const values = {};
  for (const f of FELDER) {
    const v = eintrag?.values?.[f];
    values[f] = v ? { value: v.value ?? null, unit: v.unit ?? null, status: v.status ?? null } : null;
  }
  return { station, timestamp: zeit ? zeit.toISOString() : null, values };
}

export default async function handler(req, res) {
  const station = String(req.query.station || '').toLowerCase();
  if (!STATIONEN.has(station)) {
    res.status(400).json({ error: 'Unbekannte Station. Erlaubt: tiefenbrunnen, mythenquai' });
    return;
  }

  const zeitParam = req.query.zeit;
  let url;
  let ziel = null;
  if (zeitParam) {
    ziel = new Date(String(zeitParam));
    if (Number.isNaN(ziel.getTime())) {
      res.status(400).json({ error: 'Ungültiger Zeitpunkt' });
      return;
    }
    const von = new Date(ziel.getTime() - 24 * 3600e3);
    const bis = new Date(ziel.getTime() + 24 * 3600e3);
    url = `${BASIS}/${station}?startDate=${tag(von)}&endDate=${tag(bis)}&sort=timestamp_cet%20desc&limit=500`;
  } else {
    // Diese Form ist mit der ersten Seeampel gegen die echte API geprüft.
    url = `${BASIS}/${station}?sort=timestamp_cet%20desc&limit=1&offset=0`;
  }

  try {
    const antwort = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) throw new Error(`Tecdottir ${antwort.status}`);
    const json = await antwort.json();
    const liste = Array.isArray(json?.result) ? json.result : [];
    if (!liste.length) {
      res.status(404).json({ error: 'Keine Messung gefunden' });
      return;
    }

    let eintrag = liste[0];
    if (ziel) {
      let best = null;
      let abstand = Infinity;
      for (const e of liste) {
        const z = parseZeit(e);
        if (!z) continue;
        const d = Math.abs(z.getTime() - ziel.getTime());
        if (d < abstand) { abstand = d; best = e; }
      }
      if (!best || abstand > 3 * 60 * 60e3) {
        res.status(404).json({ error: 'Keine Messung in der Nähe dieses Zeitpunkts' });
        return;
      }
      eintrag = best;
    }

    res.setHeader('Cache-Control', ziel ? 's-maxage=86400' : 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(reduziere(station, eintrag));
  } catch (err) {
    res.status(502).json({ error: 'Messdaten nicht erreichbar', detail: String(err.message || err) });
  }
}
