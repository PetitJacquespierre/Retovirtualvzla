# 📡 DOCUMENTACIÓN MAESTRA DE APIS: SANDÍA PRODUCTION & RETO VIRTUAL VZLA
> **Grow Studio Central Engine** | Registro Técnico de Integración, Fallas Identificadas y Hoja de Ruta para Reingeniería con Gemini 4 Argon.  
> **Fecha de Actualización:** 25 de Octubre de 2026.

---

## 🎯 1. VISIÓN GENERAL Y OBJETIVO DEL DOCUMENTO
Este documento centraliza el inventario completo, arquitectura de endpoints, formatos de respuesta, problemas de rendimiento/CORS y soluciones técnicas de las APIs utilizadas activamente por:
1. **Sandía Production** (`paraguanahorror.html`, `rotary5k2edicion.html`, `coffeerun.html`, `index.html`).
2. **Reto Virtual Venezuela** (`inscripcion.html`, `10kfundador.html`, `liberados.html`, `evidencias2.html`, `tienda.html`, `espera.html`).

Sirve como **base de contexto obligatoria** para cuando se utilice **Gemini 4 Argon** para rediseñar, estabilizar o migrar el backend de Google Apps Script a una infraestructura más robusta (Cloud Functions, Vercel Serverless o Worker Edge).

---

## 🏛️ 2. INVENTARIO COMPLETO DE ENDPOINTS ACTIVOS

### 💱 A. API de Divisas y Tasa Oficial BCV (COMPARTIDA)
* **Función:** Consulta en vivo de la tasa oficial del Banco Central de Venezuela (BCV), Euro, USDT y Binance P2P para la conversión automática de precios en dólares ($ USD) a bolívares (Bs) en todas las pasarelas de pago móvil.
* **URL del Endpoint (Google Apps Script Web App):**
  ```text
  https://script.google.com/macros/s/AKfycbyazhyYfK-vURGv34XF-oTW1_34rTVRs2WM7-aNlswf-mIGhIwgaLgwfGx1xZxfm50/exec
  ```
* **Método HTTP:** `GET`
* **Formato de Respuesta JSON:**
  ```json
  {
    "usd": 887.3,
    "eur": 994.04,
    "usdt": 980.54,
    "binance": 980.54,
    "meta": {
      "fuente": "BCV Oficial & Binance P2P",
      "actualizado": "2026-10-25T18:44:24.710Z"
    }
  }
  ```
* **Uso en Proyectos:**
  - Sandía: `paraguanahorror.html`, `coffeerun.html`, `rotary5k2edicion.html`
  - Reto Virtual: `inscripcion.html`, `10kfundador.html`, `liberados.html`

---

### 📝 B. APIs de Registro de Inscripciones y Formularios (Google Sheets)

#### 1. Sandía Production — 5K Paraguaná Horror Stories & Rotary 5K
* **URL:**
  ```text
  https://script.google.com/macros/s/AKfycbyl4z2AEREoDCINfDc-3zLukIEafbXHRO88Lr5tinkRZGUTQsALCrRQJvNMd6hUycPE3A/exec
  ```
* **Método:** `POST` (`mode: 'no-cors'`)
* **Payload Ejemplo (Inscripción Individual / VIP):**
  ```json
  {
    "cedula": "V-12.345.678",
    "nombre": "Carlos Pérez",
    "telefono": "04121234567",
    "email": "atleta@gmail.com",
    "team": "Team Runners",
    "metodo_pago": "Pago Móvil (Cupón TEAMVIP)",
    "referencia_ref": "[CUPÓN: TEAMVIP] Ref: 123456",
    "monto_pago": "887,30 Bs / 1$",
    "evento": "5K Paraguaná Horror Story",
    "cupon": "TEAMVIP"
  }
  ```

#### 2. Sandía Production — Coffee Run
* **URL:**
  ```text
  https://script.google.com/macros/s/AKfycbychQtU8RjkpBW5tuNY_NqxpJN32q9Jcc7AAhX8X5nhuDPqQ1MKrCHEI-Qf87A-r-dh1w/exec
  ```

