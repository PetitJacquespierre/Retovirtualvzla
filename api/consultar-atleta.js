// Endpoint Serverless Seguro — Estándar Grow Studio
// Permite consultar atleta, verificar evidencias y obtener ranking público sin exponer el CSV privado.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const SPREADSHEET_ID = "1vg9nwhkFxwN4qVzjkfmXTrIVoHVYxeMH3-PXjqzeWao";
    const CSV_BASE = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&`;

    const accion = req.query.accion || (req.body && req.body.accion) || 'consultar';
    const edicion = req.query.edicion || (req.body && req.body.edicion) || '3ra';
    const ciRaw = req.query.ci || (req.body && req.body.ci) || '';
    const telRaw = req.query.tel || (req.body && req.body.tel) || '';

    const ci = String(ciRaw).replace(/\D/g, '').trim();
    const telFiltro = String(telRaw).replace(/\D/g, '').trim();

    try {
        // =========================================================================
        // ACCIÓN 1: OBTENER RANKING PÚBLICO DE EVIDENCIAS (3ra o 4ta Edición)
        // =========================================================================
        if (accion === 'ranking_evidencias') {
            const sheetName = (edicion === '4ta') ? 'Evidencias_4ta' : 'Evidencias_3ra';
            const url = `${CSV_BASE}sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
            
            const resp = await fetch(url);
            if (!resp.ok) {
                return res.status(502).json({ error: 'No se pudo conectar con la hoja de evidencias' });
            }

            const csvText = await resp.text();
            const filas = csvText.split(/\r?\n/).filter(f => f.trim().length > 0);
            
            if (filas.length <= 1) {
                return res.status(200).json({ ranking: [] });
            }

            const parseCsvLine = (line) => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            const headers = parseCsvLine(filas[0]).map(h => h.toLowerCase());

            const idxDorsal = headers.findIndex(h => h.includes('dorsal'));
            const idxNombre = headers.findIndex(h => h.includes('nombre'));
            const idxGenero = headers.findIndex(h => h.includes('genero') || h.includes('sexo'));
            const idxTiempo = headers.findIndex(h => h.includes('tiempo'));
            const idxEstatus = headers.findIndex(h => h.includes('estatus') || h.includes('estado'));

            let lista = [];

            for (let i = 1; i < filas.length; i++) {
                const cols = parseCsvLine(filas[i]);
                const dorsal = (idxDorsal !== -1 ? cols[idxDorsal] : cols[3]) || 'S/N';
                const nombre = (idxNombre !== -1 ? cols[idxNombre] : cols[4]) || 'Corredor';
                const genero = (idxGenero !== -1 ? cols[idxGenero] : cols[5]) || '-';
                const tiempo = (idxTiempo !== -1 ? cols[idxTiempo] : cols[6]) || 'Pendiente';
                const estatus = (idxEstatus !== -1 ? cols[idxEstatus] : cols[8]) || 'Aprobado';

                // Solo incluimos los validados o todos según convenga
                lista.push({
                    dorsal: String(dorsal).replace(/\D/g, '').padStart(3, '0'),
                    nombre: nombre,
                    genero: genero.toUpperCase().startsWith('F') ? 'FEMENINO' : 'MASCULINO',
                    tiempo: tiempo,
                    estatus: estatus
                });
            }

            return res.status(200).json({ ranking: lista });
        }

        // =========================================================================
        // ACCIÓN 2: VERIFICAR SI CÉDULA YA TIENE EVIDENCIA EN ESA EDICIÓN
        // =========================================================================
        if (accion === 'verificar_evidencia') {
            if (!ci || ci.length < 5) {
                return res.status(400).json({ error: 'Cédula inválida o requerida' });
            }

            const sheetName = (edicion === '4ta') ? 'Evidencias_4ta' : 'Evidencias_3ra';
            const url = `${CSV_BASE}sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
            
            const resp = await fetch(url);
            if (!resp.ok) {
                return res.status(502).json({ error: 'No se pudo consultar evidencias' });
            }

            const csvText = await resp.text();
            const filas = csvText.split(/\r?\n/).filter(f => f.trim().length > 0);
            
            let yaSubio = false;
            let registroPrevio = null;

            for (let i = 1; i < filas.length; i++) {
                const cols = filas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                const filaCI = cols[2] ? cols[2].replace(/\D/g, '').trim() : '';

                if (filaCI === ci) {
                    yaSubio = true;
                    registroPrevio = {
                        dorsal: cols[3] || '',
                        nombre: cols[4] || '',
                        tiempo: cols[6] || '',
                        fecha: cols[0] || '',
                        estatus: cols[8] || 'Pendiente'
                    };
                    break;
                }
            }

            return res.status(200).json({
                yaSubio: yaSubio,
                registro: registroPrevio
            });
        }

        // =========================================================================
        // =========================================================================
        // ACCIÓN 3: CONSULTA GENERAL DE ATLETA (INSCRIPCIONES / DORSAL / SALDO)
        // Soporta 3ra Edición 5K (gid 1584884677), 4ta Edición 5K (gid 95585629) e Inscripciones 10K (gid 244601533)
        // =========================================================================
        const parseCsv = (line) => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        const GOOGLE_CSV_URL_10K = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5yMHsenxCWE5kZBDUZ8UcYqDtdAHstfqXcvWkuYZPQ_4n2xSrfs6ptk7k21r1kcMHHLtWjz8SEHwl/pub?gid=244601533&single=true&output=csv";
        const GOOGLE_CSV_URL_3RA = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1584884677`;
        const GOOGLE_CSV_URL_4TA = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=95585629`;

        if (accion === 'total_dorsales') {
            const resp10k = await fetch(GOOGLE_CSV_URL_10K + "&t=" + Date.now(), { headers: { 'User-Agent': 'Vercel-Serverless-Fetcher' } });
            if (resp10k.ok) {
                const text = await resp10k.text();
                const total = text.split(/\r?\n/).filter(f => f.trim().length > 0).length - 1;
                return res.status(200).json({ total: Math.max(0, total) });
            }
            return res.status(200).json({ total: 22 });
        }

        if (!ci || ci.length < 5) {
            return res.status(400).json({ error: 'Cédula inválida o requerida' });
        }

        let registrosAtleta = [];

        // 1. Consultar 3ra Edición 5K
        try {
            const resp3ra = await fetch(GOOGLE_CSV_URL_3RA + "&t=" + Date.now());
            if (resp3ra.ok) {
                const csv3 = await resp3ra.text();
                const filas3 = csv3.split(/\r?\n/).filter(f => f.trim().length > 0);
                if (filas3.length > 1) {
                    const h3 = parseCsv(filas3[0]).map(h => h.toLowerCase());
                    const idxDorsal = 0;
                    const idxCI = h3.findIndex(h => h.includes('cedula') || h.includes('ci')) !== -1 ? h3.findIndex(h => h.includes('cedula') || h.includes('ci')) : 1;
                    const idxNombre = h3.findIndex(h => h.includes('nombre')) !== -1 ? h3.findIndex(h => h.includes('nombre')) : 2;
                    const idxTel = h3.findIndex(h => h.includes('telefono') || h.includes('tlf')) !== -1 ? h3.findIndex(h => h.includes('telefono') || h.includes('tlf')) : 3;
                    const idxGen3 = h3.findIndex(h => h.includes('genero') || h.includes('sexo'));

                    for (let i = 1; i < filas3.length; i++) {
                        const col = parseCsv(filas3[i]);
                        const filaCI = col[idxCI] ? col[idxCI].replace(/\D/g, '').trim() : '';
                        if (filaCI === ci) {
                            const filaTel = col[idxTel] ? col[idxTel].replace(/\D/g, '').trim() : '';
                            const dNum = col[idxDorsal] ? String(col[idxDorsal]).replace(/\D/g, '').padStart(3, '0') : 'S/N';
                            const rawGen = idxGen3 !== -1 && col[idxGen3] ? col[idxGen3].trim() : '';
                            let genFinal = '';
                            if (rawGen.toUpperCase().startsWith('F')) genFinal = 'FEMENINO';
                            else if (rawGen.toUpperCase().startsWith('M')) genFinal = 'MASCULINO';

                            registrosAtleta.push({
                                dorsal: dNum,
                                nombre: col[idxNombre] || 'Atleta',
                                tel: filaTel ? (filaTel.slice(0, 4) + '***' + filaTel.slice(-3)) : '',
                                carrera: "3ra Edición 5K",
                                saldoNum: 0,
                                saldoRaw: "SOLVENTE",
                                esSolvente: true,
                                textil: '',
                                reserva: '',
                                genero: genFinal
                            });
                        }
                    }
                }
            }
        } catch(e) {}

        // 2. Consultar 4ta Edición 5K
        try {
            const resp4ta = await fetch(GOOGLE_CSV_URL_4TA + "&t=" + Date.now());
            if (resp4ta.ok) {
                const csv4 = await resp4ta.text();
                const filas4 = csv4.split(/\r?\n/).filter(f => f.trim().length > 0);
                if (filas4.length > 1) {
                    const h4 = parseCsv(filas4[0]).map(h => h.toLowerCase());
                    const idxDorsal = 0;
                    const idxCI = h4.findIndex(h => h.includes('cedula') || h.includes('ci')) !== -1 ? h4.findIndex(h => h.includes('cedula') || h.includes('ci')) : 1;
                    const idxNombre = h4.findIndex(h => h.includes('nombre')) !== -1 ? h4.findIndex(h => h.includes('nombre')) : 2;
                    const idxTel = h4.findIndex(h => h.includes('telefono') || h.includes('tlf')) !== -1 ? h4.findIndex(h => h.includes('telefono') || h.includes('tlf')) : 3;
                    const idxGen4 = h4.findIndex(h => h.includes('genero') || h.includes('sexo'));

                    for (let i = 1; i < filas4.length; i++) {
                        const col = parseCsv(filas4[i]);
                        const filaCI = col[idxCI] ? col[idxCI].replace(/\D/g, '').trim() : '';
                        if (filaCI === ci) {
                            const filaTel = col[idxTel] ? col[idxTel].replace(/\D/g, '').trim() : '';
                            const dNum = col[idxDorsal] ? String(col[idxDorsal]).replace(/\D/g, '').padStart(3, '0') : 'S/N';
                            const rawGen = idxGen4 !== -1 && col[idxGen4] ? col[idxGen4].trim() : '';
                            let genFinal = '';
                            if (rawGen.toUpperCase().startsWith('F')) genFinal = 'FEMENINO';
                            else if (rawGen.toUpperCase().startsWith('M')) genFinal = 'MASCULINO';

                            registrosAtleta.push({
                                dorsal: dNum,
                                nombre: col[idxNombre] || 'Atleta',
                                tel: filaTel ? (filaTel.slice(0, 4) + '***' + filaTel.slice(-3)) : '',
                                carrera: "4ta Edición 5K",
                                saldoNum: 0,
                                saldoRaw: "SOLVENTE",
                                esSolvente: true,
                                textil: '',
                                reserva: '',
                                genero: genFinal
                            });
                        }
                    }
                }
            }
        } catch(e) {}

        // 3. Consultar Edición 10K / General
        try {
            const response = await fetch(GOOGLE_CSV_URL_10K + "&t=" + Date.now(), {
                headers: { 'User-Agent': 'Vercel-Serverless-Atleta-Fetcher' }
            });

            if (response.ok) {
                const csvText = await response.text();
                const filas = csvText.split(/\r?\n/).filter(f => f.trim().length > 0);
                if (filas.length > 1) {
                    const headers = parseCsv(filas[0]).map(h => h.toLowerCase());
                    const idxDorsal = 0;
                    const idxCI = headers.findIndex(h => h.includes('cedula') || h.includes('ci'));
                    const idxNombre = headers.findIndex(h => h.includes('nombre'));
                    const idxTel = headers.findIndex(h => h.includes('telefono') || h.includes('tlf'));
                    const idxCarrera = headers.findIndex(h => h.includes('carrera'));
                    const idxSaldo = headers.findIndex(h => h.includes('saldopendiente') || h.includes('saldo'));
                    const idxTextil = headers.findIndex(h => h.includes('textil'));
                    const idxTotal = headers.findIndex(h => h.includes('total'));
                    const idxReserva = headers.findIndex(h => h.includes('reserva'));
                    const idxGeneroAtleta = headers.findIndex(h => h.includes('genero') || h.includes('sexo'));

                    for (let i = 1; i < filas.length; i++) {
                        const col = parseCsv(filas[i]);
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

                            const rawGen = (idxGeneroAtleta !== -1 ? col[idxGeneroAtleta] : '') || '';
                            const generoFormateado = rawGen.toUpperCase().startsWith('F') ? 'FEMENINO' : 'MASCULINO';

                            registrosAtleta.push({
                                dorsal: col[idxDorsal] || 'S/N',
                                nombre: col[idxNombre] || 'Atleta',
                                tel: filaTel ? (filaTel.slice(0, 4) + '***' + filaTel.slice(-3)) : '',
                                carrera: carreraNombre,
                                saldoNum: montoNum,
                                saldoRaw: valorSaldoRaw,
                                esSolvente: esSolv,
                                textil: col[idxTextil] || '',
                                reserva: (idxReserva !== -1 ? col[idxReserva] : ''),
                                genero: generoFormateado
                            });
                        }
                    }
                }
            }
        } catch(e) {}

        return res.status(200).json({
            encontrado: registrosAtleta.length > 0,
            totalRegistros: registrosAtleta.length,
            registros: registrosAtleta
        });

    } catch (err) {
        return res.status(500).json({ error: 'Error interno en la consulta', detalle: err.message });
    }
}
