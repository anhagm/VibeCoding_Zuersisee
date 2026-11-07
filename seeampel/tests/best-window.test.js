import { test } from 'node:test';
import assert from 'node:assert/strict';
import { besteZeitfenster } from '../js/logic/best-window.js';
import { vergleicheStellen } from '../js/logic/compare.js';
import { tipp } from '../js/logic/tips.js';
import { normalisiereMessung } from '../js/data/measurement.js';
import { parseZeit } from '../api/messung.js';

const profil = { lieblingstemperatur: 23, toleranz: 'mittel' };
const tag = (werte) => Array.from({ length: 24 }, (_, h) => ({
  zeit: `2026-07-01T${String(h).padStart(2, '0')}:00`, luft: 20, bewoelkung: 80, windKmh: 25, boeenKmh: 30, code: 1, tag: h >= 6 && h < 21, ...(werte[h] || {}),
}));

test('Bestes Fenster', () => {
  const s = tag({ 13: { windKmh: 5 }, 14: { windKmh: 5 }, 15: { windKmh: 25 } });
  assert.equal(besteZeitfenster(20, s, profil, '2026-07-01T10:30').text, 'Am besten heute 13–15 Uhr (3.5 Sterne, Prognose)');
});

test('Nur Zukunft und Tageslicht', () => {
  assert.equal(besteZeitfenster(20, tag({}), profil, '2026-07-01T22:00').art, 'keine');
});

test('Alles mit Gewitter', () => {
  const alle = Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, { code: 95 }]));
  assert.equal(besteZeitfenster(20, tag(alle), profil, '2026-07-01T08:00').art, 'schlecht');
});

test('Vergleich der Badestellen', () => {
  const hier = { sterne: 2, wasser: 20, veto: null, mods: { wind: true, kalt: false } };
  const dort = { sterne: 3, wasser: 20, veto: null, mods: { wind: false, kalt: false } };
  assert.equal(vergleicheStellen(hier, dort, 'Mythenquai', profil).text, 'Mythenquai heute besser – weniger Wind');
  assert.equal(vergleicheStellen(hier, { ...dort, sterne: 2.5 }, 'Mythenquai', profil), null);
});

test('Höchstens ein Tipp', () => {
  assert.equal(tipp({ wasser: 15, luft: 8, windKmh: 15, windchill: 3 }, { tag: true, bewoelkung: 80 }), 'Windchill 3° – warme Kleider und Mütze bereitlegen');
  assert.equal(tipp({ wasser: 20, luft: 18, windKmh: 5, windchill: 18 }, { tag: true, bewoelkung: 80 }), null);
});

test('Messwert ungültig bei null oder Status nicht ok, Wind m/s → km/h', () => {
  const basis = { timestamp: '2026-07-01T12:00:00Z', values: {
    water_temperature: { value: 20, status: 'ok' }, air_temperature: { value: 22, status: 'ok' },
    wind_speed_avg_10min: { value: 5, unit: 'm/s', status: 'ok' }, wind_gust_max_10min: { value: 10, unit: 'm/s', status: 'ok' } } };
  const ok = normalisiereMessung(basis, Date.parse('2026-07-01T12:30:00Z'));
  assert.equal(ok.ok, true);
  assert.equal(ok.messung.windKmh, 18);
  assert.equal(ok.messung.veraltet, false);
  const alt = normalisiereMessung(basis, Date.parse('2026-07-01T15:30:00Z'));
  assert.equal(alt.messung.veraltet, true);
  const kaputt = structuredClone(basis); kaputt.values.water_temperature.status = 'broken';
  assert.equal(normalisiereMessung(kaputt).ok, false);
  const leer = structuredClone(basis); leer.values.air_temperature.value = null;
  assert.deepEqual(normalisiereMessung(leer).fehlend, ['luft']);
});

test('Zeitstempel der Tecdottir-API', () => {
  assert.equal(parseZeit({ timestamp: '2026-07-01T10:00:00.000Z' }).toISOString(), '2026-07-01T10:00:00.000Z');
  assert.equal(parseZeit({ values: { timestamp_cet: { value: '01.07.2026 11:00:00' } } }).toISOString(), '2026-07-01T10:00:00.000Z');
});

test('Fenster respektiert das Veto der Folgestunden', () => {
  const s = tag({ 11: { windKmh: 5 }, 12: { windKmh: 5, code: 95 }, 16: { windKmh: 5 } });
  const r = besteZeitfenster(20, s, profil, '2026-07-01T10:00');
  assert.equal(r.von, 16);
});