#### 3. Sandía Production — Directorio de Corredores y Aliados
* **URL:**
  ```text
  https://script.google.com/macros/s/AKfycbzlVL7zjykjbAb0s20H4jliek0UpOZlx20LKu04d-KNl6shv3beE8QffRJKSGsIqcUX/exec
  ```
  - Parámetros: `?tipo=aliados` o base.

#### 4. Reto Virtual Venezuela — Inscripciones Generales, Tienda y Evidencias
* **URL:**
  ```text
  https://script.google.com/macros/s/AKfycbyO9tDp2GreaVR-PVRIUS7zbJRQYydOv2S6mgPcYwyqHVM6-v0-TSQ1y-5UlWk6KVN8CA/exec
  ```

#### 5. Reto Virtual Venezuela — 10K Fundador y Cupos Liberados
* **URL:**
  ```text
  https://script.google.com/macros/s/AKfycbyp-NJc2uozcF4VDYRm3_XhKiKmPwdLfB4jLxJV_L9EFpXSBI7dp1TuMG0hxWzC7dLaCg/exec
  ```

#### 6. Reto Virtual Venezuela — Lista de Espera
* **URL:**
  ```text
  https://script.google.com/macros/s/AKfycbzS-bh7LJzckXyLx9fnSCaskXDtEYVxJBJ04mBSiu0wRj1FkiVobTcFGjFrDOOuA4H84Q/exec
  ```

---

### 🔥 C. Firebase Firestore (Grow Studio Admin & Cupones)
* **Colección Central:** `sandia_cupones_horror`
* **Estructura del Documento Cupón (`ID = CODIGO`):**
  ```json
  {
    "codigo": "TEAMFS",
    "precioUSD": 0,
    "tipo": "DOS_USOS",
    "maxUsos": 2,
    "usosCount": 1,
    "estado": "HABILITADO",
    "habilitado": true,
    "fechaCreacion": "2026-10-24T18:00:00.000Z",
    "evento": "5K Paraguaná Horror Story",
    "ultimoAtleta": {
      "nombre": "Juan Pérez",
      "cedula": "12345678",
      "fecha": "2026-10-25T14:20:00.000Z"
    }
  }
  ```
* **Modalidades Soportadas:**
  - `REUTILIZABLE`: `maxUsos = null` (Control Manual On/Off).
  - `UN_SOLO_USO`: `maxUsos = 1` (Se quema automáticamente en el primer canje).
  - `DOS_USOS`: `maxUsos = 2` (Permite 2 registros y luego se bloquea).
  - `TRES_USOS`: `maxUsos = 3`.
  - `CUATRO_USOS`: `maxUsos = 4`.
  - `CINCO_USOS`: `maxUsos = 5`.

---

## ⚠️ 3. DIAGNÓSTICO DE PROBLEMAS CRÍTICOS EN LA API DEL BCV

Durante la operación real, la API de divisas de Google Apps Script ha presentado múltiples fallas que causaban que la web mostrara **tasas desactualizadas** (ej. `876.80 Bs` en lugar de `887.30 Bs`):

### Falla 1: Bloqueo de CORS y Redirecciones 302 con `cache: 'no-store'`
* **Causa:** Google Apps Script redirige toda petición `GET` mediante código `HTTP 302 Found` hacia el CDN interno `https://script.googleusercontent.com/macros/echo?...`.
* **Error:** Si el frontend ejecuta:
  ```javascript
  fetch(urlApiDivisasBCV, { cache: 'no-store' });
  ```
  Los navegadores modernos (Chrome, Safari iOS/Android) consideran `cache: 'no-store'` como una directiva no simple en peticiones cross-origin con redirección, y disparan una petición previa **`OPTIONS` (CORS Preflight)**.  
  👉 **Google Apps Script NO soporta OPTIONS**, devolviendo error de red (*TypeError: Failed to fetch*). Al fallar, la web caía en la tasa de respaldo vieja.
