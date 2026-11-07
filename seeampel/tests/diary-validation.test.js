import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruefeEintrag, parseStrecke } from '../js/logic/diary-validation.js';

const e = (o) => ({ datum: '2026-07-01', startMin: 600, endeMin: 660, streckeText: '2', ...o });

test('Komma und Punkt', () => {
  assert.equal(parseStrecke('1,5').wert, 1.5);
  assert.equal(parseStrecke(' 2.25 ').wert, 2.25);
  assert.ok(parseStrecke('').leer);
  assert.ok(parseStrecke('abc').ungueltig);
  assert.ok(parseStrecke('-1').ungueltig);
});

test('Gültiger Eintrag', () => {
  const r = pruefeEintrag(e({ streckeText: '1,5' }));
  assert.equal(r.ok, true);
  assert.equal(r.strecke, 1.5);
});

test('Unmögliche Einträge', () => {
  assert.match(pruefeEintrag(e({ endeMin: 590 })).text, /liegt vor dem Start/);
  assert.match(pruefeEintrag(e({ endeMin: 600 })).text, /0 Minuten/);
  assert.match(pruefeEintrag(e({ startMin: 0, endeMin: 13 * 60 })).text, /mehr als 12 Stunden/);
  assert.match(pruefeEintrag(e({ streckeText: '' })).text, /Ohne Strecke/);
  assert.match(pruefeEintrag(e({ streckeText: '0' })).text, /0 km/);
  assert.equal(pruefeEintrag(e({ streckeText: '200' })).text, '200 km in 1 h wären 200 km/h – schneller als Weltrekordtempo. Prüf Strecke oder Zeit.');
  assert.equal(pruefeEintrag(e({ streckeText: '6' })).ok, true, '6 km/h ist noch erlaubt');
});

test('Überschneidung, aber nicht mit sich selbst', () => {
  const bestehend = [{ id: 'a', datum: '2026-07-01', startMin: 630, endeMin: 700 }];
  assert.match(pruefeEintrag(e(), bestehend).text, /schon ein Schwumm/);
  assert.equal(pruefeEintrag(e(), bestehend, 'a').ok, true);
  assert.equal(pruefeEintrag(e({ startMin: 700, endeMin: 730 }), bestehend).ok, true, 'direkt anschliessend ist erlaubt');
  assert.equal(pruefeEintrag(e({ datum: '2026-07-02' }), bestehend).ok, true);
});
