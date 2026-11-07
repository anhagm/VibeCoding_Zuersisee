import { test } from 'node:test';
import assert from 'node:assert/strict';
import { farbeFuerWasser, seeFarbe } from '../js/logic/sea-color.js';

test('Stützfarben', () => {
  assert.equal(farbeFuerWasser(6), '#D8E1EA');
  assert.equal(farbeFuerWasser(21), '#BEE4E0');
  assert.equal(farbeFuerWasser(27, true), '#1A3027');
  assert.equal(farbeFuerWasser(2), '#D8E1EA');
  assert.equal(farbeFuerWasser(30), '#D0EDD3');
});

test('Fliessend dazwischen', () => {
  const c = farbeFuerWasser(19);
  assert.notEqual(c, '#C3E0E8');
  assert.notEqual(c, '#BEE4E0');
});

test('Veto und Veraltung', () => {
  assert.equal(seeFarbe({ wasser: 20, veto: true }), '#F5E7D8');
  assert.equal(seeFarbe({ wasser: 20, veto: true, dunkel: true }), '#2A2019');
  assert.notEqual(seeFarbe({ wasser: 20, veraltet: true }), seeFarbe({ wasser: 20 }));
});

test('Bewölkung wie in der ersten Seeampel (Screenshot 12.8°, bedeckt, dunkel)', () => {
  // gemessen im Screenshot: #1B242A
  const [r, g, b] = [0x1B, 0x24, 0x2A];
  const c = seeFarbe({ wasser: 12.8, bewoelkung: 100, dunkel: true });
  const n = parseInt(c.slice(1), 16);
  assert.ok(Math.abs(((n >> 16) & 255) - r) <= 2 && Math.abs(((n >> 8) & 255) - g) <= 2 && Math.abs((n & 255) - b) <= 2, c);
});
