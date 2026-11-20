import { test } from 'node:test';
import assert from 'node:assert/strict';
import { szene } from '../js/logic/scene.js';
import { seeVerlauf } from '../js/logic/sea-color.js';

const m = (o) => ({ wasser: 20, luft: 20, windKmh: 5, veraltet: false, ...o });

test('Sonne gibt Lichtnetze und Strahlen, nur bei Tag', () => {
  assert.equal(szene({ messung: m(), aktuell: { tag: true, bewoelkung: 10 } }).strahlen, 1);
  assert.equal(szene({ messung: m(), aktuell: { tag: false, bewoelkung: 10 } }).kaustik, 0);
});

test('Wind beschleunigt die Wellen', () => {
  const ruhig = szene({ messung: m({ windKmh: 2 }), aktuell: { tag: true, bewoelkung: 50 } }).welleSek;
  const wind = szene({ messung: m({ windKmh: 27 }), aktuell: { tag: true, bewoelkung: 50 } }).welleSek;
  assert.ok(wind < 6 && ruhig > 15);
});

test('Kälte lässt beschlagen', () => {
  assert.equal(szene({ messung: m({ luft: 4 }), aktuell: { tag: true, bewoelkung: 90 } }).beschlag, 1);
  assert.equal(szene({ messung: m({ luft: 12 }), aktuell: { tag: true, bewoelkung: 90 } }).beschlag, 0);
});

test('Veraltet, Fehler und Veto', () => {
  assert.equal(szene({ messung: m({ veraltet: true }) }).still, true);
  assert.equal(szene({ fehler: true }).still, true);
  const v = szene({ messung: m(), aktuell: { tag: true, bewoelkung: 0 }, veto: { art: 'gewitter' } });
  assert.equal(v.kaustik, 0);
  assert.equal(v.blitz, true);
  assert.equal(seeVerlauf({ veto: true }).mitte, '#2F3A43');
});
