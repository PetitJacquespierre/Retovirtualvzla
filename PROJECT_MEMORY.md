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
- [ ] Culminar evento actual de 5K.
- [ ] 🚨 **RECORDATORIO OBLIGATORIO (POST-5K):** Activar campaña publicitaria pagada para los 10K (vender los ~50 cupos restantes hasta llegar a 100).
- [ ] Panel / buscador de dorsales y certificados digitales individuales de ediciones pasadas.
- [ ] Integración y verificación de reportes de pago móvil / transferencias.

---

## 📣 6. ESTRATEGIA COMERCIAL & CAMPAÑA PROMOCIONAL PAGADA (RETO 10K)
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


