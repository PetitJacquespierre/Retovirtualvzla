# 🏃 MEMORIA DE PROYECTO — RETO VIRTUAL VZLA

Archivo de contexto local y memoria viva para la plataforma de carreras deportivas y eventos running de **Reto Virtual Vzla**.

---

## 🎯 1. VISIÓN Y CONTEXTO DEL PRODUCTO
* **Tipo:** Plataforma Web de Eventos Deportivos & Running Virtual.
* **Propósito:** Registro de atletas, publicación de convocatorias (5K / 10K / 21K), asignación de dorsales y consulta de resultados/tiempos.
* **Público Objetivo:** Atletas, corredores aficionados y organizadores de carreras en Venezuela y Latinoamérica.

---

## 🎨 2. IDENTIDAD Y DISEÑO UX/UI
* **Estilo Visual:** Dark Mode deportivo de alto contraste y energía.
* **Tipografía Oficial Innegociable:** Titulares en **`Montserrat`** (`font-weight: 700 / 900`, `uppercase`, `italic`) y cuerpo de lectura en **`Inter`** (exactamente igual que en `index.html`). **Prohibido** cambiar la fuente a `Syne` u otras tipografías distintas en páginas internas.
* **Paleta Base:** Fondo ultra oscuro (`#0A0A0C` / `#0D1117`), texto claro contrastado y acentos vibrantes (verde neón / cian eléctrico).
* **Enfoque:** Mobile-First real (los atletas consultan dorsales y se registran desde el teléfono).

---

## 🔒 3. REGLAS TÉCNICAS Y DE SEGURIDAD (Innegociables)
1. **Privacidad de Datos de Atletas:** Nunca exponer listas completas ni archivos CSV públicos en el frontend. Las consultas de dorsal, estatus o tiempos deben ser individuales por número de cédula/identificación o código de registro.
2. **Formularios de Inscripción:** Validación estricta, sanitización y campo trampa (*honeypot*) anti-bot silencioso.
3. **Optimización Extrema:** Carga ultrarrápida pensada para conexiones móviles lentas.

---

## 📌 4. ESTADO ACTUAL Y TAREAS PENDIENTES
- [x] Estructura base responsive y catálogo de eventos.
- [x] Formulario de inscripción y validación de campos.
- [x] Portal Integral de Evidencias, Ranking por género y Certificados Digitales (3ra y 4ta Edición).
- [x] FOMO en tiempo real en `index.html` para la Edición 10K conectado a Google Sheets (conteo dinámico y porcentaje).
- [x] Tienda Oficial (`tienda.html`) estilo marketplace con Medallas 1ra/2da Edición ($5), Medallero Hexagonal ($7), auto-detección de dorsal por cédula y registro en Google Sheets (`Tienda_Medallas`).
- [ ] Culminar completamente la 3ra y 4ta Edición de 5K.
- [x] 🚨 **UNIFICACIÓN COMPLETADA (`evidencias2.html`):** Unificado `evidencias2.html` y `resultados.html` en un **único Centro de Evidencias, Ranking y Diplomas**:
  - Integrado selector maestro de todas las ediciones (`1ra`, `2da`, `3ra` por defecto, `4ta` y `10K`) en `evidencias2.html`.
  - Diploma histórico original (`fondo-certificado.webp`) para `1ra Edición` y diplomas generados por código con identidad cromática diferenciada para `2da Edición` (Esmeralda), `3ra Edición` (Cian Eléctrico) y `4ta Edición` (Oro Imperial).
  - Eliminado `resultados.html` de todos los menús de navegación y configurada redirección automática hacia `evidencias2.html`.
- [ ] 🚨 **RECORDATORIO OBLIGATORIO (POST-5K):** Activar campaña publicitaria pagada para los 10K (vender los ~50 cupos restantes hasta llegar a 100).
- [ ] Integración y verificación de reportes de pago móvil / transferencias.

---

## 🚨 ESTRATEGIA DE CIERRE "SOLD OUT DE FIN DE MES" (NOV 27-28 / ~80 INSCRITOS)
* **Momento de Activación:** Faltando 2-3 días para el último de mes (27-28 de noviembre) o al alcanzar los ~80 inscritos.
* **Pantalla Pública (`inscripcion.html`):** Cierre total **100% SOLD OUT** (SIN botón de "lista de emergencia" ni pistas de que hay cupos). Debe verse completamente cerrado al público.
* **Desbloqueo Secreto (`?vip=CODIGO`):** Solo cuando el usuario escriba rogando por DM/WhatsApp (especialmente al cobrar el 29-30 de nov o 1 de dic), se le hace el "favor" otorgándole un link VIP de 1 solo uso desde **Grow Studio Admin** (`reto_cupones_10k`).
* **Reapertura Relámpago Final:** 1 o 2 días después (1-2 de dic, post-cobro), anunciar micro-lote final por petición popular con link limitado hasta completar exactamente las 100 medallas físicas.

---

