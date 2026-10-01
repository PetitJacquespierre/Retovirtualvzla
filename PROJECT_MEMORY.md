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
- [ ] Panel / buscador de dorsales y certificados digitales individuales de ediciones pasadas.
- [ ] Integración y verificación de reportes de pago móvil / transferencias.

---

## 📝 5. BITÁCORA Y DECISIONES TÉCNICAS
* **2026-09-30:** Creación de memoria local modular para Reto Virtual Vzla.
* **2026-10-01:** Implementación del Módulo Integral de Evidencias en `evidencias2.html`, subida a Google Drive mediante Google Apps Script (`doPost`), endpoint serverless `/api/consultar-atleta.js` con soporte para ranking público por categorías (General, Masculino, Femenino) y prevención de reportes duplicados por cédula.

