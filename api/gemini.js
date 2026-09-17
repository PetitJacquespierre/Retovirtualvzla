export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt requerido' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    // OPCION 1: GOOGLE GEMINI (Recomendado, gratis, sin bloqueos de país)
    if (GEMINI_API_KEY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const data = await response.json();
            if (!response.ok) {
                return res.status(response.status).json({ 
                    error: data.error?.message || 'Error en Gemini API' 
                });
            }

            return res.status(200).json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // GROQ ENGINE (Con Auto-Detección y Fallback Dinámico)
    if (GROQ_API_KEY) {
        const apiKey = GROQ_API_KEY.trim();

        // 1. Intentar descubrir los modelos activos disponibles en la cuenta del usuario
        let modelosDisponibles = [];
        try {
            const listRes = await fetch('https://api.groq.com/openai/v1/models', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (listRes.status === 401 || listRes.status === 403) {
                return res.status(401).json({
                    error: 'La clave GROQ_API_KEY en Vercel es inválida o expiró (Error 401). Por favor genera una nueva API Key en console.groq.com y configúrala en Vercel.'
                });
            }
            if (listRes.ok) {
                const listData = await listRes.json();
                if (listData.data && Array.isArray(listData.data)) {
                    // Filtrar modelos tipo texto/chat (excluir whisper de audio)
                    modelosDisponibles = listData.data
                        .map(m => m.id)
                        .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('vision') && !id.includes('tool'));
                }
            }
        } catch (e) {
            console.error('Error al listar modelos de Groq:', e.message);
        }

        // Si no se pudieron listar, usamos una lista prioritaria por defecto
        const defaultPrioridades = [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'gemma2-9b-it',
            'deepseek-r1-distill-llama-70b',
            'qwen-2.5-32b',
            'llama3-70b-8192',
            'llama3-8b-8192'
        ];

        // Construir la lista final de prueba (priorizando los descubiertos y los conocidos)
        const modelosAProbar = [];
        for (const p of defaultPrioridades) {
            if (modelosDisponibles.includes(p) && !modelosAProbar.includes(p)) {
                modelosAProbar.push(p);
            }
        }
        for (const d of modelosDisponibles) {
            if (!modelosAProbar.includes(d)) {
                modelosAProbar.push(d);
            }
        }
        if (modelosAProbar.length === 0) {
            modelosAProbar.push(...defaultPrioridades);
        }

        let primerError = null;

        for (const modelo of modelosAProbar) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelo,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        temperature: 0.7,
                        max_tokens: 2500
                    })
                });

                const data = await response.json();

                if (response.status === 401 || response.status === 403) {
                    return res.status(response.status).json({
                        error: data.error?.message || 'Clave de API de Groq inválida o no autorizada. Actualiza GROQ_API_KEY en Vercel.'
                    });
                }

                if (response.ok && data.choices && data.choices[0] && data.choices[0].message) {
                    const texto = data.choices[0].message.content;
                    return res.status(200).json({
                        candidates: [{
                            content: {
                                parts: [{ text: texto }]
                            }
                        }]
                    });
                } else {
                    const msg = data.error?.message || `Error con ${modelo} (Status ${response.status})`;
                    if (!primerError) primerError = msg;
                }
            } catch (err) {
                if (!primerError) primerError = err.message;
            }
        }

        const infoModelos = modelosDisponibles.length > 0 
            ? ` Modelos disponibles en tu cuenta: ${modelosDisponibles.slice(0, 5).join(', ')}` 
            : '';

        return res.status(500).json({ 
            error: (primerError || 'No se pudo generar respuesta con Groq.') + infoModelos
        });
    }

    return res.status(500).json({ 
        error: 'No se encontró GEMINI_API_KEY ni GROQ_API_KEY en las variables de entorno de Vercel.' 
    });
}