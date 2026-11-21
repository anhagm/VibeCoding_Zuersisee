import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagebuchCsv, csvFeld, pruefeImport } from '../js/storage/export-import.js';
import { wochenStatistik, paceText, paceEintrag } from '../js/logic/diary-stats.js';
import { sauberName } from '../js/storage/profile.js';

const e = (o) => ({ id: 'a', datum: '2026-11-20', startMin: 600, endeMin: 645, strecke: 1.5, station: 'tiefenbrunnen', kommentar: '', messwerte: { wasser: 11.84, luft: 7, windKmh: 9.4 }, ...o });

test('CSV mit BOM, Semikolon, Kopfzeile', () => {
  const csv = tagebuchCsv([e()], () => 'Tiefenbrunnen');
  assert.ok(csv.startsWith('﻿Datum;Von;Bis'));
  assert.match(csv, /2026-11-20;10:00;10:45;45;1.5;3.00;Tiefenbrunnen;11.8;7.0;9;/);
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
