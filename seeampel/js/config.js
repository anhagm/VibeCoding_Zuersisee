// Zentrale Konfiguration. Alle Schwellen an einem Ort, damit sie begründbar und änderbar bleiben.

export const TOLERANZ = {
  // T in °C. Nicht in der Spezifikation festgelegt, hier bewusst gesetzt:
  // mittel = 3 und weit = 4 reproduzieren die Kurven der ersten Seeampel (Sünneler, Isbär).
  eng: 2,
  mittel: 3,
  weit: 4,
};

export const TOLERANZ_LABEL = { eng: 'Eng', mittel: 'Mittel', weit: 'Weit' };

export const PRESETS = {
  isbaer: { name: 'Isbär', lieblingstemperatur: 7, toleranz: 'weit', beschreibung: 'Eisbaden im Winter – je kälter, desto besser.' },
  suenneler: { name: 'Sünneler', lieblingstemperatur: 23, toleranz: 'mittel', beschreibung: 'Schwimmt im Sommer, wenn das Wasser angenehm ist.' },
  gfroerli: { name: 'Gfrörli', lieblingstemperatur: 25, toleranz: 'eng', beschreibung: 'Geht nur bei richtig warmem Wasser hinein.' },
};

export const TEMP_MIN = 4;
export const TEMP_MAX = 28;

export const SCHWELLEN = {
  luftWarm: 22, // Luft über 22 °C: +0.5
  bewoelkungSonne: 30, // weniger als 30 % Bewölkung bei Tag: +0.5
  luftKalt: 12, // Luft unter 12 °C: −0.5
  kaltSchwimmerBis: 12, // ausser bei Lieblingstemperatur bis 12 °C
  windKmh: 20, // Mittelwind ab 20 km/h: −1
  boeenVetoKmh: 46, // Böen ab 46 km/h: Veto
  vetoStunden: 2, // Prognose-Horizont für das Veto
  veraltetMinuten: 180, // Messung älter als 3 h: veraltet
};

export const STATIONEN = {
  tiefenbrunnen: { id: 'tiefenbrunnen', name: 'Tiefenbrunnen', lat: 47.3510, lon: 8.5600 },
  mythenquai: { id: 'mythenquai', name: 'Mythenquai', lat: 47.3590, lon: 8.5365 },
};

export const OPEN_METEO = {
  url: 'https://api.open-meteo.com/v1/forecast',
  // ICON-CH2 (2 km, 120 h) ist mit der ersten Seeampel geprüft, ICON-CH1 (1 km, 33 h) als Ersatz.
  modelle: ['meteoswiss_icon_ch2', 'meteoswiss_icon_ch1'],
};

export const ZEITZONE = 'Europe/Zurich';

export const TAGEBUCH = {
  maxStunden: 12,
  maxTempoKmh: 6,
  maxKommentar: 280,
};

export const LADEN = { minMs: 800, maxMs: 1500, fadeMs: 400 };
