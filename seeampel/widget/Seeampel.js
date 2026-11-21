// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: water;

// ============================================================
// Seeampel · Widget für Scriptable (iOS)
// Frage: «Lohnt es sich jetzt, im Zürichsee zu schwimmen – für mich?»
//
// Gleiche Bewertung, gleiche Datenquellen und gleiche Farben wie die PWA
// (https://seeampel.vercel.app). Die Logik unten ist eine Kopie von
// js/logic/rating.js und best-window.js; tests/widget.test.js prüft, dass
// beide dasselbe Ergebnis liefern.
//
// EINRICHTEN
// 1. Scriptable installieren, neues Skript, diesen Text einfügen, «Seeampel» nennen.
// 2. Auf dem Homescreen ein Scriptable-Widget hinzufügen (klein, mittel oder gross),
//    lange drücken → Widget bearbeiten → Script: Seeampel.
// 3. Skript einmal in Scriptable starten: Es führt durch dein Profil (Name, Schwimmtyp,
//    Badestelle) und speichert es auf dem iPhone. Ein Widget ohne Profil zeigt
//    «Profil einrichten», ein Tipp darauf startet die Einrichtung.
// 4. Feld «Parameter» (optional, überschreibt das Profil nur für dieses eine Widget),
//    Teile mit Komma trennen, Reihenfolge egal:
//      Sünneler                     Profil: Isbär, Sünneler oder Gfrörli
//      21 eng                       eigene Lieblingstemperatur und Toleranz (eng, mittel, weit)
//      Mythenquai                   Badestelle (Standard: Tiefenbrunnen)
//      Anna                         Name, wie in der PWA («für Anna»)
//      test=veto_gewitter           Testzustand statt echter Daten
//    Beispiel: «Isbär, Mythenquai, Anna»
// 5. Im Sperrbildschirm funktionieren die drei Formen (rund, rechteckig, Zeile) auch.
//
// Testzustände: normal, sonne, perfekt, wind, kalt, veto_gewitter, veto_sturm,
// veto_boeen, ungueltig, veraltet, offline, besser
// In der App: Vorschau mit Grösse und Testzustand, Profil ändern oder löschen.
// ============================================================

const APP_URL = 'https://seeampel.vercel.app/';
const STANDARD = { profil: 'suenneler', station: 'tiefenbrunnen', name: null };

// ============================================================
// KONFIGURATION (identisch mit js/config.js)
// ============================================================
const TOLERANZ = { eng: 2, mittel: 3, weit: 4 };
const TOLERANZ_LABEL = { eng: 'Eng', mittel: 'Mittel', weit: 'Weit' };
const TEMP_MIN = 4;
const TEMP_MAX = 28;
const NAME_MAX = 30;
const PRESETS = {
  isbaer: { name: 'Isbär', lieblingstemperatur: 7, toleranz: 'weit', beschreibung: 'Eisbaden im Winter – je kälter, desto besser.' },
  suenneler: { name: 'Sünneler', lieblingstemperatur: 23, toleranz: 'mittel', beschreibung: 'Schwimmt im Sommer, wenn das Wasser angenehm ist.' },
  gfroerli: { name: 'Gfrörli', lieblingstemperatur: 25, toleranz: 'eng', beschreibung: 'Geht nur bei richtig warmem Wasser hinein.' },
};
const SCHWELLEN = {
  luftWarm: 22, bewoelkungSonne: 30, luftKalt: 12, kaltSchwimmerBis: 12,
  windKmh: 20, boeenVetoKmh: 46, vetoStunden: 2, veraltetMinuten: 180,
};
const STATIONEN = {
  tiefenbrunnen: { id: 'tiefenbrunnen', name: 'Tiefenbrunnen', lat: 47.3510, lon: 8.5600 },
  mythenquai: { id: 'mythenquai', name: 'Mythenquai', lat: 47.3590, lon: 8.5365 },
};
const MODELLE = ['meteoswiss_icon_ch2', 'meteoswiss_icon_ch1'];
const ZEITZONE = 'Europe/Zurich';
const CACHE_MAX_STUNDEN = 12;

// ============================================================
// HILFSFUNKTIONEN ZEIT UND FORMAT (wie js/util)
// ============================================================
const zwei = (n) => String(n).padStart(2, '0');
const ganz = (x) => Math.round(x);
const zahl = (x) => new Intl.NumberFormat('de-CH', { maximumFractionDigits: 1 }).format(x);
const sterneText = (s) => (s === 1 ? '1 Stern' : `${zahl(s)} Sterne`);
const stundeVon = (iso) => Number(iso.slice(11, 13));
const stundeAbgerundet = (iso) => `${iso.slice(0, 13)}:00`;
const datumTeil = (iso) => iso.slice(0, 10);

function plusStunden(iso, stunden) {
  const [d, t] = iso.split('T');
  const [y, m, tag] = d.split('-').map(Number);
  const [h, min] = (t || '00:00').split(':').map(Number);
  const x = new Date(Date.UTC(y, m - 1, tag, h + stunden, min));
  return `${x.getUTCFullYear()}-${zwei(x.getUTCMonth() + 1)}-${zwei(x.getUTCDate())}T${zwei(x.getUTCHours())}:${zwei(x.getUTCMinutes())}`;
}

