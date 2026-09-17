export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 🔥 CACHÉ DE LARGA DURACIÓN EN EL SERVIDOR DE VERCEL (12 a 24 Horas)
    // Como el BCV fija la tasa una sola vez al día (a las 6:00 PM),
    // Vercel guarda la tasa en la memoria del servidor durante 12 horas.
    // Todas las solicitudes se responden en < 5ms sin tocar Google Apps Script.
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GOOGLE_SCRIPT_BCV = "https://script.google.com/macros/s/AKfycbyazhyYfK-vURGv34XF-oTW1_34rTVRs2WM7-aNlswf-mIGhIwgaLgwfGx1xZxfm50/exec";
    const FALLBACK_TASA = 848.55;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(GOOGLE_SCRIPT_BCV, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Vercel-Serverless-BCV-Fetcher' }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && data.usd && parseFloat(data.usd) > 10) {
                return res.status(200).json({
                    usd: parseFloat(data.usd),
                    fuente: "Google Apps Script BCV (Cached in Vercel 12h)",
                    timestamp: new Date().toISOString()
                });
            }
        }
    } catch (error) {}

    return res.status(200).json({
        usd: FALLBACK_TASA,
        fuente: "Fallback Seguro",
        timestamp: new Date().toISOString()
    });
}
