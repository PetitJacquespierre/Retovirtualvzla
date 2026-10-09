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
    api: { bodyParser: { sizeLimit: '10mb' } }
};

const PROMPT = `Eres un comisario deportivo experto en leer capturas de pantalla de apps de running y caminata (Strava, Garmin Connect, Nike Run Club, Adidas Running, Apple Fitness, Samsung Health, Coros, Polar, Huawei, relojes, etc.).

Se te pueden enviar una o varias imágenes de la misma actividad (por ejemplo: la captura 1 con el resumen general de distancia/tiempo y la captura 2 con la tabla de parciales/splits o mejores esfuerzos). Combina la información de todas las imágenes.

Extrae EXACTAMENTE los valores visibles. NO inventes ni calcules nada. Si un dato no aparece, usa null.

Reglas importantes:
- "tiempo_movimiento": tiempo de actividad / tiempo en movimiento / "Tiempo" del resumen principal. En Strava el "Tiempo" grande del resumen es el tiempo en movimiento.
- "tiempo_transcurrido": solo si aparece etiquetado como tiempo transcurrido / elapsed / tiempo total.
- "ritmo_promedio": ritmo medio en min/km (ej "5:49" o "7:36 /km"). NO lo confundas con un tiempo total.
- "distancia_km": distancia total de la actividad en km (usa punto decimal, ej 5.53 o 10.02). Si está en millas, conviértela a km.
- IGNORA: kilometraje de zapatillas (ej "Zapatillas ... (30,3 km)"), desnivel, calorías, frecuencia cardiaca, cadencia, hora del día, fecha, récords históricos de otras actividades.
- "mejor_5k": SOLO si la captura muestra una lista de "Mejores tiempos" / "Mejores esfuerzos" / "Best efforts" con una fila de 5 km o 5K (ej "5 km (28:20)"). Copia ese tiempo.
- "parciales": si hay una tabla de parciales / splits / vueltas por kilómetro en cualquiera de las imágenes, copia TODAS las filas en orden. "km" es el valor de la primera columna tal cual (1, 2, 3... o una fracción como 0.53 en la última fila). "ritmo" es el ritmo de esa fila (M:SS). "tiempo" solo si la tabla muestra el tiempo de la vuelta.
- Formato de tiempos: "H:MM:SS" o "MM:SS" o "Xmin Ys" tal como se ve.
- "es_captura_deportiva": false si ninguna de las imágenes es una captura de actividad deportiva.

Responde ÚNICAMENTE con un objeto JSON con estas claves:
{"es_captura_deportiva": boolean, "app": string|null, "tipo_captura": "resumen"|"parciales"|"mejores_tiempos"|"reloj"|"combinado"|"otro", "distancia_km": number|null, "tiempo_movimiento": string|null, "tiempo_transcurrido": string|null, "ritmo_promedio": string|null, "mejor_5k": string|null, "parciales": [{"km": number, "ritmo": string|null, "tiempo": string|null}], "notas": string|null}`;

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
    let limpio = String(valor).trim().toLowerCase();
    
    // Soporte para formato textual como "38min 3s", "38m 03s", "1h 20min 15s", "38 min 3 seg"
    const matchTexto = limpio.match(/(?:(\d{1,2})\s*h(?:oras?)?)?\s*(?:(\d{1,2})\s*(?:min|m)(?:utos?)?)?\s*(?:(\d{1,2})\s*s(?:eg(?:undos?)?)?)?/i);
    if (matchTexto && (matchTexto[1] !== undefined || matchTexto[2] !== undefined || matchTexto[3] !== undefined)) {
        if (limpio.includes('m') || limpio.includes('h') || limpio.includes('s')) {
            const h = matchTexto[1] ? parseInt(matchTexto[1], 10) : 0;
            const m = matchTexto[2] ? parseInt(matchTexto[2], 10) : 0;
            const s = matchTexto[3] ? parseInt(matchTexto[3], 10) : 0;
            if (h > 0 || m > 0 || s > 0) {
                return (h * 3600) + (m * 60) + s;
            }
        }
    }

    limpio = limpio.replace(/[’'′]/g, ':').replace(/["″]/g, '').replace(/\s*(min\/km|\/km|min|km)\s*$/i, '');
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
async function analizarConGemini(apiKey, imagenes) {
    // Modelos estables con soporte de visión
    const modelos = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'];
    let ultimoError = null;

    const imageParts = imagenes.map(img => ({
        inline_data: { mime_type: img.mime, data: img.base64 }
    }));

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
                                ...imageParts,
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

async function analizarConGroq(apiKey, imagenes) {
    let candidatos = [];
    try {
        const lista = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (lista.ok) {
            const ld = await lista.json();
            // Solo modelos activos y compatibles con visión, excluyendo modelos descontinuados
            candidatos = (ld.data || [])
                .map(m => m.id)
                .filter(id => /vision|-vl\b|qwen.*vl/i.test(id) && !/whisper|guard|90b-vision|11b-vision|scout|maverick/i.test(id) && m.active !== false);
        }
    } catch (e) { /* usar valores por defecto */ }

    const orden = candidatos;

    if (orden.length === 0) {
        throw new Error('Groq: Actualmente no hay modelos de visión disponibles en Groq para procesar imágenes.');
    }

    const contentItems = [{ type: 'text', text: PROMPT }];
    imagenes.forEach(img => {
        contentItems.push({
            type: 'image_url',
            image_url: { url: `data:${img.mime};base64,${img.base64}` }
        });
    });

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
                        content: contentItems
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
                    break; // pasar al siguiente modelo
                }
                const json = extraerJSON(data.choices?.[0]?.message?.content);
                if (json) return { datos: json, proveedor: 'groq', modelo };
                ultimoError = `${modelo}: respuesta sin JSON válido`;
            } catch (e) {
                ultimoError = e.message;
                if (/401|403/.test(e.message)) throw e;
                break; // pasar al siguiente modelo
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

    const { imageBase64, mimeType, imagenes: imagenesRaw } = req.body || {};
    
    // Normalizar lista de imágenes (soporta una sola imagen o un array de hasta 3 capturas)
    let imagenes = [];
    if (Array.isArray(imagenesRaw) && imagenesRaw.length > 0) {
        imagenes = imagenesRaw.map(item => {
            const rawB64 = typeof item === 'string' ? item : (item.base64 || item.imageBase64 || '');
            const b64 = rawB64.includes(',') ? rawB64.split(',')[1] : rawB64;
            const mime = item.mime || item.mimeType || 'image/jpeg';
            return { base64: b64, mime: /^image\/(png|jpe?g|webp|heic|heif)$/i.test(mime) ? mime : 'image/jpeg' };
        }).filter(item => Boolean(item.base64));
    } else if (imageBase64 && typeof imageBase64 === 'string') {
        const b64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const mime = /^image\/(png|jpe?g|webp|heic|heif)$/i.test(mimeType || '') ? mimeType : 'image/jpeg';
        imagenes.push({ base64: b64, mime });
    }

    if (imagenes.length === 0) {
        return res.status(400).json({ ok: false, error: 'Falta la imagen o lista de imágenes.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    const errores = [];
    let analisis = null;

    if (GEMINI_API_KEY) {
        try { analisis = await analizarConGemini(GEMINI_API_KEY.trim(), imagenes); }
        catch (e) { errores.push(`Gemini: ${e.message}`); }
    } else {
        errores.push('Gemini: Sin GEMINI_API_KEY');
    }

    if (!analisis && GROQ_API_KEY) {
        try { analisis = await analizarConGroq(GROQ_API_KEY.trim(), imagenes); }
        catch (e) { errores.push(`Groq: ${e.message}`); }
    } else if (!analisis && !GROQ_API_KEY) {
        errores.push('Groq: Sin GROQ_API_KEY');
    }

    if (!analisis) {
        return res.status(502).json({
            ok: false,
            error: errores.join(' | ')
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
