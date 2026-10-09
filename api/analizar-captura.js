// =====================================================================
// API: Análisis de capturas de actividad (Strava, Garmin, Nike, etc.)
// ---------------------------------------------------------------------
// 1. Un modelo de visión (Gemini si hay GEMINI_API_KEY, si no Groq)
//    LEE la captura y devuelve los datos crudos en JSON.
// 2. El cálculo del tiempo oficial 5K se hace AQUÍ en código
//    (no se confía en la aritmética del modelo).
//    Prioridad: Mejor esfuerzo 5K > Suma de 5 parciales > Tiempo en
//    movimiento (si la distancia ≈ 5 km) > Estimado por ritmo promedio.
// =====================================================================

export const config = {
    api: { bodyParser: { sizeLimit: '4mb' } }
};

const PROMPT = `Eres un comisario deportivo experto en leer capturas de pantalla de apps de running y caminata (Strava, Garmin Connect, Nike Run Club, Adidas Running, Apple Fitness, Samsung Health, Coros, Polar, Huawei, relojes, etc.).

Extrae EXACTAMENTE los valores visibles en la imagen. NO inventes ni calcules nada. Si un dato no aparece, usa null.

Reglas importantes:
- "tiempo_movimiento": tiempo de actividad / tiempo en movimiento / "Tiempo" del resumen principal. En Strava el "Tiempo" grande del resumen es el tiempo en movimiento.
- "tiempo_transcurrido": solo si aparece etiquetado como tiempo transcurrido / elapsed / tiempo total.
- "ritmo_promedio": ritmo medio en min/km (ej "5:49"). NO lo confundas con un tiempo total.
- "distancia_km": distancia total de la actividad en km (usa punto decimal, ej 5.53). Si está en millas, conviértela a km.
- IGNORA: kilometraje de zapatillas (ej "Zapatillas ... (30,3 km)"), desnivel, calorías, frecuencia cardiaca, cadencia, hora del día, fecha, récords históricos de otras actividades.
- "mejor_5k": SOLO si la captura muestra una lista de "Mejores tiempos" / "Mejores esfuerzos" / "Best efforts" con una fila de 5 km o 5K (ej "5 km (28:20)"). Copia ese tiempo.
- "parciales": si hay una tabla de parciales / splits / vueltas por kilómetro, copia TODAS las filas en orden. "km" es el valor de la primera columna tal cual (1, 2, 3... o una fracción como 0.53 en la última fila). "ritmo" es el ritmo de esa fila (M:SS). "tiempo" solo si la tabla muestra el tiempo de la vuelta.
- Formato de tiempos: "H:MM:SS" o "MM:SS" tal como se ve.
- "es_captura_deportiva": false si la imagen no es una captura de una actividad física.

Responde ÚNICAMENTE con un objeto JSON con estas claves:
{"es_captura_deportiva": boolean, "app": string|null, "tipo_captura": "resumen"|"parciales"|"mejores_tiempos"|"reloj"|"otro", "distancia_km": number|null, "tiempo_movimiento": string|null, "tiempo_transcurrido": string|null, "ritmo_promedio": string|null, "mejor_5k": string|null, "parciales": [{"km": number, "ritmo": string|null, "tiempo": string|null}], "notas": string|null}`;

const SCHEMA = {
    type: 'object',
    properties: {
        es_captura_deportiva: { type: 'boolean' },
        app: { type: ['string', 'null'] },
        tipo_captura: { type: 'string', enum: ['resumen', 'parciales', 'mejores_tiempos', 'reloj', 'otro'] },
        distancia_km: { type: ['number', 'null'] },
        tiempo_movimiento: { type: ['string', 'null'] },
        tiempo_transcurrido: { type: ['string', 'null'] },
        ritmo_promedio: { type: ['string', 'null'] },
        mejor_5k: { type: ['string', 'null'] },
        parciales: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    km: { type: 'number' },
                    ritmo: { type: ['string', 'null'] },
                    tiempo: { type: ['string', 'null'] }
                },
                required: ['km']
            }
        },
        notas: { type: ['string', 'null'] }
    },
    required: ['es_captura_deportiva', 'tipo_captura', 'parciales']
};

