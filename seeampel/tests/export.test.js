import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagebuchCsv, csvFeld, pruefeImport } from '../js/storage/export-import.js';
import { wochenStatistik, paceText, paceEintrag } from '../js/logic/diary-stats.js';
import { sauberName } from '../js/storage/profile.js';

const e = (o) => ({ id: 'a', datum: '2026-11-20', startMin: 600, endeMin: 645, strecke: 1.5, station: 'tiefenbrunnen', kommentar: '', messwerte: { wasser: 11.84, luft: 7, windKmh: 9.4 }, ...o });

test('CSV mit BOM, Semikolon, Kopfzeile', () => {
  const csv = tagebuchCsv([e()], () => 'Tiefenbrunnen');
  assert.ok(csv.startsWith('﻿Datum;Von;Bis'));
  assert.match(csv, /2026-11-20;10:00;10:45;45;1.5;nein;3.00;Tiefenbrunnen;11.8;7.0;9;/);
});

test('CSV schützt Sonderzeichen und Formeln', () => {
  assert.equal(csvFeld('Wasser; kalt'), '"Wasser; kalt"');
  assert.equal(csvFeld('Sie sagte "hoi"'), '"Sie sagte ""hoi"""');
  assert.equal(csvFeld('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvFeld(1.5), '1.5');
});

test('Tempo pro 100 m', () => {
  assert.equal(paceText(paceEintrag(e())), '3:00');
  assert.equal(paceText(2.0833), '2:05');
  assert.equal(paceText(null), '–');
  const st = wochenStatistik([e(), e({ id: 'b', datum: '2026-11-18', startMin: 420, endeMin: 450, strecke: 1 })], '2026-11-20');
  assert.equal(st.minuten, 75);
  assert.equal(st.dieseWoche, 2.5);
  assert.equal(paceText(st.pace100), '3:00');
});

test('Name wird bereinigt', () => {
  assert.equal(sauberName('  Anna   Maria '), 'Anna Maria');
  assert.equal(sauberName('x'.repeat(50)).length, 30);
  assert.equal(sauberName(undefined), '');
});

test('Sicherung bleibt importierbar', () => {
  const datei = JSON.stringify({ format: 'seeampel-tagebuch', version: 1, eintraege: [e()] });
  assert.equal(pruefeImport(datei, []).neu.length, 1);
});

import { schaetzeStrecke, tempoHinweis } from '../js/logic/diary-stats.js';
test('Strecke schätzen', () => {
  assert.equal(schaetzeStrecke(30, 'gemuetlich'), 1);
  assert.equal(schaetzeStrecke(45, 'sportlich'), 3);
  assert.equal(schaetzeStrecke(1, 'gemuetlich'), 0.1);
  assert.equal(schaetzeStrecke(30, 'unbekannt'), null);
});
test('Tempo während der Eingabe', () => {
  assert.equal(tempoHinweis(1, 30).text, 'gemütliches Tempo');
  assert.equal(tempoHinweis(1.5, 30).text, 'zügiges Tempo');
  assert.equal(tempoHinweis(20, 30).warnung, true);
  assert.equal(tempoHinweis(0, 30), null);
});
test('Geschätzte Strecken zählen zu den km, nicht zum Tempo', () => {
  const a = { datum: '2026-11-20', startMin: 600, endeMin: 630, strecke: 1, station: 'tiefenbrunnen' };
  const st = wochenStatistik([a, { ...a, datum: '2026-11-19', strecke: 3, geschaetzt: true }], '2026-11-20');
  assert.equal(st.dieseWoche, 4);
  assert.equal(paceText(st.pace100), '3:00');
  assert.equal(st.geschaetzte, 1);
  assert.equal(paceEintrag({ ...a, geschaetzt: true }), null);
});
