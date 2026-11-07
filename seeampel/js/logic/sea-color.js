// Seefarbe nach Wassertemperatur, mit Bewölkung, Veraltung und Veto.

const STOPS_HELL = [[6, '#D8E1EA'], [12, '#CBDDEB'], [17, '#C3E0E8'], [21, '#BEE4E0'], [24, '#BFE9D8'], [27, '#D0EDD3']];
const STOPS_DUNKEL = [[6, '#19222A'], [12, '#162632'], [17, '#132A32'], [21, '#122E2D'], [24, '#13302A'], [27, '#1A3027']];
const VETO = { hell: '#F5E7D8', dunkel: '#2A2019' };
// Grau und Mischanteile aus der ersten Seeampel übernommen.
const GRAU = { hell: '#E3E6E8', dunkel: '#1C1F21' };

export function hexZuRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbZuHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const mischen = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function farbeFuerWasser(wasser, dunkel = false) {
  const stops = dunkel ? STOPS_DUNKEL : STOPS_HELL;
  if (wasser <= stops[0][0]) return stops[0][1];
  if (wasser >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (wasser >= t0 && wasser <= t1) {
      return rgbZuHex(mischen(hexZuRgb(c0), hexZuRgb(c1), (wasser - t0) / (t1 - t0)));
    }
  }
  return stops[0][1];
}

// zustand: { wasser, bewoelkung, veraltet, veto, dunkel }
// Bewölkung mischt bis 45 % Grau bei (ohne Wert 15 %), veraltete Daten mindestens 70 %.
export function seeFarbe({ wasser = null, bewoelkung = null, veraltet = false, veto = false, dunkel = false }) {
  const modus = dunkel ? 'dunkel' : 'hell';
  if (veto) return VETO[modus];
  let grau = bewoelkung === null || bewoelkung === undefined ? 0.15 : Math.min(1, Math.max(0, bewoelkung / 100)) * 0.45;
  if (veraltet || wasser === null) grau = Math.max(grau, 0.7);
  return rgbZuHex(mischen(hexZuRgb(farbeFuerWasser(wasser ?? 17, dunkel)), hexZuRgb(GRAU[modus]), grau));
}
