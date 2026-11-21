// Das Scriptable-Widget muss gleich bewerten wie die PWA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { rate } from '../js/logic/rating.js';
import { besteZeitfenster } from '../js/logic/best-window.js';
import { seeVerlauf } from '../js/logic/sea-color.js';
import { PRESETS } from '../js/config.js';
import { normalisiereMessung } from '../js/data/measurement.js';
import { normalisierePrognose } from '../js/data/forecast.js';
import { szenario, testMessungJson, testPrognoseJson } from '../js/data/scenarios.js';

function ladeWidget() {
  const code = readFileSync(new URL('../widget/Seeampel.js', import.meta.url), 'utf8').replace('await main();', 'main();');
  const ctx = { module: { exports: {} }, Intl, Date, Math, Number, String, Object, Array, JSON, Boolean, parseInt, Promise };
  vm.runInNewContext(code, ctx);
  return ctx.module.exports;
}
const W = ladeWidget();
const gleich = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));

// Kleiner, reproduzierbarer Zufallsgenerator.
let saat = 42;
const zufall = () => ((saat = (saat * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

test('rate() liefert für 3000 zufällige Lagen dasselbe wie die PWA', () => {
  const profile = [...Object.values(PRESETS), { lieblingstemperatur: 18, toleranz: 'eng' }];
  for (let n = 0; n < 3000; n++) {
    const jetzt = `2026-07-15T${String(6 + Math.floor(zufall() * 14)).padStart(2, '0')}:20`;
    const stunden = Array.from({ length: 48 }, (_, i) => {
      const t = new Date(Date.UTC(2026, 6, 15, i)).toISOString().slice(0, 16);
      return { zeit: t, luft: 5 + zufall() * 25, bewoelkung: zufall() * 100, windKmh: zufall() * 35,
        boeenKmh: zufall() * 60, code: zufall() < 0.05 ? 95 : 1, tag: i % 24 >= 7 && i % 24 < 18 };
    });
    const messung = { wasser: 4 + zufall() * 24, luft: 2 + zufall() * 30, windKmh: zufall() * 35, boeenKmh: zufall() * 55 };
    const prognose = { stunden, aktuell: { bewoelkung: zufall() * 100, tag: zufall() < 0.7 } };
    const profil = profile[n % profile.length];
    gleich(W.rate(messung, prognose, profil, jetzt), rate(messung, prognose, profil, jetzt));
    gleich(W.besteZeitfenster(messung.wasser, stunden, profil, jetzt), besteZeitfenster(messung.wasser, stunden, profil, jetzt));
  }
});

test('alle Testzustände ergeben im Widget dieselben Sterne und Sätze wie in der PWA', () => {
  const jetztDate = new Date('2026-07-15T11:20:00+02:00');
  const jetzt = W.lokalIso(jetztDate);
  assert.equal(jetzt, '2026-07-15T11:20');
  for (const name of Object.keys(W.SZENARIEN)) {
    if (name === 'offline') continue;
    for (const station of ['tiefenbrunnen', 'mythenquai']) {
      const d = W.testDaten(name, station, jetztDate);
      const s = szenario(name);
      const { windchill, ...erwartet } = testMessungJson(s, station, jetztDate).values;
      gleich(d.messung.values, erwartet);
      gleich(d.prognose, testPrognoseJson(s, station, jetzt));
      const profil = PRESETS.suenneler;
      const w = W.bewerteStation(station, d.messung, d.prognose, profil, jetztDate);
      const m = normalisiereMessung(d.messung, jetztDate.getTime());
      if (!m.ok) { assert.equal(w.fehler, 'ungueltig', name); continue; }
      const pwa = rate(m.messung, normalisierePrognose(d.prognose), profil, jetzt);
      assert.equal(w.sterne, pwa.sterne, name);
      gleich(w.satz, pwa.satz);
      assert.equal(w.veraltet, m.messung.veraltet, name);
    }
  }
});

test('Seefarbe ist identisch', () => {
  for (const z of [{ wasser: 8 }, { wasser: 22, bewoelkung: 10 }, { wasser: 19, veraltet: true }, { veto: true }]) {
    for (const dunkel of [false, true]) gleich(W.seeVerlauf({ ...z, dunkel }), seeVerlauf({ ...z, dunkel }));
  }
});

test('Parameter werden verstanden', () => {
  const p = W.leseParameter('Isbär, Mythenquai, Anna');
  assert.equal(p.profil.name, 'Isbär');
  assert.equal(p.station, 'mythenquai');
  assert.equal(p.name, 'Anna');
  assert.equal(W.leseParameter('gfrorli').profil.lieblingstemperatur, 25);
  assert.equal(W.leseParameter('Suenneler').profil.lieblingstemperatur, 23);
  const eigen = W.leseParameter('21 eng; test=veto_gewitter');
  assert.deepEqual([eigen.profil.lieblingstemperatur, eigen.profil.toleranz, eigen.test], [21, 'eng', 'veto_gewitter']);
  assert.equal(W.leseParameter('').station, 'tiefenbrunnen');
  assert.ok(W.leseParameter('###').warnung);
});

test('gespeichertes Profil ist die Grundlage, der Parameter überschreibt nur einzelne Teile', () => {
  const gespeichert = { name: 'Anna', profil: { name: 'Isbär', lieblingstemperatur: 7, toleranz: 'weit' }, station: 'mythenquai' };
  assert.equal(W.leseParameter('', null).eingerichtet, false);
  assert.equal(W.leseParameter('test=sonne', null).eingerichtet, true);
  const ein = W.leseParameter('', gespeichert);
  assert.deepEqual([ein.eingerichtet, ein.name, ein.station, ein.profil.lieblingstemperatur], [true, 'Anna', 'mythenquai', 7]);
  const zweit = W.leseParameter('Tiefenbrunnen, test=kalt', gespeichert);
  assert.deepEqual([zweit.name, zweit.station, zweit.profil.name, zweit.test], ['Anna', 'tiefenbrunnen', 'Isbär', 'kalt']);
  assert.equal(gespeichert.station, 'mythenquai');
});

test('Wohlfühlbereiche und Name wie in der PWA', async () => {
  const { bereiche } = await import('../js/logic/rating.js');
  for (const F of [4, 7, 18, 23, 28]) for (const t of ['eng', 'mittel', 'weit']) gleich(W.bereiche(F, t), bereiche(F, t));
  assert.equal(W.sauberName('  Anna   Maria '), 'Anna Maria');
  assert.equal(W.sauberName('   '), null);
});