## 🚨 RECORDATORIO ACTIVO PARA MAÑANA (GYG GRAPHICS / TEXTIL)
> **DISPARADOR / TRIGGER:** Apenas el usuario diga que le escribió o habló con la gente de **GYG Graphics (Creaciones Gyg Graphics)**, el asistente DEBE recordarle de inmediato:
1. **Sumar la pieza de Luis Alberto García (#066 - Tucupita, Delta Amacuro):** Indicarle al taller que sume **1 Franelilla Olímpica Caballero** al lote en Tela Atlética (el pedido pasa de 58 a **59 piezas totales**).
2. **Definir la Talla:** Confirmar con Luis Alberto si su franelilla caballero es talla S, M, L o XL para pasarle la talla exacta al taller.
3. **Cálculo de Deuda Restante con Fábrica:**
   - Monto base restante (25%): $113.83 USD.
   - Franelilla adicional: +$7.00 USD.
   - **Total exacto por liquidar con GYG:** 👉 **$120.83 USD**.
   - Con los $35 USD que pagó Luis Alberto completo + los $15 USD de Yuli Sabrina del miércoles, ya tienes $50 USD en mano para amortizar esa cuenta. Solo faltarían ~$70.83 USD.
> **DISPARADOR / TRIGGER:** Apenas se culmine la entrega y fase operativa de los **5K**, el asistente debe **recordar y activar proactivamente** esta campaña y los copys para pauta pagada (Meta Ads / Instagram / TikTok / WhatsApp).
* **Meta:** Completar los 100 cupos totales (actualmente 42 inscritos, faltan ~50 cupos por agotar).
* **Timing:** Octubre - Noviembre (2 meses antes del evento).

### Copys Oficiales Aprobados para Pauta:
1. **Enfoque Escasez Real (Reels / Stories con video/foto de medalla maciza):**
   * *Titular:* "¡Ya se reservó casi el 50% de los cupos del Reto 10K! 🏅🔥"
   * *Cuerpo:* "A falta de 2 meses para el evento oficial, más de 40 atletas ya aseguraron su medalla de metal macizo edición especial. Solo habilitamos 100 cupos para este lote."
   * *CTA:* "No te quedes por fuera. Entra al enlace y asegura tu kit hoy antes del cierre de lote."
2. **Enfoque Meta de Cierre de Año (Feed / Carrusel / WhatsApp):**
   * *Titular:* "Cierra el 2026 superando tus 10 Kilómetros. ⚡🏃‍♂️"
   * *Cuerpo:* "Corre o camina a tu propio ritmo, desde tu ciudad o cualquier parte del mundo. Sube tus evidencias, obtén tu dorsal personalizado y recibe la medalla física más imponente en la puerta de tu casa."
   * *FOMO:* "⚠️ Quedan menos de 60 medallas disponibles."
   * *CTA:* "Inscríbete ahora en retovirtualvzla.com."
3. **Enfoque Urgencia / Cuenta Regresiva (Micro-copy / Broadcast):**
   * "¡Atención runners! ⏱️ Más del 40% de los kits 10K ya tienen dueño en nuestra plataforma. El lote es limitado a 100 piezas físicas. Asegura la tuya aquí: retovirtualvzla.com"

---

## 📝 7. BITÁCORA Y DECISIONES TÉCNICAS
* **2026-09-30:** Creación de memoria local modular para Reto Virtual Vzla.
* **2026-10-01:** Implementación del Módulo Integral de Evidencias en `evidencias2.html`, subida a Google Drive mediante Google Apps Script (`doPost`), endpoint serverless `/api/consultar-atleta.js` con soporte para ranking público por categorías (General, Masculino, Femenino) y prevención de reportes duplicados por cédula. Modernización de `resultados.html` a Obsidian Dark.
* **2026-10-02:** Sincronización en vivo del widget FOMO de `index.html` con Google Sheets (`total_dorsales`), mostrando porcentaje agotado y cupos restantes. Registro y guardado de estrategia de pauta paga 10K con recordatorio post-5K.
* **2026-10-03:** Resolución definitiva de indexación en Google Search Console. Unificación de etiquetas canónicas a `https://www.retovirtualvzla.com/`, actualización de `sitemap.xml` con 6 URLs prioritarias y `robots.txt`. Verificación en vivo aprobada por el robot de Google e indexación solicitada.
* **2026-10-07:** Implementación de Comisario Deportivo con IA en `evidencias2.html`: Selector de modalidad (Running vs Caminata), selector de distancia con soporte para split de recorridos de 10K+, auditoría biomecánica de ritmo humano (detección de vehículos/trampas) y envío de metadatos de validación a Google Drive/Sheets.
* **2026-10-19:** Creación de `PLAN_MEDALLAS_2027.md` con la estrategia integral para la Temporada 2027: Puzzle real de 4 piezas en acrílico (*"Los 4 Elementos del Poder Runner"*), calendario anual en 2 bloques de fabricación (`50-50-40-40`), preventa temprana en cuotas para el 10K de metal (Mayo/Junio), reseteo de dorsales a `001` y programa de descuento/lealtad para Atletas Veteranos 2026.
* **2026-11-21:** Creación de `CONTROL_PRODUCCION_TEXTIL.md` para seguimiento riguroso de pedidos al taller de confección. Regla obligatoria: A toda orden para atletas (50 piezas en Dorsal #053) se le suman de forma fija las **4 prendas personales de los organizadores** (1 Franelilla L + 1 Franela L para él, 1 Franelilla S + 1 Franela S para su esposa). Total actual: **54 prendas** (41 franelillas y 13 franelas con mangas).
* **2026-11-24:** Guardado enlace de referencia de TikTok de **Capa Zero (`@capazeroo`)** para futura revisión y análisis de automatización de videos con Remotion + IA:
  - **Link del Video:** https://www.tiktok.com/@capazeroo/video/7711546534415863060?is_from_webapp=1&sender_device=pc
  - **Web de Recursos de Capa Zero:** https://capazero.app
  - **Estado Operativo 10K Confirmado:** Confección de franelas cerrada (60 piezas ya enviadas a fábrica GYG Graphics). Únicamente activa modalidad **Solo Medalla 3D ($25.00 USD, aparta con $10 USD)**. Liquidación del 100% del pago el **30 de noviembre de 2026** y carrera desde el **11 de diciembre de 2026**.