// ---------- Utilidades de tiempo ----------
function aSegundos(valor) {
    if (valor === null || valor === undefined) return null;
    const limpio = String(valor).trim().replace(/[’'′]/g, ':').replace(/["″]/g, '').replace(/\s*(min\/km|\/km|min|km)\s*$/i, '');
    const partes = limpio.split(':').map(p => p.trim());
    if (partes.length < 2 || partes.length > 3 || partes.some(p => !/^\d{1,3}$/.test(p))) return null;
    const n = partes.map(Number);
    if (n.length === 2) return n[0] * 60 + n[1];
    return n[0] * 3600 + n[1] * 60 + n[2];
}

function formatoHMS(seg) {
    const s = Math.round(seg);
    return {
        hh: Math.floor(s / 3600),
        mm: Math.floor((s % 3600) / 60),
        ss: s % 60
    };
}

function formatoRitmo(segPorKm) {
    const s = Math.round(segPorKm);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function extraerJSON(texto) {
    if (!texto) return null;
    const sinFences = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
    try { return JSON.parse(sinFences); } catch (e) { /* continuar */ }
    const ini = sinFences.indexOf('{');
    const fin = sinFences.lastIndexOf('}');
    if (ini >= 0 && fin > ini) {
        try { return JSON.parse(sinFences.slice(ini, fin + 1)); } catch (e) { return null; }
    }
    return null;
}

// ---------- Cálculo determinista del tiempo oficial 5K ----------
function calcularTiempo5K(d) {
    const advertencias = [];
    const distancia = typeof d.distancia_km === 'number' && d.distancia_km > 0 ? d.distancia_km : null;
    const movimiento = aSegundos(d.tiempo_movimiento);
    const transcurrido = aSegundos(d.tiempo_transcurrido);
    const ritmo = aSegundos(d.ritmo_promedio);
    const mejor5k = aSegundos(d.mejor_5k);
    const rangoValido = s => s !== null && s >= 780 && s <= 8100; // 13 min a 2h15

    // 1) Mejor esfuerzo 5K (Strava "Mejores tiempos") -> exacto
    if (rangoValido(mejor5k)) {
        return { segundos: mejor5k, fuente: 'mejor_5k', exacto: true, distancia_km: 5, advertencias };
    }

    // 2) Suma de los primeros 5 parciales de 1 km -> exacto
    const parciales = Array.isArray(d.parciales) ? d.parciales : [];
    const completos = parciales.filter(p => {
        const km = Number(p.km);
        return Number.isFinite(km) && Number.isInteger(km) && km >= 1;
    });
    if (completos.length >= 5) {
        let suma = 0;
        let ok = true;
        for (const p of completos.slice(0, 5)) {
            const seg = aSegundos(p.tiempo) ?? aSegundos(p.ritmo);
            if (seg === null || seg < 120 || seg > 1200) { ok = false; break; }
            suma += seg;
        }
        if (ok && rangoValido(suma)) {
            return { segundos: suma, fuente: 'parciales', exacto: true, distancia_km: 5, advertencias };
        }
    } else if (parciales.length > 0) {
        advertencias.push(`Solo se ven ${completos.length} parciales completos de 1 km; se necesitan 5 para calcular el 5K exacto.`);
    }

    // 3) Tiempo del resumen
    const tiempoBase = movimiento ?? transcurrido;
    const etiquetaBase = movimiento !== null ? 'movimiento' : 'transcurrido';
    if (tiempoBase !== null && distancia !== null) {
        if (distancia >= 4.95 && distancia <= 5.05) {
            if (rangoValido(tiempoBase)) {
                return { segundos: tiempoBase, fuente: 'resumen', exacto: true, distancia_km: distancia, tiempo_total: tiempoBase, etiqueta_tiempo: etiquetaBase, advertencias };
            }
        } else if (distancia > 5.05) {
            // Estimado de los primeros 5 km a ritmo promedio
            const ritmoUsado = ritmo ?? (tiempoBase / distancia);
            const estimado = ritmoUsado * 5;
            if (rangoValido(estimado)) {
                return { segundos: estimado, fuente: 'estimado', exacto: false, distancia_km: distancia, tiempo_total: tiempoBase, etiqueta_tiempo: etiquetaBase, advertencias };
            }
        } else {
            advertencias.push(`La actividad marca ${distancia.toFixed(2)} km, menos de los 5 km requeridos.`);
            if (rangoValido(tiempoBase)) {
                return { segundos: tiempoBase, fuente: 'distancia_insuficiente', exacto: false, distancia_km: distancia, tiempo_total: tiempoBase, etiqueta_tiempo: etiquetaBase, advertencias };
            }
        }
    }

    // 4) Solo tiempo sin distancia
    if (rangoValido(tiempoBase)) {
        advertencias.push('No se pudo leer la distancia; verifica que sea de al menos 5 km.');
        return { segundos: tiempoBase, fuente: 'resumen_sin_distancia', exacto: false, distancia_km: null, tiempo_total: tiempoBase, etiqueta_tiempo: etiquetaBase, advertencias };
    }

    // 5) Solo ritmo
    if (ritmo !== null && rangoValido(ritmo * 5)) {
        return { segundos: ritmo * 5, fuente: 'estimado', exacto: false, distancia_km: distancia, advertencias };
    }

    return null;
}

// ---------- Proveedores de visión ----------
async function analizarConGemini(apiKey, base64, mime) {
    // Modelos estables con soporte de visión
    const modelos = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let ultimoError = null;

    for (const modelo of modelos) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
        for (const conEsquema of [true, false]) {
            try {
                const generationConfig = { temperature: 0.1 };
                if (conEsquema) {
                    generationConfig.responseMimeType = 'application/json';
                }

                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { inline_data: { mime_type: mime, data: base64 } },
                                { text: PROMPT }
                            ]
                        }],
                        generationConfig
                    })
                });

                const data = await resp.json();
                if (!resp.ok) {
                    ultimoError = `${modelo}: ${data.error?.message || resp.status}`;
                    if (resp.status === 400 && conEsquema) continue; // reintentar sin schema
                    break; // pasar al siguiente modelo si es 404 u otro error
                }

                const texto = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
                const json = extraerJSON(texto);
                if (json) return { datos: json, proveedor: 'gemini', modelo };
                ultimoError = `${modelo}: respuesta sin JSON válido`;
            } catch (err) {
                ultimoError = `${modelo}: ${err.message}`;
            }
        }
    }
    throw new Error(ultimoError || 'No se pudo obtener respuesta de Gemini');
}

