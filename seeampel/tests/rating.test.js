import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grundwertung, bewerte, pruefeVeto, rate, halbeSterne } from '../js/logic/rating.js';

const suenneler = { lieblingstemperatur: 23, toleranz: 'mittel' };
const isbaer = { lieblingstemperatur: 7, toleranz: 'weit' };
const gfroerli = { lieblingstemperatur: 25, toleranz: 'eng' };
const neutral = { luft: 18, windKmh: 5, bewoelkung: 80, tag: true };

test('Stützpunkte der Grundwertung', () => {
  assert.equal(grundwertung(16, 23, 3), 1);
  assert.equal(grundwertung(19, 23, 3), 3);
  assert.equal(grundwertung(22, 23, 3), 5);
  assert.equal(grundwertung(24, 23, 3), 5);
  assert.equal(grundwertung(27, 23, 3), 3);
  assert.equal(grundwertung(30, 23, 3), 1);
  assert.equal(grundwertung(2, 23, 3), 1);
  assert.equal(grundwertung(20.5, 23, 3), 4);
});

test('Plausibilität Ende Oktober (12–14° Wasser)', () => {
  for (const w of [12, 13, 14]) {
    assert.equal(bewerte({ wasser: w, ...neutral }, suenneler).sterne, 1);
    assert.equal(bewerte({ wasser: w, ...neutral }, gfroerli).sterne, 1);
  }
  assert.equal(bewerte({ wasser: 12, ...neutral }, isbaer).sterne, 3);
  assert.equal(bewerte({ wasser: 13, ...neutral }, isbaer).sterne, 2.5);
});

test('Zuschläge und Abzüge', () => {
  const w = 19;
  assert.equal(bewerte({ wasser: w, luft: 23, windKmh: 5, bewoelkung: 80, tag: true }, suenneler).sterne, 3.5);
  assert.equal(bewerte({ wasser: w, luft: 18, windKmh: 5, bewoelkung: 20, tag: true }, suenneler).sterne, 3.5);
  assert.equal(bewerte({ wasser: w, luft: 18, windKmh: 5, bewoelkung: 20, tag: false }, suenneler).sterne, 3, 'Sonne nur bei Tag');
  assert.equal(bewerte({ wasser: w, luft: 25, windKmh: 5, bewoelkung: 10, tag: true }, suenneler).sterne, 3.5, 'Bonus nur einmal');
  assert.equal(bewerte({ wasser: w, luft: 10, windKmh: 5, bewoelkung: 80, tag: true }, suenneler).sterne, 2.5);
  assert.equal(bewerte({ wasser: 7, luft: 3, windKmh: 5, bewoelkung: 80, tag: true }, isbaer).sterne, 5, 'kein Luftabzug bis F=12');
  assert.equal(bewerte({ wasser: w, luft: 18, windKmh: 20, bewoelkung: 80, tag: true }, suenneler).sterne, 2);
  assert.equal(bewerte({ wasser: w, luft: 18, windKmh: 19.9, bewoelkung: 80, tag: true }, suenneler).sterne, 3);
  assert.equal(bewerte({ wasser: 10, luft: 5, windKmh: 30, bewoelkung: 80, tag: true }, suenneler).sterne, 1, 'nie unter 1');
  assert.equal(bewerte({ wasser: 23, luft: 25, windKmh: 2, bewoelkung: 0, tag: true }, suenneler).sterne, 5, 'nie über 5');
});

test('Halbe Sterne', () => {
  assert.equal(halbeSterne(3.24), 3);
  assert.equal(halbeSterne(3.26), 3.5);
  assert.equal(halbeSterne(4.76), 5);
});

const stunden = (jetzt, ueberschreiben = {}) => Array.from({ length: 6 }, (_, i) => {
  const h = Number(jetzt.slice(11, 13)) + i;
  const zeit = `${jetzt.slice(0, 11)}${String(h).padStart(2, '0')}:00`;
  return { zeit, luft: 18, bewoelkung: 50, windKmh: 8, boeenKmh: 15, code: 1, tag: true, ...(ueberschreiben[i] || {}) };
});

test('Veto: gemessene Böen', () => {
  const v = pruefeVeto(46, stunden('2026-07-01T14:20'), '2026-07-01T14:20');
  assert.equal(v.art, 'boeen');
  assert.equal(v.prognose, false);
  assert.equal(pruefeVeto(45.9, stunden('2026-07-01T14:20'), '2026-07-01T14:20'), null);
});

test('Veto: Gewitter und Sturm in den nächsten 2 h, mit Uhrzeit', () => {
  const jetzt = '2026-07-01T14:20';
  assert.equal(pruefeVeto(10, stunden(jetzt, { 1: { code: 95 } }), jetzt).text, 'Gewitter möglich ab 15 Uhr (Prognose)');
  assert.equal(pruefeVeto(10, stunden(jetzt, { 2: { boeenKmh: 50 } }), jetzt).text, 'Sturmböen möglich ab 16 Uhr (Prognose)');
  assert.equal(pruefeVeto(10, stunden(jetzt, { 3: { code: 99 } }), jetzt), null, 'nach 2 h kein Veto');
});

test('Fehlende Prognose: keine Sterne', () => {
  const jetzt = '2026-07-01T14:20';
  const r = rate({ wasser: 20, luft: 20, windKmh: 5, boeenKmh: 10 }, { stunden: stunden(jetzt, { 1: { code: null } }), aktuell: { bewoelkung: 50, tag: true } }, suenneler, jetzt);
  assert.equal(r.fehler, 'prognose');
});

test('Begründungssatz', () => {
  const jetzt = '2026-07-01T14:20';
  const p = { stunden: stunden(jetzt), aktuell: { bewoelkung: 80, tag: true } };
  assert.equal(rate({ wasser: 17.2, luft: 18, windKmh: 25, boeenKmh: 30 }, p, suenneler, jetzt).satz.text, 'Wasser 17°, aber Wind mit 25 km/h');
  assert.equal(rate({ wasser: 21.4, luft: 18, windKmh: 5, boeenKmh: 10 }, p, { lieblingstemperatur: 22, toleranz: 'mittel' }, jetzt).satz.text, 'Wasser 21° – fast deine Lieblingstemperatur');
  assert.equal(rate({ wasser: 14, luft: 18, windKmh: 5, boeenKmh: 10 }, p, suenneler, jetzt).satz.text, 'Wasser 14° – 9° kälter als deine Lieblingstemperatur');
  const sonne = rate({ wasser: 19, luft: 18, windKmh: 5, boeenKmh: 10 }, { ...p, aktuell: { bewoelkung: 10, tag: true } }, suenneler, jetzt);
  assert.equal(sonne.satz.text, 'Wasser 19°, dafür Sonne (Prognose)');
  assert.equal(sonne.satz.prognose, true);
  const veto = rate({ wasser: 22, luft: 25, windKmh: 5, boeenKmh: 10 }, { stunden: stunden(jetzt, { 1: { code: 96 } }), aktuell: p.aktuell }, suenneler, jetzt);
  assert.equal(veto.sterne, 0);
  assert.equal(veto.satz.prognose, true);
});
