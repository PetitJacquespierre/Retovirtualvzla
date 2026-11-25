// Endpoint Serverless: Generador de Arte de Estudio IA Multi-Imagen — Reto Virtual VZLA 10K
// Motor Oficial: Cloudflare Workers AI — FLUX.2 [klein] 9B (Visión Multi-Referencia Real)
// Fusiona la foto REAL del corredor (input_image_0) + Medalla REAL 10K (input_image_1) + Strava/Zapatos

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};

function dataUrlToBlob(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  const mimeType = matches[1] || 'image/jpeg';
  const buffer = Buffer.from(matches[2], 'base64');
  return new Blob([buffer], { type: mimeType });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  const {
    estiloId = "01",
    prompt,
    aspectRatio = "1:1",
    atleta = {},
    fotoBase64,
    foto2Base64,
    foto3Base64
  } = req.body || {};

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

  // Dimensiones óptimas múltiplos de 16 para FLUX.2 Klein 9B
  let width = 1024;
  let height = 1024;
  if (aspectRatio === "4:5") {
    width = 896;
    height = 1120;
  } else if (aspectRatio === "3:4") {
    width = 768;
    height = 1024;
  } else if (aspectRatio === "9:16") {
    width = 576;
    height = 1024;
  }

  try {
    const form = new FormData();
    let imgIndex = 0;

    // Imagen 0: Foto real del atleta subida desde la Casilla 1
    let tieneAtleta = false;
    if (fotoBase64 && typeof fotoBase64 === 'string' && fotoBase64.startsWith('data:image')) {
      const atletaBlob = dataUrlToBlob(fotoBase64);
      if (atletaBlob) {
        form.append(`input_image_${imgIndex}`, atletaBlob, 'atleta.jpg');
        tieneAtleta = true;
        imgIndex++;
      }
    }

    // Imagen 1 (automática para estilos con Medalla 10K: #01, #05, #17): Medalla física real
    const estilosConMedalla = ["01", "05", "17"];
    let idxMedalla = -1;
    if (estilosConMedalla.includes(String(estiloId).padStart(2, '0')) && imgIndex < 4) {
      try {
        const medallaResp = await fetch('https://www.retovirtualvzla.com/img/medalla_real_10k.jpg');
        if (medallaResp.ok) {
          const medallaBuf = Buffer.from(await medallaResp.arrayBuffer());
          const medallaBlob = new Blob([medallaBuf], { type: 'image/jpeg' });
          form.append(`input_image_${imgIndex}`, medallaBlob, 'medalla_real_10k.jpg');
          idxMedalla = imgIndex;
          imgIndex++;
        }
      } catch (e) {
        console.warn('No se pudo adjuntar medalla_real_10k.jpg:', e.message);
      }
    }

    // Imagen opcional 2: Captura Strava / Métricas (Casilla 2)
    let idxStrava = -1;
    if (foto2Base64 && typeof foto2Base64 === 'string' && foto2Base64.startsWith('data:image') && imgIndex < 4) {
      const blob2 = dataUrlToBlob(foto2Base64);
      if (blob2) {
        form.append(`input_image_${imgIndex}`, blob2, 'strava.jpg');
        idxStrava = imgIndex;
        imgIndex++;
      }
    }

    // Imagen opcional 3: Zapatos / Extra (Casilla 3)
    let idxExtra = -1;
    if (foto3Base64 && typeof foto3Base64 === 'string' && foto3Base64.startsWith('data:image') && imgIndex < 4) {
      const blob3 = dataUrlToBlob(foto3Base64);
      if (blob3) {
        form.append(`input_image_${imgIndex}`, blob3, 'extra.jpg');
        idxExtra = imgIndex;
        imgIndex++;
      }
    }

    // Limpiar sintaxis de Midjourney (--sref y URLs) para que FLUX.2 reciba instrucciones limpias referenciando image 0, image 1, etc.
    let promptLimpio = prompt
      .replace(/--sref\s+\S+/gi, '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    let prefijoMultiImagen = "";
    if (tieneAtleta) {
      prefijoMultiImagen += "CRITICAL: Use the exact person from image 0 as the runner in the scene, preserving 100% of their exact face, hair, skin tone, body build, and athletic clothing naturally integrated into the 3D lighting and shadows of the scene (NEVER paste a flat rectangle photo). ";
    }
    if (idxMedalla >= 0) {
      prefijoMultiImagen += `CRITICAL: Replicate 100% identically the exact physical marathon medal from image ${idxMedalla} as a monumental 3D sculpture (preserving its exact rectangular gold notched shield frame, royal blue top ribbon, VEN EZU ELA banner, vertical 3D black 10K, Maracaibo bridge, golden sand dunes, orange sun, Angel Falls waterfall, and blue breaking wave with 2026). `;
    }
    if (idxStrava >= 0) {
      prefijoMultiImagen += `Use the running route/stats from image ${idxStrava} as visual HUD overlay elements. `;
    }
    if (idxExtra >= 0) {
      prefijoMultiImagen += `Use the running shoes/object from image ${idxExtra} accurately in the scene. `;
    }

    const promptFinal = (prefijoMultiImagen + promptLimpio).trim();

    form.append('prompt', promptFinal);
    form.append('width', String(width));
    form.append('height', String(height));

    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-2-klein-9b`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`
        // NO definir Content-Type manualmente: fetch añade multipart/form-data con su boundary automáticamente
      },
      body: form
    });

    const data = await response.json();

    if (response.ok && data.success && data.result && data.result.image) {
      return res.status(200).json({
        success: true,
        motor: "Cloudflare Workers AI — FLUX.2 Klein 9B (Multi-Imagen Real)",
        imagenBase64: data.result.image,
        mimeType: "image/jpeg",
        estiloId,
        atleta
      });
    }

    const errCF = data.errors?.[0]?.message || 'Cloudflare FLUX.2 no devolvió la imagen generada.';
    return res.status(502).json({
      success: false,
      error: `Error de Cloudflare FLUX.2: ${errCF}`,
      promptFormateado: promptFinal,
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
