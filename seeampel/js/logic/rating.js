// Bewertungslogik. Reine Funktionen: kein DOM, kein fetch, keine Uhr. "jetzt" wird übergeben.

import { TOLERANZ, SCHWELLEN } from '../config.js';
import { ganz } from '../util/format.js';
import { stundeAbgerundet, plusStunden, stundeVon } from '../util/zeit.js';

export const halbeSterne = (x) => Math.round(x * 2) / 2;
const klemmen = (x, min, max) => Math.min(max, Math.max(min, x));

export function toleranzWert(toleranz) {
  const t = TOLERANZ[toleranz];
  if (t === undefined) throw new Error(`Unbekannte Toleranz: ${toleranz}`);
  return t;
}

// Wohlfühlbereiche für die Anzeige: ideal = 5 Sterne, gut = mindestens 3 Sterne (Grundwertung).
export function bereiche(F, toleranz, min = 4, max = 28) {
  const T = toleranzWert(toleranz);
  const k = (x) => Math.min(max, Math.max(min, x));
  return { ideal: [k(F - 1), k(F + 1)], gut: [k(F - 1 - T), k(F + 1 + T)] };
}

// Grundwertung aus Wassertemperatur, Lieblingstemperatur F und Toleranz T.
export function grundwertung(wasser, F, T) {
  const punkte = [
    [F - 1 - 2 * T, 1],
    [F - 1 - T, 3],
    [F - 1, 5],
    [F + 1, 5],
    [F + 1 + T, 3],
    [F + 1 + 2 * T, 1],
  ];
  if (wasser <= punkte[0][0] || wasser >= punkte[5][0]) return 1;
  for (let i = 0; i < punkte.length - 1; i++) {
    const [x0, y0] = punkte[i];
    const [x1, y1] = punkte[i + 1];
    if (wasser >= x0 && wasser <= x1) {
      return x1 === x0 ? y0 : y0 + ((wasser - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 1;
}

// Wertung ohne Veto. Eingaben: Wasser, Luft, Mittelwind (km/h), Bewölkung (%), Tag (bool).
export function bewerte({ wasser, luft, windKmh, bewoelkung, tag }, profil) {
  const F = profil.lieblingstemperatur;
  const T = toleranzWert(profil.toleranz);
  const basis = grundwertung(wasser, F, T);

  const warm = luft > SCHWELLEN.luftWarm;
  const sonne = Boolean(tag) && bewoelkung !== null && bewoelkung !== undefined && bewoelkung < SCHWELLEN.bewoelkungSonne;
  const kalt = luft < SCHWELLEN.luftKalt && F > SCHWELLEN.kaltSchwimmerBis;
  const wind = windKmh >= SCHWELLEN.windKmh;

  let wert = basis;
  if (warm || sonne) wert += 0.5;
  if (kalt) wert -= 0.5;
  if (wind) wert -= 1;

  return {
    sterne: halbeSterne(klemmen(wert, 1, 5)),
    basis,
    mods: { warm, sonne, kalt, wind },
  };
}

// Stunden der Prognose im Veto-Fenster: aktuelle Stunde bis +2 h.
export function vetoFenster(stunden, jetzt) {
  const von = stundeAbgerundet(jetzt);
  const bis = plusStunden(von, SCHWELLEN.vetoStunden);
  return stunden.filter((h) => h.zeit >= von && h.zeit <= bis);
}

const istGewitter = (code) => code >= 95 && code <= 99;

export function stundenVeto(h) {
  if (istGewitter(h.code)) return 'gewitter';
  if (h.boeenKmh >= SCHWELLEN.boeenVetoKmh) return 'sturm';
  return null;
}

// Gibt null (kein Veto), ein Veto-Objekt oder {fehlend: true} zurück.
export function pruefeVeto(boeenKmh, stunden, jetzt) {
  if (boeenKmh >= SCHWELLEN.boeenVetoKmh) {
    return { art: 'boeen', prognose: false, text: `Böen mit ${ganz(boeenKmh)} km/h gemessen` };
  }
  const fenster = vetoFenster(stunden, jetzt);
  const erwartet = SCHWELLEN.vetoStunden + 1;
  if (fenster.length < erwartet || fenster.some((h) => h.code == null || h.boeenKmh == null)) {
    return { fehlend: true };
  }
  for (const h of fenster) {
    const art = stundenVeto(h);
    if (art === 'gewitter') {
      return { art, prognose: true, ab: stundeVon(h.zeit), text: `Gewitter möglich ab ${stundeVon(h.zeit)} Uhr (Prognose)` };
    }
    if (art === 'sturm') {
      return { art, prognose: true, ab: stundeVon(h.zeit), text: `Sturmböen möglich ab ${stundeVon(h.zeit)} Uhr (Prognose)` };
    }
  }
  return null;
}

// Genau ein Satz mit dem entscheidenden Faktor.
export function begruendung({ wasser, luft, windKmh }, ergebnis, profil) {
  const w = ganz(wasser);
  const F = profil.lieblingstemperatur;
  const { mods, basis } = ergebnis;

  if (mods.wind) return { text: `Wasser ${w}°, aber Wind mit ${ganz(windKmh)} km/h`, prognose: false };
  if (mods.kalt) return { text: `Wasser ${w}°, aber Luft nur ${ganz(luft)}°`, prognose: false };
  if (basis >= 5) {
    return w === F
      ? { text: `Wasser ${w}° – genau deine Lieblingstemperatur`, prognose: false }
      : { text: `Wasser ${w}° – fast deine Lieblingstemperatur`, prognose: false };
  }
  if (mods.warm) return { text: `Wasser ${w}°, dafür Luft ${ganz(luft)}°`, prognose: false };
  if (mods.sonne) return { text: `Wasser ${w}°, dafür Sonne (Prognose)`, prognose: true };
  const d = w - F;
  if (d < 0) return { text: `Wasser ${w}° – ${-d}° kälter als deine Lieblingstemperatur`, prognose: false };
  if (d > 0) return { text: `Wasser ${w}° – ${d}° wärmer als deine Lieblingstemperatur`, prognose: false };
  return { text: `Wasser ${w}° – fast deine Lieblingstemperatur`, prognose: false };
}

// Gesamtbewertung für die Startseite.
// messung: { wasser, luft, windKmh, boeenKmh }
// prognose: { stunden: [...], aktuell: { bewoelkung, tag } }
export function rate(messung, prognose, profil, jetzt) {
  const veto = pruefeVeto(messung.boeenKmh, prognose.stunden, jetzt);
  if (veto && veto.fehlend) return { fehler: 'prognose' };

  const ergebnis = bewerte({
    wasser: messung.wasser,
    luft: messung.luft,
    windKmh: messung.windKmh,
    bewoelkung: prognose.aktuell.bewoelkung,
    tag: prognose.aktuell.tag,
  }, profil);

  if (veto) {
    return { ...ergebnis, wasser: messung.wasser, sterne: 0, veto, satz: { text: veto.text, prognose: veto.prognose } };
  }
  return { ...ergebnis, wasser: messung.wasser, veto: null, satz: begruendung(messung, ergebnis, profil) };
}
