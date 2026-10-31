// ============================================================
// Seeampel · Web-App (PWA)
// Frage: "Lohnt es sich jetzt, im Zürichsee zu schwimmen – für mich?"
// Bewertungslogik 1:1 aus dem Scriptable-Widget übernommen (rate()).
// Testmodus über die Adresse: ?test=normal | wind | kalt | hitze | veto_boeen |
//   veto_gewitter | ungueltig | offline | prognose_fehlt | veraltet
// ============================================================

// ============================================================
// PROFILE (alle Profildaten an einer Stelle)
// ============================================================
const PROFILE = {
  isbaer: {
    name: "Isbär", ideal: "4–9°", text: "Kaltes Wasser ist der Punkt",
    anchors: [[4, 5], [9, 5], [10, 3], [14, 3], [16, 1]],
    luft: "klassisch_ohne_kaelte",
  },
  suenneler: {
    name: "Sünneler", ideal: "ab 22°", text: "Schwimmen, wenn Sommer ist",
    anchors: [[16, 1], [19, 3], [22, 5]],
    luft: "klassisch",
  },
  gfroerli: {
    name: "Gfrörli", ideal: "ab 24°", text: "Nur wenn's richtig warm ist",
    anchors: [[19, 1], [21, 3], [24, 5]],
    luft: "klassisch",
  },
}
const SPEICHER_KEY = "seeampel.profil"

// ---------- Quellen ----------
const URL_MESS = "/api/messung"   // Proxy auf Vercel (siehe api/messung.js)
const URL_PROG = "https://api.open-meteo.com/v1/forecast?latitude=47.35&longitude=8.56"
  + "&hourly=weather_code,precipitation_probability,cloud_cover,wind_gusts_10m,is_day"
  + "&models=meteoswiss_icon_ch2&timezone=Europe%2FBerlin&forecast_days=2"

// ---------- Schwellen ----------
const T = {
  airWarm: 22,          // °C, darüber +0.5
  airCold: 12,          // °C, darunter -0.5 (nicht Isbär)
  sunCloud: 30,         // % Bewölkung, darunter = Sonne
  windAvgMs: 5.6,       // m/s Mittelwind, ab hier -1
  gustVetoMs: 12.8,     // m/s gemessene Böe → Veto (≈ 46 km/h)
  gustVetoKmh: 46,      // km/h prognostizierte Böe → Veto
  forecastHours: 2,     // aktuelle Stunde + 2 Folgestunden
  staleMs: 3 * 3600e3,  // Messung älter → "veraltet"
  refreshMs: 10 * 60e3, // neu laden, solange die App offen ist
  timeoutMs: 10e3,
}
const MS_TO_KMH = 3.6

// ---------- Luft-Modifikatoren ----------
const classicAir = coldAirPenalty => air =>
  air > T.airWarm ? { delta: 0.5, kind: "warm" }
  : coldAirPenalty && air < T.airCold ? { delta: -0.5, kind: "cold" }
  : { delta: 0, kind: "neutral" }

const AIR_MODS = {
  klassisch: classicAir(true),
  klassisch_ohne_kaelte: classicAir(false),
}

// ============================================================
// BEWERTUNG (rein: keine Uhr, kein Netz, keine Darstellung)
// ============================================================
function interpolate(anchors, x) {
  if (x <= anchors[0][0]) return anchors[0][1]
  const last = anchors[anchors.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i]
    const [x1, y1] = anchors[i + 1]
    if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
  }
  return last[1]
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const roundHalf = v => Math.round(v * 2) / 2
const fmt = n => n.toFixed(1).replace(/\.0$/, "")
const kmh = ms => Math.round(ms * MS_TO_KMH)

/**
 * rate(messwerte, prognose, profil)
 * messwerte: { water, air, windAvg, gustMax }  (°C, °C, m/s, m/s)
 * prognose:  { current: { cloud|null, isDay }, next: [{ hour, code, gusts }] }
 * profil:    { key, label, anchors, airMod }
 * Rückgabe:  { stars (0–5), veto, vetoKind, reason, usesForecast }
 */
