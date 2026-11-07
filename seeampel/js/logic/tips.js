// Höchstens ein Tipp, was man anziehen oder mitnehmen sollte. Hinweise, keine medizinischen Anweisungen.

import { SCHWELLEN } from '../config.js';
import { ganz } from '../util/format.js';

export function tipp(messung, aktuell) {
  const { wasser, luft, windKmh, windchill } = messung;
  if (windchill !== null && windchill !== undefined && windchill < 5) {
    return `Windchill ${ganz(windchill)}° – warme Kleider und Mütze bereitlegen`;
  }
  if (wasser < 12) return `Wasser ${ganz(wasser)}° – Mütze und warme Kleider fürs Danach mitnehmen`;
  if (windKmh >= SCHWELLEN.windKmh) return `Wind ${ganz(windKmh)} km/h – Schwimmboje mitnehmen, damit man dich sieht`;
  if (aktuell && aktuell.tag && aktuell.bewoelkung < SCHWELLEN.bewoelkungSonne && luft > SCHWELLEN.luftWarm) {
    return `Sonne und ${ganz(luft)}° – Sonnencreme und Trinkwasser mitnehmen`;
  }
  if (luft < 15) return `Luft ${ganz(luft)}° – warme Kleider fürs Danach bereitlegen`;
  return null;
}