async function analizarConGroq(apiKey, base64, mime) {
    let candidatos = [];
    try {
        const lista = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (lista.ok) {
            const ld = await lista.json();
            candidatos = (ld.data || [])
                .map(m => m.id)
                .filter(id => /vision|scout|maverick|-vl|qwen.*vl|gemma-3|llama-3\.2/i.test(id));
        }
    } catch (e) { /* usar valores por defecto */ }

    const preferidos = [
        'llama-3.2-11b-vision-preview',
        'llama-3.2-90b-vision-preview',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'meta-llama/llama-4-scout-17b-16e-instruct'
    ];
    const orden = [
        ...candidatos,
        ...preferidos
    ].filter((id, i, arr) => arr.indexOf(id) === i);

    let ultimoError = null;
    for (const modelo of orden) {
        for (const usarJsonMode of [true, false]) {
            try {
                const body = {
                    model: modelo,
                    temperature: 0.1,
                    max_tokens: 1500,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: PROMPT },
                            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
                        ]
                    }]
                };
                if (usarJsonMode) body.response_format = { type: 'json_object' };

                const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await resp.json();
                if (!resp.ok) {
                    ultimoError = `${modelo}: ${data.error?.message || resp.status}`;
                    if (resp.status === 401 || resp.status === 403) throw new Error(ultimoError);
                    continue;
                }
                const json = extraerJSON(data.choices?.[0]?.message?.content);
                if (json) return { datos: json, proveedor: 'groq', modelo };
                ultimoError = `${modelo}: respuesta sin JSON válido`;
            } catch (e) {
                ultimoError = e.message;
                if (/401|403/.test(e.message)) throw e;
            }
        }
    }
    throw new Error(ultimoError || 'Ningún modelo de visión de Groq disponible');
}

// ---------- Handler ----------
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });

    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ ok: false, error: 'Falta la imagen (imageBase64).' });
    }
    const base64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const mime = /^image\/(png|jpe?g|webp|heic|heif)$/i.test(mimeType || '') ? mimeType : 'image/jpeg';

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    const errores = [];
    let analisis = null;

    if (GEMINI_API_KEY) {
        try { analisis = await analizarConGemini(GEMINI_API_KEY.trim(), base64, mime); }
        catch (e) { errores.push(`Gemini: ${e.message}`); }
    }
    if (!analisis && GROQ_API_KEY) {
        try { analisis = await analizarConGroq(GROQ_API_KEY.trim(), base64, mime); }
        catch (e) { errores.push(`Groq: ${e.message}`); }
    }
    if (!analisis) {
        return res.status(502).json({
            ok: false,
            error: errores.length ? errores.join(' | ') : 'No hay GEMINI_API_KEY ni GROQ_API_KEY configuradas en Vercel.'
        });
    }

    const resultado = analisis.datos.es_captura_deportiva === false ? null : calcularTiempo5K(analisis.datos);
    let salida = null;
    if (resultado) {
        const t = formatoHMS(resultado.segundos);
        salida = {
            ...resultado,
            segundos: Math.round(resultado.segundos),
            hh: t.hh, mm: t.mm, ss: t.ss,
            ritmo_5k: formatoRitmo(resultado.segundos / 5),
            tiempo_total_hms: resultado.tiempo_total ? formatoHMS(resultado.tiempo_total) : null
        };
    }

    return res.status(200).json({
        ok: true,
        proveedor: analisis.proveedor,
        modelo: analisis.modelo,
        datos: analisis.datos,
        resultado: salida
    });
}