export function rate(m, p, profil) {
  const w = fmt(m.water)

  if (m.gustMax >= T.gustVetoMs) {
    return { stars: 0, veto: true, vetoKind: "wind", usesForecast: false,
      reason: `Starkwind – nicht schwimmen (Böen ${kmh(m.gustMax)} km/h)` }
  }
  for (const h of p.next) {
    if (h.code >= 95 && h.code <= 99) return { stars: 0, veto: true, vetoKind: "gewitter", usesForecast: true,
      reason: `Gewitter möglich ab ${h.hour} Uhr (Prognose)` }
    if (h.gusts >= T.gustVetoKmh) return { stars: 0, veto: true, vetoKind: "wind", usesForecast: true,
      reason: `Sturmböen bis ${Math.round(h.gusts)} km/h ab ${h.hour} Uhr (Prognose)` }
  }

  const base = interpolate(profil.anchors, m.water)
  const air = profil.airMod(m.air)
  const sunny = air.delta <= 0 && p.current.isDay
    && p.current.cloud !== null && p.current.cloud < T.sunCloud
  const windy = m.windAvg >= T.windAvgMs

  let score = base + air.delta
  if (sunny) score += 0.5
  if (windy) score -= 1
  const stars = clamp(roundHalf(score), 1, 5)

  const isEis = profil.key === "isbaer"
  const a = fmt(m.air)
  let reason, usesForecast = false
  if (base <= 1.5) {
    reason = isEis ? `Wasser ${w}° – zu warm fürs Eisbaden` : `Wasser ${w}° – für dich zu kalt`
  } else if (windy) {
    reason = `Wasser ${w}°, aber Wind mit ${kmh(m.windAvg)} km/h`
  } else if (air.kind === "cold") {
    reason = sunny ? `Wasser ${w}°, Luft nur ${a}°, aber sonnig (Prognose)` : `Wasser ${w}°, aber Luft nur ${a}°`
    usesForecast = sunny
  } else if (air.kind === "warm") {
    reason = `Wasser ${w}° und warme Luft mit ${a}°`
  } else if (sunny) {
    reason = `Wasser ${w}° und sonnig (Prognose)`
    usesForecast = true
  } else if (stars >= 4) {
    reason = isEis ? `Wasser ${w}° – ideal zum Eisbaden` : `Wasser ${w}° – ideal für dich`
  } else {
    reason = isEis ? `Wasser ${w}° – eher mild fürs Eisbaden` : `Wasser ${w}° – machbar, aber frisch`
  }
  return { stars, veto: false, reason, usesForecast }
}

// ============================================================
// DATEN: Aufbereiten und Validieren
// ============================================================
class DataError extends Error {
  constructor(message, kind) { super(message); this.kind = kind } // "offline" | "ungueltig"
}

