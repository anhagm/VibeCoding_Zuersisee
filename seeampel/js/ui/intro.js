// Intro beim Laden: Über der Oberfläche erscheint «Seeampel», dann taucht die Ansicht ab.
// Beim ersten Start 2,5 Sekunden, danach eine kurze Fassung (1,7 s), die mit dem Laden der Daten zusammenfällt.
// Bei "Bewegung reduzieren" wird es nicht gezeigt.

const welle = (fuellung) => `<svg viewBox="0 0 720 50" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 25 C60 10 120 10 180 25 C240 40 300 40 360 25 C420 10 480 10 540 25 C600 40 660 40 720 25 V50 H0 Z" fill="${fuellung}"/></svg>`;

export const INTRO_MS = { lang: 2500, kurz: 1700 };

export function zeigeIntro({ kurz = false } = {}) {
  const el = document.createElement('div');
  el.className = kurz ? 'intro kurz' : 'intro';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="intro-tauchen">
      <div class="intro-himmel"></div>
      <div class="intro-wasser"></div>
      <div class="intro-oberflaeche">${welle('#CDEBE6')}${welle('#CDEBE6')}</div>
      <i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="intro-marke"><strong>Seeampel</strong></div>`;
  document.body.append(el);
  setTimeout(() => el.remove(), (kurz ? INTRO_MS.kurz : INTRO_MS.lang) + 400);
  return el;
}
