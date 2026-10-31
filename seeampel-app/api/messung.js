// Vercel Serverless Function: GET /api/messung
// Holt die neueste Messung der Station Tiefenbrunnen und gibt sie unverändert weiter.
// Zwei Gründe für diesen Umweg:
//  1. CORS: Der Browser darf die Tecdottir-API evtl. nicht direkt abfragen.
//  2. Caching: Vercel speichert die Antwort 5 Minuten. So fragt nicht jeder Besuch die Station ab.

const QUELLE =
  "https://tecdottir.metaodi.ch/measurements/tiefenbrunnen?sort=timestamp_cet%20desc&limit=1&offset=0"

export default async function handler(req, res) {
  try {
    const antwort = await fetch(QUELLE, { headers: { Accept: "application/json" } })
    if (!antwort.ok) {
      res.status(502).json({ ok: false, error: `Messstation antwortet mit ${antwort.status}` })
      return
    }
    const daten = await antwort.json()
    // s-maxage: Vercel-Cache 5 Min. stale-while-revalidate: danach alte Antwort liefern,
    // während im Hintergrund neu geladen wird (schnell für die Nutzerin).
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600")
    res.status(200).json(daten)
  } catch (e) {
    res.status(502).json({ ok: false, error: "Messstation nicht erreichbar" })
  }
}
