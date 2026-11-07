// Hinweis, wenn die andere Badestelle mindestens einen Stern besser ist.

export function vergleicheStellen(hier, dort, nameDort, profil) {
  if (!hier || !dort || hier.fehler || dort.fehler) return null;
  if (dort.sterne - hier.sterne < 1) return null;

  const F = profil.lieblingstemperatur;
  let grund = 'bessere Bedingungen';
  if (hier.veto && !dort.veto) grund = 'keine Warnung';
  else if (hier.mods.wind && !dort.mods.wind) grund = 'weniger Wind';
  else if (Math.abs(dort.wasser - F) < Math.abs(hier.wasser - F)) grund = dort.wasser > hier.wasser ? 'wärmeres Wasser' : 'kühleres Wasser';
  else if (hier.mods.kalt && !dort.mods.kalt) grund = 'wärmere Luft';

  return { text: `${nameDort} heute besser – ${grund}` };
}
