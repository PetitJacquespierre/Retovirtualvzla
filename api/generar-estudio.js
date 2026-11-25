// Endpoint Serverless: Generador de Arte de Estudio IA — Reto Virtual VZLA 10K
// Motor Oficial: Cloudflare Workers AI (FLUX.1 Schnell)
// 100% Gratuito · 10,000 Neuronas diarias (~50 imágenes/día) · Generación en 3-4 segundos

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

  // Credenciales Oficiales de Cloudflare Workers AI (100% Protegidas en Vercel)
  const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return res.status(500).json({
      success: false,
      error: 'Las variables CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN deben configurarse en el panel de Vercel.'
    });
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

    const payload = {
      prompt: prompt,
      steps: 4
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.success && data.result && data.result.image) {
      return res.status(200).json({
        success: true,
        motor: "Cloudflare Workers AI (FLUX.1 Schnell 8K)",
        imagenBase64: data.result.image,
        mimeType: "image/jpeg",
        estiloId,
        atleta
      });
    }

    const errCF = data.errors?.[0]?.message || 'Cloudflare no devolvió la imagen generada.';
    return res.status(502).json({
      success: false,
      error: `Error de Cloudflare Workers AI: ${errCF}`,
      promptFormateado: prompt,
      atleta
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Falla en el servidor de generación: ${err.message}`,
      promptFormateado: prompt,
      atleta
    });
  }
}
