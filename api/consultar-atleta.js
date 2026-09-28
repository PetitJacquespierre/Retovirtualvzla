// Endpoint Serverless Seguro — Estándar Grow Studio
// Oculta el CSV de Google Sheets y filtra la información en el servidor de Vercel.
// El cliente NUNCA recibe la base de datos completa.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GOOGLE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5yMHsenxCWE5kZBDUZ8UcYqDtdAHstfqXcvWkuYZPQ_4n2xSrfs6ptk7k21r1kcMHHLtWjz8SEHwl/pub?gid=244601533&single=true&output=csv";

    const accion = req.query.accion || (req.body && req.body.accion) || 'consultar';
    const ciRaw = req.query.ci || (req.body && req.body.ci) || '';
    const telRaw = req.query.tel || (req.body && req.body.tel) || '';

    const ci = String(ciRaw).replace(/\D/g, '').trim();
    const telFiltro = String(telRaw).replace(/\D/g, '').trim();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const response = await fetch(GOOGLE_CSV_URL + "&t=" + Date.now(), {
            signal: controller.signal,
            headers: { 'User-Agent': 'Vercel-Serverless-Atleta-Fetcher' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.status(502).json({ error: 'Error al consultar la hoja de cálculo' });
        }

        const csvText = await response.text();
        const filas = csvText.split(/\r?\n/).filter(f => f.trim().length > 0);

        // Caso 1: Obtener solo el total de dorsales registrados (para el contador silencioso)
        if (accion === 'total_dorsales') {
            const total = filas.length > 1 ? filas.length - 1 : 0;
            return res.status(200).json({ total });
        }

        // Si es consulta de atleta, se requiere cédula
        if (!ci || ci.length < 5) {
            return res.status(400).json({ error: 'Cédula inválida o requerida' });
        }

        const headers = filas[0].split(',').map(h => h.trim().toLowerCase());
        const idxDorsal = 0;
        const idxCI = headers.findIndex(h => h.includes('cedula') || h.includes('ci'));
        const idxNombre = headers.findIndex(h => h.includes('nombre'));
        const idxTel = headers.findIndex(h => h.includes('telefono') || h.includes('tlf'));
        const idxCarrera = headers.findIndex(h => h.includes('carrera'));
        const idxSaldo = headers.findIndex(h => h.includes('saldopendiente') || h.includes('saldo'));
        const idxTextil = headers.findIndex(h => h.includes('textil'));
        const idxTotal = headers.findIndex(h => h.includes('total'));
        const idxReserva = headers.findIndex(h => h.includes('reserva'));

        let registrosAtleta = [];

        for (let i = 1; i < filas.length; i++) {
            const col = filas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            const filaCI = col[idxCI] ? col[idxCI].replace(/\D/g, '').trim() : '';

            if (filaCI === ci) {
                const filaTel = col[idxTel] ? col[idxTel].replace(/\D/g, '').trim() : '';

                if (telFiltro && telFiltro.length >= 4) {
                    const ultimos4Usuario = telFiltro.slice(-4);
                    const ultimos4Fila = filaTel.slice(-4);
                    if (ultimos4Fila && ultimos4Usuario !== ultimos4Fila) {
                        continue;
                    }
                }

                let carreraNombre = "Edición 10K";
                if (idxCarrera !== -1 && col[idxCarrera]) {
                    carreraNombre = col[idxCarrera];
                } else if (col[idxTextil] && (col[idxTextil].includes('Franela') || col[idxTextil].includes('Solo Medalla'))) {
                    carreraNombre = "Edición Especial 10K";
                } else if (col[idxTotal] && (col[idxTotal].includes('10') || col[idxTotal].includes('16'))) {
                    carreraNombre = col[idxTotal].includes('16') ? "Combo Dúo 5K (3ra + 4ta)" : "3ra Edición 5K";
                }

                const valorSaldoRaw = String((idxSaldo !== -1 ? col[idxSaldo] : col[13]) || '').trim();
                const valUpper = valorSaldoRaw.toUpperCase();
                const esSolv = valUpper === 'SOLVENTE' || valUpper === '0' || valUpper === '0.00' || valUpper === '$0' || valUpper === '$0.00' || valUpper === '';
                const montoNum = esSolv ? 0 : (parseFloat(valorSaldoRaw.replace(/[^0-9.]/g, '')) || 0);

                registrosAtleta.push({
                    dorsal: col[idxDorsal] || 'S/N',
                    nombre: col[idxNombre] || 'Atleta',
                    tel: filaTel ? (filaTel.slice(0, 4) + '***' + filaTel.slice(-3)) : '', // Ofuscación de teléfono
                    carrera: carreraNombre,
                    saldoNum: montoNum,
                    saldoRaw: valorSaldoRaw,
                    esSolvente: esSolv,
                    textil: col[idxTextil] || '',
                    reserva: (idxReserva !== -1 ? col[idxReserva] : '')
                });
            }
        }

        return res.status(200).json({
            encontrado: registrosAtleta.length > 0,
            totalRegistros: registrosAtleta.length,
            registros: registrosAtleta
        });

    } catch (err) {
        return res.status(500).json({ error: 'Error interno en la consulta', detalle: err.message });
    }
}
