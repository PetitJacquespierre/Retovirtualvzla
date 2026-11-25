// Endpoint Serverless: Generador de Arte de Estudio IA — Reto Virtual VZLA 10K
// Conecta con los modelos nativos de generación de imágenes de Google Gemini

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb'
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

  const { estiloId, prompt, aspectRatio = "4:5", atleta = {}, fotoBase64 } = req.body || {};

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

  // Normalizar aspect ratio para Google Gemini Image
  let arImagen = "1:1";
  if (aspectRatio === "9:16") arImagen = "9:16";
  else if (aspectRatio === "3:4" || aspectRatio === "4:5") arImagen = "3:4";
  else if (aspectRatio === "16:9") arImagen = "16:9";

  // Lista de modelos nativos de imagen disponibles en la cuenta
  const modelosImagen = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-3.1-flash-lite-image'
  ];

  let primerError = null;

  for (const modelo of modelosImagen) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;

      const parts = [];

      // Si el atleta subió su foto base64, se la enviamos como referencia visual para conservar su identidad
      if (fotoBase64) {
        const cleanB64 = fotoBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanB64
          }
        });
      }

      parts.push({
        text: prompt
      });

      const payload = {
        contents: [
          {
            role: "user",
            parts: parts
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: arImagen
          }
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates.length > 0) {
        const candidateParts = data.candidates[0].content?.parts || [];
        const imagePart = candidateParts.find(p => p.inlineData && p.inlineData.data);

        if (imagePart) {
          return res.status(200).json({
            success: true,
            motor: `Google Gemini (${modelo})`,
            imagenBase64: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || "image/jpeg",
            estiloId,
            atleta
          });
        }
      }

      const errMsg = data.error?.message || `El modelo ${modelo} no devolvió imagen binaria.`;
      if (!primerError) primerError = errMsg;

    } catch (err) {
      if (!primerError) primerError = err.message;
    }
  }

  return res.status(502).json({
    success: false,
    error: `Error al generar con Gemini: ${primerError}`,
    promptFormateado: prompt,
    atleta
  });
}