const pad = n => String(n).padStart(2, "0")
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const localHourKey = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`

const FIELDS = {
  water:   ["water_temperature", "Wassertemperatur"],
  air:     ["air_temperature", "Lufttemperatur"],
  windAvg: ["wind_speed_avg_10min", "Mittelwind"],
  gustMax: ["wind_gust_max_10min", "Böen"],
}

function prepareMessung(json) {
  const r = json && json.ok && Array.isArray(json.result) ? json.result[0] : null
  if (!r || !r.values) throw new DataError("Messstation: unerwartete Antwort", "ungueltig")
  const out = {}
  for (const [key, [field, label]] of Object.entries(FIELDS)) {
    const v = r.values[field]
    if (!v || v.value === null || typeof v.value !== "number" || v.status !== "ok") {
      throw new DataError(`Messwert ungültig: ${label}`, "ungueltig")
    }
    out[key] = v.value
  }
  const ts = new Date(r.timestamp)
  if (isNaN(ts.getTime())) throw new DataError("Messzeit ungültig", "ungueltig")
  out.time = ts
  return out
}

function preparePrognose(json, now) {
  const h = json && json.hourly
  if (!h || !Array.isArray(h.time)) throw new DataError("Prognose: unerwartete Antwort", "ungueltig")
  const idx = h.time.indexOf(localHourKey(now))
  if (idx < 0) throw new DataError("Prognose: aktuelle Stunde fehlt", "ungueltig")
  const at = (arr, i) => (Array.isArray(arr) && arr[i] !== undefined ? arr[i] : null)
  const next = []
  for (let i = idx; i <= idx + T.forecastHours; i++) {
    const code = at(h.weather_code, i), gusts = at(h.wind_gusts_10m, i), t = at(h.time, i)
    if (t === null || code === null || gusts === null) {
      throw new DataError("Prognose unvollständig – Gewitter/Sturm nicht prüfbar", "ungueltig")
    }
    next.push({ hour: Number(t.slice(11, 13)), code, gusts })
  }
  return { current: { cloud: at(h.cloud_cover, idx), isDay: at(h.is_day, idx) === 1 }, next }
}

async function fetchJSON(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), T.timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally { clearTimeout(timer) }
}

async function safeFetch(label, url) {
  try { return { ok: true, data: await fetchJSON(url) } }
  catch (e) { return { ok: false, error: `${label} nicht erreichbar` } }
}

// ============================================================
// SEEFARBE (aus dem Widget übernommen)
// ============================================================
const LAKE_STOPS = [
  [6,  "#D8E1EA", "#19222A"],
  [12, "#CBDDEB", "#162632"],
  [17, "#C3E0E8", "#132A32"],
  [21, "#BEE4E0", "#122E2D"],
  [24, "#BFE9D8", "#13302A"],
  [27, "#D0EDD3", "#1A3027"],
]
const GREY = { light: "#E3E6E8", dark: "#1C1F21" }
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const rgbToHex = c => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()
const mixHex = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)) }

function stopColor(temp, col) {
  if (temp <= LAKE_STOPS[0][0]) return LAKE_STOPS[0][col]
  for (let i = 0; i < LAKE_STOPS.length - 1; i++) {
    const t0 = LAKE_STOPS[i][0], t1 = LAKE_STOPS[i + 1][0]
    if (temp <= t1) return mixHex(LAKE_STOPS[i][col], LAKE_STOPS[i + 1][col], (temp - t0) / (t1 - t0))
  }
  return LAKE_STOPS[LAKE_STOPS.length - 1][col]
}
function lakeHex(water, cloud, stale) {
  let grey = cloud === null ? 0.15 : (cloud / 100) * 0.45
  if (stale) grey = Math.max(grey, 0.7)
  return { light: mixHex(stopColor(water, 1), GREY.light, grey), dark: mixHex(stopColor(water, 2), GREY.dark, grey) }
}

// ============================================================
// ICONS (eigene SVGs, immer zusammen mit Wert oder Text)
// ============================================================
const svg = (inner, extra = "") =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`
const ICON = {
  wasser: svg('<path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>'),
  luft: svg('<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v6"/>'),
  wind: svg('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>'),
  uhr: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  uhrWarn: svg('<circle cx="11" cy="12" r="8"/><path d="M11 8v4l2.5 1.5"/><path d="M21 4v5"/><path d="M21 12.5v.5"/>'),
  gewitter: svg('<path d="M7 16a5 5 0 1 1 1.6-9.7A6 6 0 0 1 20 9a4 4 0 0 1-2 7"/><path d="M13 12l-3 5h4l-3 5"/>'),
  sturm: svg('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>'),
  offline: svg('<path d="M2 8.8a15 15 0 0 1 4-2.4"/><path d="M10 5.2A15 15 0 0 1 22 8.8"/><path d="M5 12.5a10 10 0 0 1 3-1.8"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".6" fill="currentColor"/><path d="M3 3l18 18"/>'),
  achtung: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v4"/><circle cx="12" cy="17.5" r=".6" fill="currentColor"/>'),
}