* **Solución aplicada:** Eliminar cualquier cabecera no estándar y usar un simple `fetch(urlApiDivisasBCV + '?t=' + Date.now())`.

### Falla 2: Tiempos de Arranque en Frío (*Cold Start*) de Apps Script
* **Causa:** Google Apps Script apaga la instancia tras minutos de inactividad. La primera petición de un usuario puede demorar entre **5 y 9 segundos**.
* **Error:** Un timeout corto en el cliente (ej. 5 o 6 segundos) abortaba la petición justo antes de que Google respondiera, forzando al usuario a ver el valor de respaldo.
* **Solución aplicada:** Timeout extendido a `8000ms`.

### Falla 3: Caché Persistente en `sessionStorage` sin Fecha de Vencimiento
* **Causa:** El frontend guardaba la tasa en `sessionStorage.setItem('tasaBCV', ...)`. En dispositivos móviles, pestañas abiertas durante 24 a 48 horas conservaban la tasa de días anteriores.
* **Solución aplicada:** Validación de tiempo límite (`30 minutos` máximo). Si la tasa en caché es más vieja de 30 minutos, se invalida y se vuelve a pedir al servidor.

### Falla 4: Tasa de Respaldo Local Congelada en el Código
* **Causa:** Si la API externa se cae o el scraping del BCV falla, el código recurría a una variable fija `let tasaRespaldoLocal = 876.80;` hardcodeada.
* **Solución aplicada:** Se actualizó a `887.30` y se centralizó la función `obtenerTasaActual()`.

### Falla 5: Condición de Carrera (*Race Condition*) con Enlaces VIP
* **Causa:** Cuando un atleta abría un link `?cupon=TEAMFS`, la función `aplicarCupon()` arrancaba de inmediato en paralelo con `calcularMontoBolivares()`. Como la API tardaba 2 segundos en responder, el formulario se rellenaba con la tasa vieja antes de que llegara la nueva.
* **Solución aplicada:** El arranque de la página ahora es una función asíncrona secuencial:
  ```javascript
  (async function() {
      await calcularMontoBolivares();
      if (cuponUrl) await window.aplicarCupon(cuponUrl);
  })();
  ```

---

## 🛠️ 4. CÓDIGO CLIENTE ROBUSTO (ESTÁNDAR GROW STUDIO)
Este es el patrón de código frontend validado que deben tener todas las páginas de Sandía y Reto Virtual:

```javascript
// CONFIGURACIÓN DE DIVISAS
const urlApiDivisasBCV = "https://script.google.com/macros/s/AKfycbyazhyYfK-vURGv34XF-oTW1_34rTVRs2WM7-aNlswf-mIGhIwgaLgwfGx1xZxfm50/exec";
let tasaRespaldoLocal = 887.30; // Actualizar periódicamente como salvavidas

function obtenerTasaActual() {
    let tasa = tasaRespaldoLocal;
    try {
        const cached = sessionStorage.getItem('tasaBCV');
        const cachedTime = sessionStorage.getItem('tasaBCVTime');
        // Válido únicamente por 30 minutos
        if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10)) < 30 * 60 * 1000) {
            const d = JSON.parse(cached);
            if (d && d.usd && !isNaN(d.usd) && parseFloat(d.usd) > 0) {
                tasa = parseFloat(d.usd);
            }
        }
    } catch (e) {}
    return tasa;
}

async function calcularMontoBolivares() {
    let tasa = tasaRespaldoLocal;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s cold start tolerance
        
        // Petición limpia sin headers que disparen preflight OPTIONS
        const respuesta = await fetch(urlApiDivisasBCV + "?t=" + Date.now(), {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (respuesta.ok) {
            const datos = await respuesta.json();
            if (datos && datos.usd && !isNaN(datos.usd) && parseFloat(datos.usd) > 0) {
                tasa = parseFloat(datos.usd);
                tasaRespaldoLocal = tasa;
                sessionStorage.setItem('tasaBCV', JSON.stringify(datos));
                sessionStorage.setItem('tasaBCVTime', Date.now().toString());
            }
        }
    } catch (err) {
        console.warn("API de divisas tardó o falló, usando última tasa oficial:", err);
        const cached = sessionStorage.getItem('tasaBCV');
        if (cached) {
            try {
                const datosCached = JSON.parse(cached);
                if (datosCached && datosCached.usd) tasa = parseFloat(datosCached.usd);
            } catch(e) {}
        }
    } finally {
        // Actualizar UI con la tasa obtenida
        actualizarCamposConTasa(tasa);
    }
}
```

