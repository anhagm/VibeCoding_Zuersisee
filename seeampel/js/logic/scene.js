// Welche Wassereffekte gelten. Jeder Effekt ist an einen Messwert oder eine Prognose gebunden.

import { SCHWELLEN } from '../config.js';

// eingabe: { messung, aktuell: {bewoelkung, tag}, veto, fehler }
export function szene({ messung = null, aktuell = null, veto = null, fehler = false } = {}) {
  const ruhig = { kaustik: 0, strahlen: 0, welleSek: 18, beschlag: 0, blasen: 0, blitz: false, still: true };
  if (fehler || !messung) return ruhig;
  if (messung.veraltet) return { ...ruhig };
  if (veto) return { ...ruhig, welleSek: 9, still: false, blitz: veto.art === 'gewitter' };

  const tag = Boolean(aktuell?.tag);
  const wolken = aktuell?.bewoelkung ?? 100;
  const sonne = tag && wolken < SCHWELLEN.bewoelkungSonne;
  const licht = tag ? Math.max(0, 1 - wolken / 100) : 0;

  // Wind: ruhig 18 s pro Welle, ab 20 km/h deutlich schneller, minimal 3 s.
  const w = messung.windKmh;
  const welleSek = w >= SCHWELLEN.windKmh ? Math.max(3, 6 - (w - SCHWELLEN.windKmh) / 5) : 18 - (w / SCHWELLEN.windKmh) * 8;

  return {
    kaustik: sonne ? 0.85 : Math.round(licht * 0.45 * 100) / 100,
    strahlen: sonne ? 1 : 0,
    welleSek: Math.round(welleSek * 10) / 10,
    beschlag: messung.luft < SCHWELLEN.luftKalt ? 1 : 0,
    blasen: tag ? 0.9 : 0.5,
    blitz: false,
    still: false,
  };
}
