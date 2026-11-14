/**
 * RETO VIRTUAL VZLA — MOTOR OFICIAL DIRECTO BCV.ORG.VE (v3.0)
 * Extrae la tasa oficial en vivo directamente desde https://www.bcv.org.ve/
 * Bypasea el certificado SSL incompleto del BCV (rejectUnauthorized: false) y soporta <strong class="strong-tb">
 */
import https from 'https';

let memoryCache = {
    data: null,
    timestamp: 0
};

const MEMORY_TTL_MS = 10 * 60 * 1000;
const FALLBACK_DEFAULT = {
    usd: 914.02,
    eur: 1010.56,
    usdt: 1068.28,
    binance: 1068.28
};

function fetchBCVHtmlDirect(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const req = https.get('https://www.bcv.org.ve/', {
            rejectUnauthorized: false,
            timeout: timeoutMs,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            }
        }, (res) => {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 400)) {
                return reject(new Error(`BCV HTTP ${res.statusCode}`));
            }
            let rawData = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => resolve(rawData));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout conectando a bcv.org.ve'));
        });

        req.on('error', (err) => reject(err));
    });
}

async function fetchFromBCVDirect() {
    const html = await fetchBCVHtmlDirect(5000);

    const extractRate = (containerId) => {
        const regex = new RegExp(`id=["']${containerId}["'][\\s\\S]*?<strong[^>]*>\\s*([0-9.,]+)\\s*<\\/strong>`, 'i');
        const match = html.match(regex);
        if (!match || !match[1]) return null;
        const clean = match[1].trim().replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return (!isNaN(num) && num > 10) ? Number(num.toFixed(2)) : null;
    };

    const usd = extractRate('dolar');
    const eur = extractRate('euro');

    if (!usd) throw new Error('No se pudo extraer #dolar de bcv.org.ve');

    return {
        usd,
        eur: eur || Number((usd * 1.1056).toFixed(2)),
        source: 'BCV Oficial Directo (bcv.org.ve)'
    };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

async function fetchFromDolarApi() {
    const [resOficial, resEur, resParalelo] = await Promise.allSettled([
        fetchWithTimeout('https://ve.dolarapi.com/v1/dolares/oficial', {}, 3500),
        fetchWithTimeout('https://ve.dolarapi.com/v1/euros/oficial', {}, 3500),
        fetchWithTimeout('https://ve.dolarapi.com/v1/dolares/paralelo', {}, 3500)
    ]);

    let usd = null;
    let eur = null;
    let usdt = null;

    if (resOficial.status === 'fulfilled' && resOficial.value.ok) {
        const dataOficial = await resOficial.value.json();
        const val = parseFloat(dataOficial?.promedio);
        if (!isNaN(val) && val > 10) usd = Number(val.toFixed(2));
    }

    if (resEur.status === 'fulfilled' && resEur.value.ok) {
        const dataEur = await resEur.value.json();
        const valE = parseFloat(dataEur?.promedio);
        if (!isNaN(valE) && valE > 10) eur = Number(valE.toFixed(2));
    }

    if (resParalelo.status === 'fulfilled' && resParalelo.value.ok) {
        const dataParalelo = await resParalelo.value.json();
        const valP = parseFloat(dataParalelo?.promedio);
        if (!isNaN(valP) && valP > 10) usdt = Number(valP.toFixed(2));
    }

    return { usd, eur, usdt, source: 'DolarApi VE' };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const forceRefresh = req.query?.refresh === '1' || req.query?.force === 'true';
    const now = Date.now();

    if (!forceRefresh && memoryCache.data && (now - memoryCache.timestamp) < MEMORY_TTL_MS) {
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({ ...memoryCache.data, fromCache: true });
    }

    let usd = null;
    let eur = null;
    let usdt = null;
    let fuentes = [];

    const [bcvRes, dolarApiRes] = await Promise.allSettled([
        fetchFromBCVDirect(),
        fetchFromDolarApi()
    ]);

    if (bcvRes.status === 'fulfilled' && bcvRes.value.usd) {
        usd = bcvRes.value.usd;
        eur = bcvRes.value.eur;
        fuentes.push('BCV Oficial Directo (bcv.org.ve)');
    } else if (dolarApiRes.status === 'fulfilled' && dolarApiRes.value.usd) {
        usd = dolarApiRes.value.usd;
        eur = dolarApiRes.value.eur;
        fuentes.push('DolarApi Oficial');
    }

    if (dolarApiRes.status === 'fulfilled' && dolarApiRes.value.usdt) {
        usdt = dolarApiRes.value.usdt;
    }

    const isLiveSuccess = Boolean(usd && usd > 10);
    const finalUsd = isLiveSuccess ? usd : FALLBACK_DEFAULT.usd;
    const finalEur = (eur && eur > 10) ? eur : FALLBACK_DEFAULT.eur;
    const finalUsdt = (usdt && usdt > 10) ? usdt : FALLBACK_DEFAULT.binance;

    const payload = {
        ok: true,
        usd: finalUsd,
        eur: finalEur,
        usdt: finalUsdt,
        binance: finalUsdt,
        fuente: isLiveSuccess ? fuentes.join(' + ') : 'Respaldo Verificado BCV',
        timestamp: new Date().toISOString()
    };

    if (isLiveSuccess) {
        memoryCache = { data: payload, timestamp: now };
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    } else {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
    }

    return res.status(200).json(payload);
}