---

## 🚀 5. GUÍA Y PROMPT RECOMENDADO PARA REINGENIERÍA CON GEMINI 4 ARGON

Cuando tengas tus cupos habilitados para usar **Gemini 4 Argon**, utiliza el siguiente prompt estructurado para rediseñar el backend de la API:

### 📋 Prompt Maestro para Gemini 4 Argon:
```markdown
Actúa como un Ingeniero Cloud & Backend Senior de Grow Studio.
Necesito reconstruir y optimizar la API de consulta de divisas en tiempo real (Tasa BCV, Paralelo y USDT) que actualmente corre en Google Apps Script:
Endpoint actual: https://script.google.com/macros/s/AKfycbyazhyYfK-vURGv34XF-oTW1_34rTVRs2WM7-aNlswf-mIGhIwgaLgwfGx1xZxfm50/exec

PROBLEMAS A RESOLVER:
1. Google Apps Script tiene cold starts de 6-9 segundos que hacen que los usuarios en móviles reciban timeout.
2. Apps Script redirige con HTTP 302 a script.googleusercontent.com, causando problemas de CORS si se usan cabeceras estrictas.
3. El web scraper interno de Apps Script se rompe cuando la página del BCV (bcv.org.ve) tarda o cambia su HTML.

REQUERIMIENTOS DE LA NUEVA ARQUITECTURA:
1. Crear una solución moderna Serverless (Cloudflare Worker o Vercel Serverless Function en Node.js/TypeScript).
2. Mecanismo de Multi-Scraping / Multi-Fallback:
   - Fuente 1: Web oficial del BCV (bcv.org.ve).
   - Fuente 2 (Fallback oficial): DolarApi Venezuela (https://ve.dolarapi.com/v1/dolares/oficial).
   - Fuente 3: Scraping secundario o Binance P2P para tasa USDT.
3. Caché Edge (KV o Redis / Stale-While-Revalidate):
   - Responder en < 150ms desde la caché edge.
   - Refrescar la tasa en segundo plano cada 15 a 30 minutos sin hacer esperar al usuario final.
4. Cabeceras CORS abiertas nativas (Access-Control-Allow-Origin: *).
5. Salida JSON idéntica a la que ya consumen Sandía Production y Reto Virtual Vzla:
   {
     "usd": 887.30,
     "eur": 994.04,
     "usdt": 980.54,
     "binance": 980.54,
     "meta": { "fuente": "BCV Oficial", "actualizado": "ISO_TIMESTAMP" }
   }

Por favor entrégame el código completo listo para desplegar y los pasos exactos de configuración.
```

---

## 📌 6. ARCHIVOS ASOCIADOS EN ESTE EQUIPO
* `C:\Users\admin\OneDrive\Documents\Antigravity v2\Sandia Production\paraguanahorror.html`
* `C:\Users\admin\OneDrive\Documents\Antigravity v2\Sandia Production\firebase-sandia.js`
* `C:\Users\admin\OneDrive\Documents\Antigravity v2\Grow Studio Admin\js\modules\sandia-admin.js`
* `C:\Users\admin\OneDrive\Documents\Antigravity v2\Grow Studio Admin\index.html`
* `C:\Users\admin\OneDrive\Documents\Antigravity v2\Reto Virtual Vzla\inscripcion.html`
* `C:\Users\admin\OneDrive\Documents\Antigravity v2\Reto Virtual Vzla\10kfundador.html`

> **Documento generado y resguardado para la memoria técnica de Grow Studio.**