// Lokale Zürcher Zeit als «YYYY-MM-DDTHH:mm», wie sie Open-Meteo liefert.
function lokalIso(date) {
  const teile = {};
  for (const p of new Intl.DateTimeFormat('en-CA', {
    timeZone: ZEITZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)) teile[p.type] = p.value;
  return `${teile.year}-${teile.month}-${teile.day}T${teile.hour}:${teile.minute}`;
}

const uhrzeit = (date) => lokalIso(date).slice(11, 16);

// ============================================================
// BEWERTUNG (Kopie von js/logic/rating.js)
// ============================================================
const halbeSterne = (x) => Math.round(x * 2) / 2;
const klemmen = (x, min, max) => Math.min(max, Math.max(min, x));

function grundwertung(wasser, F, T) {
  const punkte = [[F - 1 - 2 * T, 1], [F - 1 - T, 3], [F - 1, 5], [F + 1, 5], [F + 1 + T, 3], [F + 1 + 2 * T, 1]];
  if (wasser <= punkte[0][0] || wasser >= punkte[5][0]) return 1;
  for (let i = 0; i < punkte.length - 1; i++) {
    const [x0, y0] = punkte[i];
    const [x1, y1] = punkte[i + 1];
    if (wasser >= x0 && wasser <= x1) return x1 === x0 ? y0 : y0 + ((wasser - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 1;
}

function bewerte({ wasser, luft, windKmh, bewoelkung, tag }, profil) {
  const F = profil.lieblingstemperatur;
  const T = TOLERANZ[profil.toleranz];
  const basis = grundwertung(wasser, F, T);
  const warm = luft > SCHWELLEN.luftWarm;
  const sonne = Boolean(tag) && bewoelkung !== null && bewoelkung !== undefined && bewoelkung < SCHWELLEN.bewoelkungSonne;
  const kalt = luft < SCHWELLEN.luftKalt && F > SCHWELLEN.kaltSchwimmerBis;
  const wind = windKmh >= SCHWELLEN.windKmh;
  let wert = basis;
  if (warm || sonne) wert += 0.5;
  if (kalt) wert -= 0.5;
  if (wind) wert -= 1;
  const runde = (x) => halbeSterne(klemmen(x, 1, 5));
  return {
    sterne: runde(wert), basis, mods: { warm, sonne, kalt, wind },
    ohneWind: runde(wert + (wind ? 1 : 0)), ohneKalt: runde(wert + (kalt ? 0.5 : 0)),
  };
}

function vetoFenster(stunden, jetzt) {
  const von = stundeAbgerundet(jetzt);
  const bis = plusStunden(von, SCHWELLEN.vetoStunden);
  return stunden.filter((h) => h.zeit >= von && h.zeit <= bis);
}

function stundenVeto(h) {
  if (h.code >= 95 && h.code <= 99) return 'gewitter';
  if (h.boeenKmh >= SCHWELLEN.boeenVetoKmh) return 'sturm';
  return null;
}

function pruefeVeto(boeenKmh, stunden, jetzt) {
  if (boeenKmh >= SCHWELLEN.boeenVetoKmh) return { art: 'boeen', prognose: false, text: `Böen mit ${ganz(boeenKmh)} km/h gemessen` };
  const fenster = vetoFenster(stunden, jetzt);
  if (fenster.length < SCHWELLEN.vetoStunden + 1 || fenster.some((h) => h.code == null || h.boeenKmh == null)) return { fehlend: true };
  for (const h of fenster) {
    const art = stundenVeto(h);
    if (art === 'gewitter') return { art, prognose: true, ab: stundeVon(h.zeit), text: `Gewitter möglich ab ${stundeVon(h.zeit)} Uhr (Prognose)` };
    if (art === 'sturm') return { art, prognose: true, ab: stundeVon(h.zeit), text: `Sturmböen möglich ab ${stundeVon(h.zeit)} Uhr (Prognose)` };
  }
  return null;
}

function begruendung({ wasser, luft, windKmh }, ergebnis, profil) {
  const w = ganz(wasser);
  const F = profil.lieblingstemperatur;
  const { mods, basis } = ergebnis;
  if (mods.wind && ergebnis.ohneWind > ergebnis.sterne) return { text: `Wasser ${w}°, aber Wind mit ${ganz(windKmh)} km/h`, prognose: false };
  if (mods.kalt && ergebnis.ohneKalt > ergebnis.sterne) return { text: `Wasser ${w}°, aber Luft nur ${ganz(luft)}°`, prognose: false };
  if (basis >= 5) {
    return w === F ? { text: `Wasser ${w}° – genau deine Lieblingstemperatur`, prognose: false }
      : { text: `Wasser ${w}° – fast deine Lieblingstemperatur`, prognose: false };
  }
  if (mods.warm) return { text: `Wasser ${w}°, dafür Luft ${ganz(luft)}°`, prognose: false };
  if (mods.sonne) return { text: `Wasser ${w}°, dafür Sonne (Prognose)`, prognose: true };
  const d = w - F;
  if (d < 0) return { text: `Wasser ${w}° – ${-d}° kälter als deine Lieblingstemperatur`, prognose: false };
  if (d > 0) return { text: `Wasser ${w}° – ${d}° wärmer als deine Lieblingstemperatur`, prognose: false };
  return { text: `Wasser ${w}° – fast deine Lieblingstemperatur`, prognose: false };
}

function rate(messung, prognose, profil, jetzt) {
  const veto = pruefeVeto(messung.boeenKmh, prognose.stunden, jetzt);
  if (veto && veto.fehlend) return { fehler: 'prognose' };
  const ergebnis = bewerte({
    wasser: messung.wasser, luft: messung.luft, windKmh: messung.windKmh,
    bewoelkung: prognose.aktuell.bewoelkung, tag: prognose.aktuell.tag,
  }, profil);
  if (veto) return { ...ergebnis, wasser: messung.wasser, sterne: 0, veto, satz: { text: veto.text, prognose: veto.prognose } };
  return { ...ergebnis, wasser: messung.wasser, veto: null, satz: begruendung(messung, ergebnis, profil) };
}

// ============================================================
// BESTES ZEITFENSTER (Kopie von js/logic/best-window.js)
// ============================================================
function besteZeitfenster(wasser, stunden, profil, jetzt) {
  const heute = datumTeil(jetzt);
  const ab = stundeAbgerundet(jetzt);
  const kandidaten = stunden.filter((h) => datumTeil(h.zeit) === heute && h.zeit >= ab && h.tag &&
    [h.luft, h.windKmh, h.boeenKmh, h.code, h.bewoelkung].every((v) => v !== null && v !== undefined));
  if (!kandidaten.length) return { art: 'keine', text: 'Heute keine Stunden mit Tageslicht mehr in der Prognose' };
  const vetoAb = (h) => {
    const i = stunden.indexOf(h);
    return stunden.slice(i, i + SCHWELLEN.vetoStunden + 1).some((x) => stundenVeto(x));
  };
  const bewertet = kandidaten.map((h) => ({
    stunde: stundeVon(h.zeit),
    sterne: vetoAb(h) ? 0 : bewerte({ wasser, luft: h.luft, windKmh: h.windKmh, bewoelkung: h.bewoelkung, tag: h.tag }, profil).sterne,
  }));
  const max = Math.max(...bewertet.map((b) => b.sterne));
  if (max === 0) return { art: 'schlecht', text: 'Heute kein gutes Zeitfenster (Prognose)', stunden: bewertet };
  if (max <= 1) return { art: 'schlecht', text: 'Heute bleibt es überall bei 1 Stern (Prognose)', stunden: bewertet };
  const start = bewertet.findIndex((b) => b.sterne === max);
  let ende = start;
  while (ende + 1 < bewertet.length && ende - start + 1 < 3 &&
    bewertet[ende + 1].sterne === max && bewertet[ende + 1].stunde === bewertet[ende].stunde + 1) ende++;
  const von = bewertet[start].stunde;
  const bis = bewertet[ende].stunde + 1;
  return { art: 'fenster', von, bis, sterne: max, stunden: bewertet, text: `Am besten heute ${von}–${bis} Uhr (${sterneText(max)}, Prognose)` };
}

// Kurzfassung für kleine Flächen: «Am besten 14–16 Uhr».
function fensterKurz(f) {
  if (!f) return null;
  if (f.art === 'fenster') return `Am besten ${f.von}–${f.bis} Uhr`;
  if (f.art === 'schlecht') return 'Heute kein gutes Fenster';
  return null;
}

// ============================================================
// STATIONSVERGLEICH (Kopie von js/logic/compare.js)
// ============================================================
function vergleicheStellen(hier, dort, nameDort, profil) {
  if (!hier || !dort || hier.fehler || dort.fehler) return null;
  if (dort.sterne - hier.sterne < 1) return null;
  const F = profil.lieblingstemperatur;
  let grund = 'bessere Bedingungen';
  if (hier.veto && !dort.veto) grund = 'keine Warnung';
  else if (hier.mods.wind && !dort.mods.wind) grund = 'weniger Wind';
  else if (Math.abs(dort.wasser - F) < Math.abs(hier.wasser - F)) grund = dort.wasser > hier.wasser ? 'wärmeres Wasser' : 'kühleres Wasser';
  else if (hier.mods.kalt && !dort.mods.kalt) grund = 'wärmere Luft';
  return { text: `${nameDort} heute besser – ${grund}` };
}

// ============================================================
// DATEN UMWANDELN (wie js/data/measurement.js und forecast.js)
// ============================================================
function messwert(v) {
  if (!v || v.status !== 'ok' || v.value === null || v.value === undefined || v.value === '') return null;
  const n = Number(v.value);
  return Number.isFinite(n) ? n : null;
}

function windKmhWert(v) {
  const n = messwert(v);
  if (n === null) return null;
  return v.unit && /km\/?h/i.test(v.unit) ? n : n * 3.6;
}

function normalisiereMessung(json, jetztMs) {
  const v = (json && json.values) || {};
  const messung = {
    wasser: messwert(v.water_temperature), luft: messwert(v.air_temperature),
    windKmh: windKmhWert(v.wind_speed_avg_10min), boeenKmh: windKmhWert(v.wind_gust_max_10min),
  };
  const zeit = json && json.timestamp ? new Date(json.timestamp) : null;
  const fehlend = ['wasser', 'luft', 'windKmh', 'boeenKmh'].filter((k) => messung[k] === null);
  if (!zeit || Number.isNaN(zeit.getTime())) fehlend.push('zeit');
  if (fehlend.length) return { ok: false, fehler: 'ungueltig', fehlend };
  const alterMin = Math.max(0, Math.round((jetztMs - zeit.getTime()) / 60000));
  return { ok: true, messung: { ...messung, zeit, alterMin, veraltet: alterMin > SCHWELLEN.veraltetMinuten } };
}

const zahlOderNull = (x) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? null : Number(x));

function normalisierePrognose(json) {
  const h = json && json.hourly;
  if (!h || !Array.isArray(h.time)) return null;
  const stunden = h.time.map((zeit, i) => ({
    zeit,
    luft: zahlOderNull(h.temperature_2m && h.temperature_2m[i]),
    bewoelkung: zahlOderNull(h.cloud_cover && h.cloud_cover[i]),
    windKmh: zahlOderNull(h.wind_speed_10m && h.wind_speed_10m[i]),
    boeenKmh: zahlOderNull(h.wind_gusts_10m && h.wind_gusts_10m[i]),
    code: zahlOderNull(h.weather_code && h.weather_code[i]),
    tag: h.is_day && h.is_day[i] === 1,
  }));
  const c = json.current || {};
  return { stunden, aktuell: { bewoelkung: zahlOderNull(c.cloud_cover), tag: c.is_day === 1 } };
}

// Bewertung einer Station aus Rohdaten. Gleiche Reihenfolge der Prüfungen wie die PWA.
function bewerteStation(stationId, messungJson, prognoseJson, profil, jetztDate) {
  const station = STATIONEN[stationId];
  const jetzt = lokalIso(jetztDate);
  const m = normalisiereMessung(messungJson, jetztDate.getTime());
  if (!m.ok) return { station, fehler: 'ungueltig' };
  const p = normalisierePrognose(prognoseJson);
  if (!p) return { station, fehler: 'prognose', messung: m.messung };
  const r = rate(m.messung, p, profil, jetzt);
  if (r.fehler) return { station, fehler: r.fehler, messung: m.messung };
  const fenster = besteZeitfenster(m.messung.wasser, p.stunden, profil, jetzt);
  return {
    station, messung: m.messung, ...r, fenster,
    bewoelkung: p.aktuell.bewoelkung, veraltet: m.messung.veraltet,
  };
}

// ============================================================
// SEEFARBE (Kopie von js/logic/sea-color.js)
// ============================================================
const STOPS_HELL = [[6, '#D8E1EA'], [12, '#CBDDEB'], [17, '#C3E0E8'], [21, '#BEE4E0'], [24, '#BFE9D8'], [27, '#D0EDD3']];
const STOPS_DUNKEL = [[6, '#19222A'], [12, '#162632'], [17, '#132A32'], [21, '#122E2D'], [24, '#13302A'], [27, '#1A3027']];
const GRAU = { hell: '#E3E6E8', dunkel: '#1C1F21' };
const GEWITTER = {
  hell: { oben: '#56636D', mitte: '#2F3A43', unten: '#192127' },
  dunkel: { oben: '#3A4650', mitte: '#222C34', unten: '#12181D' },
};

function hexZuRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbZuHex(rgb) {
  return `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
const mischen = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function farbeFuerWasser(wasser, dunkel) {
  const stops = dunkel ? STOPS_DUNKEL : STOPS_HELL;
  if (wasser <= stops[0][0]) return stops[0][1];
  if (wasser >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (wasser >= t0 && wasser <= t1) return rgbZuHex(mischen(hexZuRgb(c0), hexZuRgb(c1), (wasser - t0) / (t1 - t0)));
  }
  return stops[0][1];
}

function seeFarbe({ wasser = null, bewoelkung = null, veraltet = false, dunkel = false }) {
  let grau = bewoelkung === null || bewoelkung === undefined ? 0.15 : Math.min(1, Math.max(0, bewoelkung / 100)) * 0.45;
  if (veraltet || wasser === null) grau = Math.max(grau, 0.7);
  return rgbZuHex(mischen(hexZuRgb(farbeFuerWasser(wasser === null ? 17 : wasser, dunkel)), hexZuRgb(GRAU[dunkel ? 'dunkel' : 'hell']), grau));
}

function seeVerlauf(zustand) {
  const dunkel = Boolean(zustand.dunkel);
  if (zustand.veto) return GEWITTER[dunkel ? 'dunkel' : 'hell'];
  const mitte = hexZuRgb(seeFarbe(zustand));
  const oben = mischen(mitte, dunkel ? [60, 80, 86] : [255, 255, 255], dunkel ? 0.18 : 0.5);
  const unten = mischen(mitte, dunkel ? [0, 0, 0] : [62, 142, 149], dunkel ? 0.42 : 0.28);
  return { oben: rgbZuHex(oben), mitte: rgbZuHex(mitte), unten: rgbZuHex(unten) };
}

// ============================================================
// PARAMETER
// ============================================================
const ohneUmlaut = (s) => s.toLowerCase().trim()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');

// Wohlfühlbereiche wie in der PWA (js/logic/rating.js bereiche).
function bereiche(F, toleranz) {
  const T = TOLERANZ[toleranz];
  const k = (x) => klemmen(x, TEMP_MIN, TEMP_MAX);
  return { ideal: [k(F - 1), k(F + 1)], gut: [k(F - 1 - T), k(F + 1 + T)] };
}

function sauberName(roh) {
  const n = String(roh || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return n || null;
}

// Gespeichertes Profil (Grundlage) plus Parameter des einzelnen Widgets (überschreibt).
function leseParameter(text, gespeichert = null) {
  const ein = gespeichert
    ? { profil: { ...gespeichert.profil }, station: gespeichert.station, name: gespeichert.name, test: null, warnung: null, eingerichtet: true }
    : { profil: { ...PRESETS[STANDARD.profil] }, station: STANDARD.station, name: STANDARD.name, test: null, warnung: null, eingerichtet: false };
  if (!text) return ein;
  for (const roh of String(text).split(/[,;]/)) {
    const teil = roh.trim();
    if (!teil) continue;
    const k = ohneUmlaut(teil).replace(/\s+/g, ' ');
    const key = k.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
    const preset = Object.keys(PRESETS).find((p) => p === k || p.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u') === key);
    const eigen = k.match(/^(\d{1,2})(?:\s*°?c?)?(?:\s+(eng|mittel|weit))?$/);
    if (k.startsWith('test=')) { ein.test = k.slice(5); ein.eingerichtet = true; }
    else if (preset) { ein.profil = { ...PRESETS[preset] }; ein.eingerichtet = true; }
    else if (STATIONEN[k]) ein.station = k;
    else if (eigen) {
      const F = klemmen(Number(eigen[1]), 4, 28);
      ein.profil = { name: `${F}°`, lieblingstemperatur: F, toleranz: eigen[2] || 'mittel' };
      ein.eingerichtet = true;
    } else if (/^[a-zà-ÿ' -]{1,30}$/i.test(teil)) ein.name = teil.charAt(0).toUpperCase() + teil.slice(1);
    else ein.warnung = `Parameter «${teil}» nicht erkannt`;
  }
  return ein;
}

// ============================================================
// TESTZUSTÄNDE (wie js/data/scenarios.js)
// ============================================================
const BASIS = { wasser: 19, luft: 20, wind: 2, boeen: 4, bewoelkung: 45, gewitterAb: null, sturmAb: null, alterMin: 40, status: 'ok' };
const SZENARIEN = {
  normal: {},
  sonne: { wasser: 21.4, luft: 25, bewoelkung: 10 },
  perfekt: { wasser: 23.2, luft: 24, bewoelkung: 15 },
  wind: { wasser: 17.2, luft: 16, wind: 7, boeen: 10 },
  kalt: { wasser: 9.1, luft: 4, wind: 3, boeen: 5, bewoelkung: 90 },
  veto_gewitter: { wasser: 22, luft: 27, bewoelkung: 60, gewitterAb: 1 },
  veto_sturm: { wasser: 20, luft: 18, bewoelkung: 70, sturmAb: 2 },
  veto_boeen: { wasser: 18, luft: 15, wind: 8, boeen: 14 },
  ungueltig: { status: 'broken' },
  veraltet: { alterMin: 300 },
  offline: { offline: true },
  besser: { wind: 6.5, boeen: 9, mythenquai: { wind: 1.5, boeen: 3 } },
};

function testDaten(name, stationId, jetztDate) {
  const s0 = SZENARIEN[name];
  if (!s0) return null;
  const w = { ...BASIS, ...s0, ...(stationId === 'mythenquai' ? s0.mythenquai || {} : {}) };
  const messung = {
    station: stationId,
    timestamp: new Date(jetztDate.getTime() - w.alterMin * 60000).toISOString(),
    values: {
      water_temperature: { value: w.wasser, unit: '°C', status: w.status },
      air_temperature: { value: w.luft, unit: '°C', status: 'ok' },
      wind_speed_avg_10min: { value: w.wind, unit: 'm/s', status: 'ok' },
      wind_gust_max_10min: { value: w.boeen, unit: 'm/s', status: 'ok' },
    },
  };
  const jetzt = lokalIso(jetztDate);
  const start = `${datumTeil(jetzt)}T00:00`;
  const jetztStunde = stundeVon(jetzt);
  const hourly = { time: [], temperature_2m: [], cloud_cover: [], wind_speed_10m: [], wind_gusts_10m: [], weather_code: [], is_day: [] };
  for (let i = 0; i < 48; i++) {
    const h = i % 24;
    const rel = i - jetztStunde;
    hourly.time.push(plusStunden(start, i));
    hourly.temperature_2m.push(Math.round((w.luft + Math.sin(((h - 9) / 24) * Math.PI * 2) * 3) * 10) / 10);
    hourly.cloud_cover.push(Math.min(100, Math.max(0, w.bewoelkung + (h > 15 ? 15 : 0))));
    hourly.wind_speed_10m.push(Math.round(w.wind * 3.6 * (h >= 12 && h <= 15 ? 0.7 : 1.1)));
    hourly.wind_gusts_10m.push(w.sturmAb !== null && rel >= w.sturmAb && rel <= w.sturmAb + 2 ? 58 : Math.round(w.boeen * 3.6));
    hourly.weather_code.push(w.gewitterAb !== null && rel >= w.gewitterAb && rel <= w.gewitterAb + 2 ? 95 : (w.bewoelkung > 60 ? 3 : 1));
    hourly.is_day.push(h >= 7 && h < 17 ? 1 : 0);
  }
  const prognose = { current: { cloud_cover: w.bewoelkung, is_day: jetztStunde >= 7 && jetztStunde < 17 ? 1 : 0 }, hourly };
  return { messung, prognose, offline: Boolean(w.offline) };
}

// ============================================================
// LADEN MIT ZWISCHENSPEICHER (nur Scriptable)
// ============================================================
function prognoseUrl(stationId, modell) {
  const s = STATIONEN[stationId];
  const q = {
    latitude: s.lat, longitude: s.lon,
    hourly: 'temperature_2m,cloud_cover,wind_speed_10m,wind_gusts_10m,weather_code,is_day',
    current: 'cloud_cover,is_day', models: modell, timezone: ZEITZONE, forecast_days: 2, wind_speed_unit: 'kmh',
  };
  return `https://api.open-meteo.com/v1/forecast?${Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

async function holeJson(url) {
  const r = new Request(url);
  r.timeoutInterval = 12;
  r.headers = { Accept: 'application/json' };
  const json = await r.loadJSON();
  const code = r.response && r.response.statusCode;
  if (code && code >= 400) throw new Error(`HTTP ${code}`);
  return json;
}

async function ladePrognose(stationId) {
  let fehler = null;
  for (const modell of MODELLE) {
    try {
      const json = await holeJson(prognoseUrl(stationId, modell));
      if (json && !json.error) return json;
      fehler = new Error((json && json.reason) || 'Open-Meteo Fehler');
    } catch (e) { fehler = e; }
  }
  throw fehler || new Error('Prognose nicht erreichbar');
}

function cachePfad() {
  const fm = FileManager.local();
  return fm.joinPath(fm.cacheDirectory(), 'seeampel-widget.json');
}
function leseCache() {
  try {
    const fm = FileManager.local();
    const p = cachePfad();
    return fm.fileExists(p) ? JSON.parse(fm.readString(p)) : {};
  } catch (e) { return {}; }
}
function schreibeCache(c) {
  try { FileManager.local().writeString(cachePfad(), JSON.stringify(c)); } catch (e) { /* nicht kritisch */ }
}

// Echte Daten beider Stationen. Fällt das Netz aus, gelten die letzten Daten bis 12 h, markiert als «offline».
async function ladeEcht() {
  const cache = leseCache();
  const ergebnis = {};
  await Promise.all(Object.keys(STATIONEN).map(async (id) => {
    try {
      const [messung, prognose] = await Promise.all([
        holeJson(`${APP_URL}api/messung?station=${id}`),
        ladePrognose(id),
      ]);
      if (messung && messung.error) throw new Error(messung.error);
      ergebnis[id] = { messung, prognose, offline: false };
      cache[id] = { messung, prognose, geladen: Date.now() };
    } catch (e) {
      const alt = cache[id];
      ergebnis[id] = alt && Date.now() - alt.geladen < CACHE_MAX_STUNDEN * 3600e3
        ? { messung: alt.messung, prognose: alt.prognose, offline: true, geladen: alt.geladen }
        : { fehler: 'offline' };
    }
  }));
  schreibeCache(cache);
  return ergebnis;
}

// ============================================================
// FARBEN UND SCHRIFT (aus css/tokens.css)
// ============================================================
const dyn = (hell, dunkel) => Color.dynamic(new Color(hell), new Color(dunkel));
function farben(veto) {
  if (veto) {
    return {
      text: new Color('#F1F5F7'), neben: new Color('#C9D3D8'), stern: new Color('#F1F5F7'),
      sternLeer: new Color('#F1F5F7', 0.3), prognose: new Color('#D4CBEA'), warnung: new Color('#FF9A6B'),
    };
  }
  return {
    text: dyn('#12242B', '#E8F0F2'), neben: dyn('#33474E', '#B9C8CE'), stern: dyn('#1B6A87', '#6FC0DE'),
    sternLeer: dyn('#B9C7CC', '#34454B'), prognose: dyn('#6A5B8C', '#B3A6D6'), warnung: dyn('#8A3207', '#FF9A6B'),
  };
}

const SCHRIFT = {
  marke: (g) => new Font('Georgia-Bold', g),
  zahl: (g) => Font.boldRoundedSystemFont(g),
  fett: (g) => Font.semiboldSystemFont(g),
  normal: (g) => Font.systemFont(g),
  klein: (g) => Font.mediumSystemFont(g),
};

// ============================================================
// WIDGET-BAUSTEINE
// ============================================================
function hintergrund(w, haupt) {
  const veto = Boolean(haupt && haupt.veto);
  const zustand = {
    wasser: haupt && haupt.messung ? haupt.messung.wasser : null,
    bewoelkung: haupt ? haupt.bewoelkung : null,
    veraltet: !haupt || haupt.fehler || haupt.veraltet || haupt.offline,
    veto,
  };
  const hell = seeVerlauf({ ...zustand, dunkel: false });
  const dunkel = seeVerlauf({ ...zustand, dunkel: true });
  const g = new LinearGradient();
  g.locations = [0, 0.55, 1];
  g.colors = [dyn(hell.oben, dunkel.oben), dyn(hell.mitte, dunkel.mitte), dyn(hell.unten, dunkel.unten)];
  w.backgroundGradient = g;
}

function text(stack, inhalt, font, farbe, zeilen = 1) {
  const t = stack.addText(inhalt);
  t.font = font;
  t.textColor = farbe;
  t.lineLimit = zeilen;
  t.minimumScaleFactor = 0.75;
  return t;
}

function symbol(stack, name, groesse, farbe) {
  const s = SFSymbol.named(name);
  if (!s) return null;
  s.applyFont(Font.systemFont(groesse));
  const img = stack.addImage(s.image);
  img.imageSize = new Size(groesse, groesse);
  img.tintColor = farbe;
  return img;
}

function sterne(stack, wert, groesse, f) {
  const reihe = stack.addStack();
  reihe.spacing = Math.max(1, groesse * 0.12);
  reihe.centerAlignContent();
  for (let i = 1; i <= 5; i++) {
    const name = wert >= i ? 'star.fill' : wert >= i - 0.5 ? 'star.leadinghalf.filled' : 'star';
    symbol(reihe, name, groesse, wert >= i - 0.5 ? f.stern : f.sternLeer);
  }
  return reihe;
}

function fuerWen(ein) {
  if (ein.profil.name === 'Eigenes Profil') ein = { ...ein, profil: { ...ein.profil, name: `${ein.profil.lieblingstemperatur}°` } };
  return ein.name ? `für ${ein.name} · ${ein.profil.name}` : `für dich · ${ein.profil.name}`;
}

// Zustand in eine Zeile, die überall gleich lautet.
function statusZeile(r) {
  if (!r || r.fehler === 'offline') return 'Keine Verbindung';
  if (r.offline) return `Offline · Stand ${uhrzeit(new Date(r.geladen))}`;
  if (r.fehler === 'ungueltig') return 'Messung unvollständig';
  if (r.fehler === 'prognose') return 'Prognose fehlt';
  if (r.veraltet) return `Messung veraltet · ${uhrzeit(r.messung.zeit)}`;
  return `Gemessen ${uhrzeit(r.messung.zeit)}`;
}

function fehlerSatz(r) {
  if (!r || r.fehler === 'offline') return 'Gerade keine Daten. Das Widget versucht es bald wieder.';
  if (r.fehler === 'ungueltig') return 'Die Station liefert gerade keine gültigen Werte. Lieber keine Bewertung als eine falsche.';
  if (r.fehler === 'prognose') return 'Ohne Prognose kann Seeampel keine Gewitter ausschliessen.';
  return '';
}

// Hauptblock: Station, Sterne oder Warnung, Satz. Wird von allen Grössen verwendet.
function hauptBlock(stack, r, ein, f, gross) {
  const kopf = stack.addStack();
  kopf.centerAlignContent();
  text(kopf, r.station.name, SCHRIFT.fett(gross ? 13 : 12), f.neben);
  kopf.addSpacer();
  stack.addSpacer(gross ? 6 : 4);

  if (r.fehler) {
    symbol(stack, r.fehler === 'offline' ? 'wifi.slash' : 'questionmark.circle', gross ? 26 : 22, f.neben);
    stack.addSpacer(4);
    text(stack, fehlerSatz(r), SCHRIFT.normal(gross ? 12 : 11), f.text, 4);
    return;
  }

  if (r.veto) {
    const zeile = stack.addStack();
    zeile.centerAlignContent();
    symbol(zeile, r.veto.art === 'gewitter' ? 'cloud.bolt.fill' : 'wind', gross ? 24 : 20, f.warnung);
    zeile.addSpacer(6);
    text(zeile, 'Heute besser nicht', SCHRIFT.fett(gross ? 15 : 13), f.text, 2);
    stack.addSpacer(4);
    text(stack, r.satz.text, SCHRIFT.normal(gross ? 12 : 11), r.satz.prognose ? f.prognose : f.text, 3);
    return;
  }

  const zeile = stack.addStack();
  zeile.bottomAlignContent();
  text(zeile, `${ganz(r.messung.wasser)}°`, SCHRIFT.zahl(gross ? 40 : 34), f.text);
  zeile.addSpacer(4);
  const rechts = zeile.addStack();
  rechts.layoutVertically();
  text(rechts, sterneText(r.sterne), SCHRIFT.klein(10), f.neben);
  rechts.addSpacer(7);
  stack.addSpacer(2);
  sterne(stack, r.sterne, gross ? 16 : 14, f);
  stack.addSpacer(5);
  text(stack, r.satz.text, SCHRIFT.normal(gross ? 12 : 11), r.satz.prognose ? f.prognose : f.text, gross ? 2 : 3);
}

function fusszeile(stack, r, ein, f) {
  stack.addSpacer();
  const fuss = stack.addStack();
  fuss.centerAlignContent();
  text(fuss, statusZeile(r), SCHRIFT.klein(9), r && (r.fehler || r.veraltet || r.offline) ? f.warnung : f.neben);
  if (ein.test) { fuss.addSpacer(4); text(fuss, `Test: ${ein.test}`, SCHRIFT.klein(9), f.prognose); }
}

function nebenStation(stack, r, f) {
  const box = stack.addStack();
  box.layoutVertically();
  text(box, r.station.name, SCHRIFT.fett(11), f.neben);
  box.addSpacer(2);
  if (r.fehler) { text(box, statusZeile(r), SCHRIFT.normal(11), f.text); return; }
  if (r.veto) {
    const z = box.addStack();
    z.centerAlignContent();
    symbol(z, r.veto.art === 'gewitter' ? 'cloud.bolt.fill' : 'wind', 13, f.warnung);
    z.addSpacer(4);
    text(z, 'Warnung', SCHRIFT.fett(11), f.text);
    return;
  }
  const z = box.addStack();
  z.centerAlignContent();
  text(z, `${ganz(r.messung.wasser)}°`, SCHRIFT.zahl(15), f.text);
  z.addSpacer(6);
  sterne(z, r.sterne, 10, f);
}

// Stundenstreifen wie in der PWA: pro Tagesstunde ein Balken, Höhe nach Sternen.
function stundenStreifen(stack, fenster, f) {
  if (!fenster || !fenster.stunden || !fenster.stunden.length) return;
  text(stack, 'Heute, Prognose', SCHRIFT.klein(10), f.prognose);
  stack.addSpacer(4);
  const reihe = stack.addStack();
  reihe.bottomAlignContent();
  reihe.spacing = 4;
  for (const h of fenster.stunden.slice(0, 12)) {
    const spalte = reihe.addStack();
    spalte.layoutVertically();
    spalte.size = new Size(18, 52);
    spalte.addSpacer();
    const balken = spalte.addStack();
    balken.size = new Size(18, h.sterne === 0 ? 3 : 4 + h.sterne * 6);
    balken.cornerRadius = 4;
    balken.backgroundColor = h.sterne === 0 ? f.warnung
      : fenster.art === 'fenster' && h.stunde >= fenster.von && h.stunde < fenster.bis ? f.prognose : f.sternLeer;
    spalte.addSpacer(3);
    const uhr = spalte.addStack();
    uhr.size = new Size(18, 11);
    text(uhr, String(h.stunde), SCHRIFT.klein(9), f.neben);
  }
}

// ============================================================
// GRÖSSEN
// ============================================================
function baueWidget(familie, daten, ein) {
  const w = new ListWidget();
  const haupt = daten[ein.station];
  const andereId = ein.station === 'tiefenbrunnen' ? 'mythenquai' : 'tiefenbrunnen';
  const andere = daten[andereId];
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60000);

  if (!ein.eingerichtet) return ohneProfil(w, familie);
  if (familie.startsWith('accessory')) return sperrbildschirm(w, familie, haupt);

  hintergrund(w, haupt);
  const f = farben(haupt && haupt.veto);
  const rand = familie === 'small' ? 14 : 16;
  w.setPadding(rand, rand, rand - 2, rand);

  if (familie === 'small') {
    hauptBlock(w, haupt, ein, f, false);
    fusszeile(w, haupt, ein, f);
    return w;
  }

  // Mittel und gross: links die eigene Stelle, rechts die andere und das beste Zeitfenster.
  const oben = w.addStack();
  const links = oben.addStack();
  links.layoutVertically();
  hauptBlock(links, haupt, ein, f, familie === 'large');
  oben.addSpacer(14);
  const rechts = oben.addStack();
  rechts.layoutVertically();
  rechts.size = new Size(familie === 'large' ? 120 : 112, 0);
  text(rechts, 'Seeampel', SCHRIFT.marke(13), f.text);
  text(rechts, fuerWen(ein), SCHRIFT.klein(9), f.neben);
  rechts.addSpacer(8);
  nebenStation(rechts, andere, f);
  const kurz = haupt && !haupt.fehler && !haupt.veto ? fensterKurz(haupt.fenster) : null;
  if (kurz) {
    rechts.addSpacer(8);
    text(rechts, kurz, SCHRIFT.fett(11), f.prognose, 2);
  }

  if (familie === 'large') {
    const vergleich = vergleicheStellen(haupt, andere, STATIONEN[andereId].name, ein.profil);
    w.addSpacer(14);
    if (haupt && !haupt.fehler) stundenStreifen(w, haupt.fenster, f);
    if (haupt && haupt.fenster && haupt.fenster.text) {
      w.addSpacer(8);
      text(w, haupt.fenster.text, SCHRIFT.normal(11), f.prognose, 2);
    }
    if (vergleich) {
      w.addSpacer(6);
      text(w, vergleich.text, SCHRIFT.fett(11), f.text, 2);
    }
  }
  if (ein.warnung) { w.addSpacer(4); text(w, ein.warnung, SCHRIFT.klein(9), f.warnung); }
  fusszeile(w, haupt, ein, f);
  return w;
}

// Noch kein Profil: keine Sterne für ein fremdes Profil, sondern der Weg zur Einrichtung.
function ohneProfil(w, familie) {
  w.url = `${URLScheme.forRunningScript()}?aktion=profil`;
  w.refreshAfterDate = new Date(Date.now() + 5 * 60000);
  const weiss = Color.white();
  if (familie === 'accessoryInline') { text(w, 'Seeampel · Profil einrichten', SCHRIFT.normal(12), weiss); return w; }
  if (familie === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const z = w.addStack(); z.addSpacer(); symbol(z, 'person.crop.circle.badge.plus', 22, weiss); z.addSpacer();
    return w;
  }
  if (familie === 'accessoryRectangular') {
    text(w, 'Seeampel', SCHRIFT.fett(12), weiss);
    text(w, 'Tippen, um dein Profil einzurichten', SCHRIFT.normal(11), weiss, 2);
    return w;
  }
  hintergrund(w, null);
  const f = farben(false);
  w.setPadding(14, 14, 12, 14);
  text(w, 'Seeampel', SCHRIFT.marke(familie === 'small' ? 15 : 17), f.text);
  w.addSpacer(6);
  text(w, 'Lohnt sich Schwimmen im Zürichsee – für dich?', SCHRIFT.normal(familie === 'small' ? 11 : 12), f.text, 3);
  w.addSpacer();
  const knopf = w.addStack();
  knopf.setPadding(6, 10, 6, 10);
  knopf.cornerRadius = 12;
  knopf.backgroundColor = f.stern;
  knopf.centerAlignContent();
  symbol(knopf, 'person.crop.circle.badge.plus', 13, dyn('#FFFFFF', '#0B1A20'));
  knopf.addSpacer(5);
  text(knopf, 'Profil einrichten', SCHRIFT.fett(12), dyn('#FFFFFF', '#0B1A20'));
  return w;
}

// Sperrbildschirm: einfarbig, iOS färbt selbst ein.
function sperrbildschirm(w, familie, r) {
  const weiss = Color.white();
  const ok = r && !r.fehler;
  if (familie === 'accessoryInline') {
    const inhalt = !ok ? `Seeampel · ${statusZeile(r)}`
      : r.veto ? `Seeampel · ${r.veto.text}`
        : `${sterneText(r.sterne)} · Wasser ${ganz(r.messung.wasser)}° · ${r.station.name}`;
    text(w, inhalt, SCHRIFT.normal(12), weiss);
    return w;
  }
  if (familie === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const s = w.addStack();
    s.layoutVertically();
    s.centerAlignContent();
    const z1 = s.addStack(); z1.addSpacer();
    if (!ok) symbol(z1, 'questionmark', 18, weiss);
    else if (r.veto) symbol(z1, r.veto.art === 'gewitter' ? 'cloud.bolt.fill' : 'wind', 20, weiss);
    else text(z1, zahl(r.sterne), SCHRIFT.zahl(20), weiss);
    z1.addSpacer();
    const z2 = s.addStack(); z2.addSpacer();
    if (ok && !r.veto) symbol(z2, 'star.fill', 9, weiss);
    else text(z2, ok ? 'Warnung' : '–', SCHRIFT.klein(8), weiss);
    z2.addSpacer();
    return w;
  }
  // accessoryRectangular
  text(w, r ? r.station.name : 'Seeampel', SCHRIFT.fett(12), weiss);
  if (!ok) { text(w, statusZeile(r), SCHRIFT.normal(12), weiss, 2); return w; }
  if (r.veto) { text(w, 'Heute besser nicht', SCHRIFT.fett(13), weiss); text(w, r.veto.text, SCHRIFT.normal(11), weiss, 2); return w; }
  const z = w.addStack();
  z.centerAlignContent();
  text(z, `${ganz(r.messung.wasser)}°`, SCHRIFT.zahl(16), weiss);
  z.addSpacer(5);
  sterne(z, r.sterne, 11, { stern: weiss, sternLeer: new Color('#FFFFFF', 0.35) });
  text(w, r.satz.text, SCHRIFT.normal(11), weiss, 1);
  return w;
}

// ============================================================
// PROFIL SPEICHERN UND EINRICHTEN (nur Scriptable)
// Das Widget kann das Profil der PWA nicht lesen (Safari und Scriptable haben
// getrennte Speicher). Deshalb eine eigene, kurze Einrichtung mit denselben Typen.
// ============================================================
const PROFIL_KEY = 'seeampel.widget.profil.v1';

function leseProfil() {
  try {
    if (!Keychain.contains(PROFIL_KEY)) return null;
    const p = JSON.parse(Keychain.get(PROFIL_KEY));
    const F = Number(p && p.profil && p.profil.lieblingstemperatur);
    if (!Number.isFinite(F) || !TOLERANZ[p.profil.toleranz] || !STATIONEN[p.station]) return null;
    return p;
  } catch (e) { return null; }
}

function speichereProfil(p) { Keychain.set(PROFIL_KEY, JSON.stringify(p)); }
function loescheProfil() { if (Keychain.contains(PROFIL_KEY)) Keychain.remove(PROFIL_KEY); }

function profilZeile(p) {
  return [p.name, `${p.profil.name} (${p.profil.lieblingstemperatur}°)`, STATIONEN[p.station].name].filter(Boolean).join(' · ');
}

async function frageName(alt) {
  const a = new Alert();
  a.title = 'Wie heisst du?';
  a.message = 'Dein Vorname erscheint im Widget, zum Beispiel «für Anna». Du kannst das Feld auch leer lassen.';
  a.addTextField('Vorname (freiwillig)', alt || '');
  a.addAction('Weiter');
  a.addCancelAction('Abbrechen');
  if (await a.presentAlert() < 0) return undefined;
  return sauberName(a.textFieldValue(0));
}

async function frageTyp(alt) {
  const a = new Alert();
  a.title = 'Welcher Schwimmtyp bist du?';
  a.message = 'Die Sterne richten sich nach deiner Lieblingstemperatur im Wasser.\n\n' +
    Object.values(PRESETS).map((p) => `${p.name} (${p.lieblingstemperatur}°): ${p.beschreibung}`).join('\n\n');
  const keys = Object.keys(PRESETS);
  keys.forEach((k) => a.addAction(`${PRESETS[k].name} · ${PRESETS[k].lieblingstemperatur}°${alt && alt.name === PRESETS[k].name ? '  ✓' : ''}`));
  a.addAction('Eigene Lieblingstemperatur');
  a.addCancelAction('Abbrechen');
  const i = await a.presentSheet();
  if (i < 0) return undefined;
  if (i < keys.length) {
    const { beschreibung, ...p } = PRESETS[keys[i]];
    return p;
  }
  return frageEigenes(alt);
}

async function frageEigenes(alt) {
  let hinweis = '';
  let F = null;
  while (F === null) {
    const a = new Alert();
    a.title = 'Deine Lieblingstemperatur';
    a.message = `Bei welcher Wassertemperatur ist es für dich perfekt? Zahl zwischen ${TEMP_MIN} und ${TEMP_MAX} °C.${hinweis}`;
    const feld = a.addTextField('z. B. 20', alt ? String(alt.lieblingstemperatur) : '');
    feld.setNumberPadKeyboard();
    a.addAction('Weiter');
    a.addCancelAction('Abbrechen');
    if (await a.presentAlert() < 0) return undefined;
    const n = Number(String(a.textFieldValue(0)).replace(',', '.'));
    if (Number.isFinite(n) && n >= TEMP_MIN && n <= TEMP_MAX) F = Math.round(n);
    else hinweis = `\n\nBitte eine Zahl zwischen ${TEMP_MIN} und ${TEMP_MAX} eingeben.`;
  }
  const t = new Alert();
  t.title = 'Wie viel Abweichung ist noch gut?';
  const stufen = Object.keys(TOLERANZ);
  t.message = 'Ab wann fühlt sich das Wasser für dich nicht mehr gut an?\n\n' + stufen.map((k) => {
    const b = bereiche(F, k);
    return `${TOLERANZ_LABEL[k]}: gut von ${b.gut[0]}° bis ${b.gut[1]}°`;
  }).join('\n');
  stufen.forEach((k) => t.addAction(TOLERANZ_LABEL[k]));
  t.addCancelAction('Abbrechen');
  const i = await t.presentSheet();
  if (i < 0) return undefined;
  return { name: `Eigenes Profil`, lieblingstemperatur: F, toleranz: stufen[i] };
}

async function frageStation(alt) {
  const a = new Alert();
  a.title = 'Wo schwimmst du meistens?';
  a.message = 'Das Widget zeigt diese Badestelle gross. Die andere erscheint im mittleren und grossen Widget daneben.';
  const ids = Object.keys(STATIONEN);
  ids.forEach((id) => a.addAction(`${STATIONEN[id].name}${alt === id ? '  ✓' : ''}`));
  a.addCancelAction('Abbrechen');
  const i = await a.presentSheet();
  return i < 0 ? undefined : ids[i];
}

// Gibt das gespeicherte Profil zurück oder null bei Abbruch.
async function richteProfilEin(alt) {
  const name = await frageName(alt && alt.name);
  if (name === undefined) return null;
  const profil = await frageTyp(alt && alt.profil);
  if (!profil) return null;
  const station = await frageStation(alt && alt.station);
  if (!station) return null;
  const p = { name, profil, station };
  speichereProfil(p);
  const a = new Alert();
  a.title = 'Profil gespeichert';
  a.message = `${profilZeile(p)}\n\nNoch kein Widget? Homescreen lange drücken, «Bearbeiten», «Widget hinzufügen», Scriptable wählen, dann beim Widget «Script: Seeampel».\n\nBestehende Widgets übernehmen das Profil, sobald iOS sie neu lädt. Das kann einige Minuten dauern.`;
  a.addAction('Vorschau ansehen');
  a.addCancelAction('Fertig');
  p.vorschau = (await a.presentAlert()) === 0;
  return p;
}

// ============================================================
// START
// ============================================================
async function datenFuer(ein) {
  const jetztDate = new Date();
  let roh;
  if (ein.test && SZENARIEN[ein.test]) {
    roh = {};
    for (const id of Object.keys(STATIONEN)) {
      const d = testDaten(ein.test, id, jetztDate);
      roh[id] = d.offline ? { fehler: 'offline' } : d;
    }
  } else {
    if (ein.test) ein.warnung = `Testzustand «${ein.test}» unbekannt, echte Daten`;
    roh = await ladeEcht();
  }
  const daten = {};
  for (const id of Object.keys(STATIONEN)) {
    const d = roh[id];
    daten[id] = d.fehler ? { station: STATIONEN[id], fehler: d.fehler }
      : { ...bewerteStation(id, d.messung, d.prognose, ein.profil, jetztDate), offline: d.offline, geladen: d.geladen };
  }
  return daten;
}

async function auswahl(titel, optionen) {
  const a = new Alert();
  a.title = titel;
  optionen.forEach((o) => a.addAction(o));
  a.addCancelAction('Abbrechen');
  const i = await a.presentSheet();
  return i < 0 ? null : optionen[i];
}

async function vorschau(ein) {
  const groesse = await auswahl('Seeampel · Vorschau', ['Klein', 'Mittel', 'Gross']);
  if (!groesse) return;
  const zustand = await auswahl('Daten', ['Echte Daten', ...Object.keys(SZENARIEN)]);
  if (!zustand) return;
  if (zustand !== 'Echte Daten') ein.test = zustand;
  const familie = { Klein: 'small', Mittel: 'medium', Gross: 'large' }[groesse];
  const w = baueWidget(familie, await datenFuer(ein), ein);
  if (familie === 'small') await w.presentSmall();
  else if (familie === 'medium') await w.presentMedium();
  else await w.presentLarge();
}

async function main() {
  let gespeichert = leseProfil();
  if (config.runsInWidget || config.runsInAccessoryWidget) {
    const ein = leseParameter(args.widgetParameter, gespeichert);
    const daten = ein.eingerichtet ? await datenFuer(ein) : {};
    Script.setWidget(baueWidget(config.widgetFamily || 'small', daten, ein));
    Script.complete();
    return;
  }

  // In der App. Erster Start oder Tipp auf «Profil einrichten»: direkt zur Einrichtung.
  const wunsch = args.queryParameters && args.queryParameters.aktion;
  if (!gespeichert || wunsch === 'profil') {
    const neu = await richteProfilEin(gespeichert);
    if (neu && neu.vorschau) await vorschau(leseParameter(null, leseProfil()));
    return Script.complete();
  }

  const a = new Alert();
  a.title = 'Seeampel';
  a.message = `Dein Profil: ${profilZeile(gespeichert)}`;
  ['Vorschau ansehen', 'Profil ändern', 'Profil löschen'].forEach((x) => a.addAction(x));
  a.addCancelAction('Schliessen');
  const wahl = await a.presentSheet();
  if (wahl === 0) await vorschau(leseParameter(null, gespeichert));
  if (wahl === 1) {
    const neu = await richteProfilEin(gespeichert);
    if (neu && neu.vorschau) await vorschau(leseParameter(null, leseProfil()));
  }
  if (wahl === 2) {
    const b = new Alert();
    b.title = 'Profil löschen?';
    b.message = 'Die Widgets zeigen danach wieder «Profil einrichten». Deine Daten in der PWA bleiben unberührt.';
    b.addDestructiveAction('Löschen');
    b.addCancelAction('Abbrechen');
    if (await b.presentAlert() === 0) loescheProfil();
  }
  Script.complete();
}

if (typeof Script !== 'undefined') {
  await main();
} else if (typeof module !== 'undefined') {
  // Nur für die Tests mit Node: reine Funktionen freigeben.
  module.exports = { bereiche, sauberName, rate, besteZeitfenster, bewerteStation, leseParameter, testDaten, seeVerlauf, lokalIso, vergleicheStellen, PRESETS, STATIONEN, SZENARIEN };
}
