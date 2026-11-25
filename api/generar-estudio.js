// Endpoint Serverless: Generador de Arte de Estudio IA — Reto Virtual VZLA 10K
// Conecta con Google Imagen 3 / Gemini API para sintetizar los pósters oficiales de Finisher

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  const { estiloId, prompt, aspectRatio = "4:5", atleta = {} } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: 'El prompt descriptivo del estilo es requerido.' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY no está configurada en las variables de entorno de Vercel.',
      promptFormateado: prompt
    });
  }

  // Normalizar aspect ratio para Google Imagen 3 (1:1, 3:4, 4:3, 9:16, 16:9)
  let arImagen = "4:3";
  if (aspectRatio === "1:1") arImagen = "1:1";
  else if (aspectRatio === "9:16") arImagen = "9:16";
  else if (aspectRatio === "3:4" || aspectRatio === "4:5") arImagen = "3:4";

  try {
    // 1. INTENTO 1: Google Imagen 3 (imagen-3.0-generate-002) en Google AI Studio
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
    
    const imagenResponse = await fetch(imagenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [
          { prompt: prompt }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: arImagen,
          personGeneration: "ALLOW_ADULT",
          safetySetting: "BLOCK_MEDIUM_AND_ABOVE"
        }
      })
    });

    const imagenData = await imagenResponse.json();

    if (imagenResponse.ok && imagenData.predictions && imagenData.predictions.length > 0) {
      const pred = imagenData.predictions[0];
      return res.status(200).json({
        success: true,
        motor: "Google Imagen 3 (imagen-3.0-generate-002)",
        imagenBase64: pred.bytesBase64Encoded,
        mimeType: pred.mimeType || "image/jpeg",
        estiloId,
        atleta
      });
    }

    // Si Imagen 3 da error de permisos/cuota, informar claramente con detalle técnico
    const errGoogle = imagenData.error?.message || (imagenData.predictions ? 'Sin predicciones devueltas' : 'Error en Imagen 3 API');
    
    return res.status(502).json({
      success: false,
      error: `Error de Google Imagen 3: ${errGoogle}`,
      promptFormateado: prompt,
      atleta
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Falla en el servidor de generación: ${err.message}`,
      promptFormateado: prompt
    });
  }
}