// Stern: voll, halb oder leer (halber Stern über Verlauf)
let sternId = 0
function sternSVG(fuellung) {
  const id = `h${sternId++}`
  const pfad = "M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z"
  const fill = fuellung === 1 ? "var(--stern)" : fuellung === 0.5 ? `url(#${id})` : "var(--stern-leer)"
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="${id}"><stop offset="50%" stop-color="var(--stern)"/><stop offset="50%" stop-color="var(--stern-leer)"/></linearGradient></defs>
    <path d="${pfad}" fill="${fill}"/></svg>`
}
function sterneHTML(stars) {
  let html = ""
  for (let i = 1; i <= 5; i++) html += sternSVG(stars >= i ? 1 : stars >= i - 0.5 ? 0.5 : 0)
  const text = String(stars).replace(".", ",")
  return `<div class="sterne" role="img" aria-label="${text} von 5 Sternen">${html}</div>`
}

// ============================================================
// DARSTELLUNG
// ============================================================
const $ = id => document.getElementById(id)
const dunkel = window.matchMedia("(prefers-color-scheme: dark)")

const WMO = c =>
  c >= 95 ? "Gewitter" : c >= 80 ? "Schauer" : c >= 71 ? "Schnee" : c >= 51 ? "Regen"
  : c >= 45 ? "Nebel" : c === 3 ? "bedeckt" : c === 2 ? "teils bewölkt" : "klar"

function forecastSummary(p) {
  const worst = Math.max(...p.next.map(h => h.code))
  const maxG = Math.round(Math.max(...p.next.map(h => h.gusts)))
  return `${WMO(worst)}, Böen bis ${maxG} km/h`
}

let letzteSeefarbe = null
function setzeSeefarbe(farbe) {
  letzteSeefarbe = farbe
  const wert = farbe ? (dunkel.matches ? farbe.dark : farbe.light) : ""
  document.body.style.setProperty("--see", wert || null)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && wert) meta.content = wert
}
dunkel.addEventListener("change", () => setzeSeefarbe(letzteSeefarbe))

function zeigeBewertung(r, m, p, stale) {
  document.body.className = r.veto ? "veto" : ""
  setzeSeefarbe(r.veto ? null : lakeHex(m.water, p.current.cloud, stale))

  const kopf = r.veto
    ? `<div class="veto-symbol">${r.vetoKind === "gewitter" ? ICON.gewitter : ICON.achtung}</div>`
    : sterneHTML(r.stars)
  const klasse = r.usesForecast && !r.veto ? "begruendung prognose" : "begruendung"

  $("inhalt").innerHTML = `
    ${kopf}
    <p class="${klasse}">${r.reason}</p>
    <div class="karte">
      <h3>Gemessen · Tiefenbrunnen</h3>
      <div class="werte">
        <span class="wert">${ICON.wasser}<span class="wert-label">Wasser</span>${fmt(m.water)}°</span>
        <span class="wert">${ICON.luft}<span class="wert-label">Luft</span>${fmt(m.air)}°</span>
        <span class="wert">${ICON.wind}<span class="wert-label">Wind</span>${kmh(m.windAvg)} km/h</span>
      </div>
      <p class="prognose-zeile"><strong>Prognose bis ${pad(p.next[p.next.length - 1].hour)} Uhr</strong>${forecastSummary(p)}</p>
    </div>`

  $("stand").innerHTML = stale
    ? `${ICON.uhrWarn}<span>Messung ${hhmm(m.time)}</span> · <span class="veraltet">veraltet</span>`
    : `${ICON.uhr}<span>Messung ${hhmm(m.time)}</span>`
}

function zeigeFehler(err) {
  document.body.className = "fehler"
  setzeSeefarbe(null)
  $("inhalt").innerHTML = `
    <div class="veto-symbol" style="color:var(--muted)">${err.kind === "offline" ? ICON.offline : ICON.achtung}</div>
    <p class="fehler-titel">Keine Bewertung</p>
    <p class="fehler-text">${err.message}. Ohne verlässliche Daten gibt es bewusst keine Sterne.</p>
    <button class="knopf" id="nochmal" type="button">Nochmals versuchen</button>`
  $("stand").innerHTML = `${ICON.uhr}<span>Stand ${hhmm(new Date())}</span>`
  $("nochmal").addEventListener("click", laden)
}

// ============================================================
// PROFILWAHL
// ============================================================
function leseProfil() {
  try { const k = localStorage.getItem(SPEICHER_KEY); return PROFILE[k] ? k : null } catch { return null }
}
function speichereProfil(key) {
  try { localStorage.setItem(SPEICHER_KEY, key) } catch { /* privater Modus: nur für diese Sitzung */ }
  aktuellesProfil = key
}
function buildProfil(key) {
  const p = PROFILE[key]
  return { key, label: p.name, anchors: p.anchors, airMod: AIR_MODS[p.luft] }
}

let aktuellesProfil = leseProfil()

function oeffneAuswahl({ ersteWahl = false } = {}) {
  const dlg = $("auswahl")
  $("optionen").innerHTML = Object.entries(PROFILE).map(([key, p]) => `
    <button class="option" type="button" data-key="${key}" aria-pressed="${key === aktuellesProfil}">
      <span class="option-name">${p.name}</span>
      <span class="option-text">${p.text}</span>
      <span class="option-ideal">${p.ideal}</span>
    </button>`).join("")
  // Beim ersten Besuch muss gewählt werden: kein Abbrechen
  $("schliessen").hidden = ersteWahl
  dlg.oncancel = ersteWahl ? e => e.preventDefault() : null
  $("optionen").querySelectorAll(".option").forEach(btn =>
    btn.addEventListener("click", () => {
      speichereProfil(btn.dataset.key)
      dlg.close()
      aktualisiereProfilKnopf()
      laden()
    }))
  dlg.showModal()
}

function aktualisiereProfilKnopf() {
  $("profilName").textContent = aktuellesProfil ? PROFILE[aktuellesProfil].name : "Profil wählen"
}

// ============================================================
// TESTDATEN (?test=szenario)
// ============================================================
function fakeMessung(now, s) {
  const v = { water: 21.6, air: 20.4, wind: 0.2, gust: 0.9 }
  if (s === "wind") { v.water = 17.2; v.wind = 6.9; v.gust = 9.5 }
  if (s === "kalt") { v.water = 18.0; v.air = 9.5 }
  if (s === "hitze") { v.water = 22.4; v.air = 32.5 }
  if (s === "veto_boeen") { v.gust = 14.1; v.wind = 7.0 }
  const age = s === "veraltet" ? 4 * 3600e3 : 12 * 60e3
  const f = (value, status = "ok") => ({ value, unit: "", status })
  return { ok: true, result: [{ station: "tiefenbrunnen", timestamp: new Date(now.getTime() - age).toISOString(),
    values: { air_temperature: f(v.air), water_temperature: s === "ungueltig" ? f(null, "broken") : f(v.water),
      wind_gust_max_10min: f(v.gust), wind_speed_avg_10min: f(v.wind) } }] }
}
function fakePrognose(now, s) {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const h = { time: [], weather_code: [], precipitation_probability: [], cloud_cover: [], wind_gusts_10m: [], is_day: [] }
  for (let i = 0; i < 48; i++) {
    const t = new Date(start); t.setHours(i)
    h.time.push(localHourKey(t)); h.weather_code.push(1); h.precipitation_probability.push(10)
    h.cloud_cover.push(20); h.wind_gusts_10m.push(14); h.is_day.push(t.getHours() >= 7 && t.getHours() < 19 ? 1 : 0)
  }
  const cur = h.time.indexOf(localHourKey(now))
  if (s === "veto_gewitter") h.weather_code[cur + 1] = 95
  if (s === "prognose_fehlt") h.wind_gusts_10m[cur + 1] = null
  return { timezone: "Europe/Berlin", hourly: h }
}
function testResponses(s, now) {
  const mess = s === "offline" ? { ok: false, error: "Messstation nicht erreichbar" } : { ok: true, data: fakeMessung(now, s) }
  return [mess, { ok: true, data: fakePrognose(now, s) }]
}

// ============================================================
// ABLAUF
// ============================================================
const TEST = new URLSearchParams(location.search).get("test")

async function laden() {
  if (!aktuellesProfil) return
  const now = new Date()
  try {
    const [mRes, pRes] = TEST
      ? testResponses(TEST, now)
      : await Promise.all([safeFetch("Messstation", URL_MESS), safeFetch("Prognose", URL_PROG)])
    if (!mRes.ok || !pRes.ok) {
      throw new DataError([mRes, pRes].filter(x => !x.ok).map(x => x.error).join(", "), "offline")
    }
    const m = prepareMessung(mRes.data)
    const p = preparePrognose(pRes.data, now)
    const r = rate(m, p, buildProfil(aktuellesProfil))
    const stale = now.getTime() - m.time.getTime() > T.staleMs
    zeigeBewertung(r, m, p, stale)
  } catch (e) {
    zeigeFehler(e instanceof DataError ? e : new DataError("Unerwarteter Fehler", "ungueltig"))
  }
}

function start() {
  $("profilKnopf").addEventListener("click", () => oeffneAuswahl())
  aktualisiereProfilKnopf()
  if (aktuellesProfil) laden()
  else {
    $("inhalt").innerHTML = `<p class="laden">Wähle zuerst dein Profil.</p>`
    oeffneAuswahl({ ersteWahl: true })
  }
  // Aktualisieren, wenn die App wieder in den Vordergrund kommt, und alle 10 Minuten
  document.addEventListener("visibilitychange", () => { if (!document.hidden) laden() })
  setInterval(() => { if (!document.hidden) laden() }, T.refreshMs)

  if ("serviceWorker" in navigator && !TEST) {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* App funktioniert auch ohne */ })
  }
}

start()
