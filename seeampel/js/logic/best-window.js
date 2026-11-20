// Bestes Zeitfenster des restlichen Tages aus der stündlichen Prognose.
// Das Wasser ändert sich innert Stunden kaum, deshalb wird die gemessene Wassertemperatur verwendet.

import { bewerte, stundenVeto } from './rating.js';
import { datumTeil, stundeAbgerundet, stundeVon } from '../util/zeit.js';
import { sterneText } from '../util/format.js';
import { SCHWELLEN } from '../config.js';

const MAX_LAENGE = 3;

export function besteZeitfenster(wasser, stunden, profil, jetzt) {
  const heute = datumTeil(jetzt);
  const ab = stundeAbgerundet(jetzt);
  const kandidaten = stunden.filter((h) =>
    datumTeil(h.zeit) === heute && h.zeit >= ab && h.tag &&
    [h.luft, h.windKmh, h.boeenKmh, h.code, h.bewoelkung].every((v) => v !== null && v !== undefined));

  if (!kandidaten.length) return { art: 'keine', text: 'Heute keine Stunden mit Tageslicht mehr in der Prognose' };

  // Gleiche Regel wie das Veto: Gewitter oder Sturm in dieser oder den nächsten zwei Stunden.
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

  const start = bewertet.findIndex((b) => b.sterne === max);
  let ende = start;
  while (ende + 1 < bewertet.length && ende - start + 1 < MAX_LAENGE &&
    bewertet[ende + 1].sterne === max && bewertet[ende + 1].stunde === bewertet[ende].stunde + 1) {
    ende++;
  }
  const von = bewertet[start].stunde;
  const bis = bewertet[ende].stunde + 1;
  return {
    art: 'fenster', von, bis, sterne: max, stunden: bewertet,
    text: `Am besten heute ${von}–${bis} Uhr (${sterneText(max)}, Prognose)`,
  };
}
