// Endpoint Serverless: Generador de Arte de Estudio IA Multi-Imagen — Reto Virtual VZLA 10K
// Motor Oficial: Cloudflare Workers AI — FLUX.2 [klein] 9B (Visión Multi-Referencia Real)
// Formato Oficial: 9:16 Vertical (720x1280) para Instagram Stories, Reels, TikTok y WhatsApp
// Incluye: Bloqueo de Identidad Facial + Poses/Ángulos de Medalla Automáticos + Medalla Real 10K

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

// Pool de 5 variaciones dinámicas automáticas (Pose + Encuadre + Ángulo 3D de la Medalla)
const VARIACIONES_DINAMICAS = [
  {
    nombre: "Acercamiento Épico",
    instruccion: "DYNAMIC MEDIUM CLOSE-UP SHOT (waist-up / thighs-up framing so the runner's face is large, razor-sharp, and unmistakable): The runner from image 0 leans slightly forward toward the camera with an intense, proud finisher expression, looking directly into the lens. Behind them to the left, the monumental 3D medal is tilted dynamically at a dramatic 3/4 perspective angle catching studio rim light."
  },
  {
    nombre: "En Movimiento / Zancada",
    instruccion: "DYNAMIC ACTION RUNNING POSE: The runner from image 0 is captured mid-stride running powerfully toward the front-right with natural athletic motion and energy, passing right beside the monumental 3D medal tilted at an heroic low-angle perspective with dramatic floor reflections."
  },
  {
    nombre: "Pose de Victoria",
    instruccion: "TRIUMPHANT VICTORY POSE: The runner from image 0 celebrates their 10K finish with genuine joy, raising one fist proudly in victory (or arms raised in celebration), positioned dynamically in front-right of the monumental 3D medal angled slightly toward the viewer."
  },
  {
    nombre: "Apoyado en el Trofeo",
    instruccion: "EDITORIAL TROPHY LEAN POSE: The runner from image 0 poses confidently like a luxury sports magazine cover, casually resting one arm or leaning triumphantly beside the monumental 3D medal which stands slightly rotated at a 25-degree 3D angle on the glossy mirror floor."
  },
  {
    nombre: "Clásica de Estudio",
    instruccion: "CLASSIC POWER EDITORIAL STANCE: The runner from image 0 stands tall with confident athletic posture (hands on hips or arms folded proudly) smiling naturally beside the monumental upright 3D medal on the glossy dark mirror floor."
  }
];

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

  // Formato 9:16 Fijo optimizado para Instagram Stories / Reels (576x1024 ahorra 36% de neuronas diarias de Cloudflare)
  const width = 576;
  const height = 1024;

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

    // Seleccionar pose/encuadre dinámico automáticamente en cada generación
    const variacion = VARIACIONES_DINAMICAS[Math.floor(Math.random() * VARIACIONES_DINAMICAS.length)];

    // Limpiar sintaxis de Midjourney (--sref, URLs y ratios fijos 1:1 / 4:5) para 9:16 limpio
    let promptLimpio = prompt
      .replace(/--sref\s+\S+/gi, '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\b(1:1|4:5|3:4)\b/gi, '9:16 vertical')
      .replace(/\s{2,}/g, ' ')
      .trim();

    let prefijoMultiImagen = "VERTICAL 9:16 INSTAGRAM STORY COMPOSITION (keep the bottom 18% of the frame clean dark floor/gradient space for stats typography, no garbled small text). ";

    if (tieneAtleta) {
      prefijoMultiImagen += "STRICT FACIAL IDENTITY LOCK: Preserve 100% EXACT face, facial structure, eyes, nose, mouth, jawline, hair, beard, skin tone, sunglasses/cap, and authentic likeness of the exact person from image 0. Keep their face clearly visible, well-lit, sharp, and completely unaltered — NEVER change or replace their face, and NEVER paste a flat rectangle photo. ";
    }

    // Inyectar la variación dinámica automática de pose y ángulo
    prefijoMultiImagen += `${variacion.instruccion} `;

    if (idxMedalla >= 0) {
      prefijoMultiImagen += `CRITICAL MEDAL FIDELITY: Replicate 100% identically the exact physical marathon medal from image ${idxMedalla} as a monumental 3D sculpture (preserving its exact rectangular gold notched shield frame, royal blue top ribbon, VEN EZU ELA banner, vertical 3D black 10K, Maracaibo bridge, golden sand dunes, orange sun, Angel Falls waterfall, and blue breaking wave with 2026). If wall typography appears behind, spell strictly and cleanly "RETO VIRTUAL" (only two words, crisp bold white sans-serif, no typos). `;
    }
    if (idxStrava >= 0) {
      prefijoMultiImagen += `Use the running route from image ${idxStrava} as subtle glowing visual accent. `;
    }
    if (idxExtra >= 0) {
      prefijoMultiImagen += `Keep the running shoes/item from image ${idxExtra} faithful in the scene. `;
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
      },
      body: form
    });

    const data = await response.json();

    if (response.ok && data.success && data.result && data.result.image) {
      return res.status(200).json({
        success: true,
        motor: "Cloudflare Workers AI — FLUX.2 Klein 9B (9:16 Multi-Imagen)",
        poseAplicada: variacion.nombre,
        formato: "9:16",
        imagenBase64: data.result.image,
        mimeType: "image/jpeg",
        estiloId,
        atleta
      });
    }

    const errCF = data.errors?.[0]?.message || 'Cloudflare FLUX.2 no devolvió la imagen generada.';
    const esCuotaDiaria = errCF.toLowerCase().includes('10,000 neurons') || errCF.toLowerCase().includes('daily free allocation');
    return res.status(esCuotaDiaria ? 429 : 502).json({
      success: false,
      error: esCuotaDiaria
        ? 'Se alcanzó el límite gratuito diario de generaciones IA de hoy (se reinicia automáticamente a las 8:00 PM hora Venezuela / 00:00 UTC). ¡Vuelve a intentarlo después de las 8:00 PM!'
        : `Error de Cloudflare FLUX.2: ${errCF}`,
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
