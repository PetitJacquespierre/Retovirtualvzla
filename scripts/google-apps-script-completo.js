var sheetName = 'Inscripciones_10K';

// 👉 EJECUTA ESTA FUNCIÓN UNA VEZ PARA ACTIVAR LOS PERMISOS (Correo y Drive)
function autorizarPermisos() {
  var correo = Session.getActiveUser().getEmail() || "retovirtual5k.vzla@gmail.com";
  MailApp.sendEmail(correo, "✅ Permisos Activados", "Los permisos para Reto Virtual VZLA han sido autorizados correctamente.");
  DriveApp.getRootFolder();
  Logger.log("Permisos autorizados con éxito.");
}

function initialSetup() {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('key', activeSpreadsheet.getId());
}

function buscarPestana(doc, nombresPosibles) {
  for (var i = 0; i < nombresPosibles.length; i++) {
    var sheet = doc.getSheetByName(nombresPosibles[i]);
    if (sheet) return sheet;
  }
  var allSheets = doc.getSheets();
  for (var j = 0; j < allSheets.length; j++) {
    var sName = allSheets[j].getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (var k = 0; k < nombresPosibles.length; k++) {
      var target = nombresPosibles[k].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (sName === target) return allSheets[j];
    }
  }
  return null;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  var correoDestino = "retovirtual5k.vzla@gmail.com"; 

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var tipoCarrera = (e.parameter['Carrera'] || '').toString().trim().toUpperCase();
    var cedulaRecibida = e.parameter['Cedula'] || '';
    var nombreAtleta = e.parameter['Nombre'] || 'Atleta Desconocido';
    var telefonoAtleta = e.parameter['Telefono'] || 'N/A';
    var montoTotal = e.parameter['Total'] || '0';
    var refPago = e.parameter['RefPago'] || 'N/A';
    var fechaPago = e.parameter['FechaPago'] || 'N/A';
    var estado = e.parameter['Estado'] || '';
    var ciudad = e.parameter['Ciudad'] || '';
    var agencia = e.parameter['Agencia'] || '';
    var direccion = e.parameter['Direccion'] || '';
    var genero = e.parameter['Genero'] || '';

    // =========================================================================
    // FLUJO 0: EVIDENCIAS DE CARRERA (1ra -> Ranking, 2da -> 2E Ranking, 3ra -> Evidencias_3ra, 4ta -> Evidencias_4ta)
    // =========================================================================
    if (tipoCarrera === 'EVIDENCIA') {
      var edicionEv = (e.parameter['Edicion'] || '3ra').toString().trim();
      var ciLimpiaEv = String(cedulaRecibida).replace(/\D/g, '').trim();
      var dorsalEv = String(e.parameter['Dorsal'] || '').replace(/\D/g, '').padStart(3, '0');
      var tiempoEv = (e.parameter['Tiempo'] || '').toString().trim();
      var generoEv = (genero || 'MASCULINO').toString().trim().toUpperCase();
      var generoCorto = generoEv.indexOf('F') === 0 ? 'F' : 'M';
      var modalidadEv = e.parameter['Modalidad'] || 'CORRIENDO';
      var auditoriaIA = e.parameter['AuditoriaIA'] || 'Verificado';

      // Subir la captura a Google Drive y obtener enlace público
      var guardarCapturaDrive = function() {
        var urlEvidencia = "Sin captura";
        var imgBase64 = e.parameter['ImagenBase64'] || '';
        var mimeType = e.parameter['MimeType'] || 'image/jpeg';
        if (imgBase64 !== '') {
          try {
            var extension = (mimeType.indexOf('png') !== -1) ? 'png' : 'jpg';
            var nombreArchivo = "Evidencia_" + edicionEv + "_Dorsal_" + dorsalEv + "_" + new Date().getTime() + "." + extension;
            var bytes = Utilities.base64Decode(imgBase64);
            var blob = Utilities.newBlob(bytes, mimeType, nombreArchivo);
            var archivoDrive = DriveApp.createFile(blob);
            archivoDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            urlEvidencia = archivoDrive.getUrl();
          } catch (errDrive) {
            Logger.log("Error guardando en Drive: " + errDrive);
            urlEvidencia = "Evidencia_" + edicionEv + "_Dorsal_" + dorsalEv + "_" + new Date().getTime() + ".jpg";
          }
        }
        return urlEvidencia;
      };

      // -----------------------------------------------------------------------
      // CASO A: 1ra Edición (Pestaña 'Ranking') y 2da Edición (Pestaña '2E Ranking')
      // Formato de columnas en Ranking y 2E Ranking: [Dorsal, Nombre, Genero, Tiempo]
      // -----------------------------------------------------------------------
      if (edicionEv === '1ra' || edicionEv === '2da') {
        var nombresRanking = (edicionEv === '1ra')
          ? ['Ranking', '1ra Ranking', 'Ranking 1ra']
          : ['2E Ranking', '2E ranking', 'Ranking 2da'];

        var sheetRank = buscarPestana(doc, nombresRanking);
        if (!sheetRank) {
          throw new Error("No se encontró la pestaña de Ranking para " + edicionEv + " Edición.");
        }

        var datosRank = sheetRank.getDataRange().getValues();
        var filaExistenteSinTiempo = -1;

        for (var r = 1; r < datosRank.length; r++) {
          var dEnFila = String(datosRank[r][0] || '').replace(/\D/g, '').trim();
          var dEnFilaPad = dEnFila ? dEnFila.padStart(3, '0') : '';
          var tEnFila = String(datosRank[r][3] || '').trim();

          if (dEnFilaPad !== '' && dEnFilaPad === dorsalEv) {
            if (tEnFila !== '' && tEnFila.toLowerCase() !== 'pendiente') {
              return ContentService.createTextOutput("DUPLICADO").setMimeType(ContentService.MimeType.TEXT);
            } else {
              filaExistenteSinTiempo = r + 1;
              break;
            }
          }
        }

        var urlEv12 = guardarCapturaDrive();

        if (filaExistenteSinTiempo !== -1) {
          // Si el dorsal ya estaba en la tabla pero con el tiempo en blanco, actualizar su tiempo
          sheetRank.getRange(filaExistenteSinTiempo, 4).setValue(tiempoEv);
        } else {
          // Agregar nueva fila en 'Ranking' (1ra) o '2E Ranking' (2da): [Dorsal, Nombre, Genero (M/F), Tiempo]
          sheetRank.appendRow([
            "'" + dorsalEv,
            nombreAtleta,
            generoCorto,
            tiempoEv
          ]);
        }

        try {
          MailApp.sendEmail({
            to: correoDestino,
            subject: "🏆 RANKING ACTUALIZADO (" + edicionEv + " Ed.) - Dorsal #" + dorsalEv + " - " + nombreAtleta,
            htmlBody: "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;'>" +
                      "<h2 style='color: #001E50;'>🏆 Nuevo Tiempo Registrado en " + (edicionEv === '1ra' ? 'Ranking (1ra Edición)' : '2E Ranking (2da Edición)') + "</h2>" +
                      "<p style='font-size: 16px; color: #00D2FF; font-weight: bold;'>Dorsal #" + dorsalEv + " — Tiempo: " + tiempoEv + "</p>" +
                      "<p><b>Atleta:</b> " + nombreAtleta + "<br>" +
                      "<b>Cédula:</b> " + ciLimpiaEv + "<br>" +
                      "<b>Género:</b> " + generoEv + " (" + generoCorto + ")<br>" +
                      "<b>Captura en Drive:</b> <a href='" + urlEv12 + "' target='_blank'>Ver Captura de Carrera</a></p>" +
                      "</div>"
          });
        } catch (errMail12) { Logger.log("Error email 1ra/2da: " + errMail12); }

        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }

      // -----------------------------------------------------------------------
      // CASO B: 3ra Edición ('Evidencias_3ra') y 4ta Edición ('Evidencias_4ta')
      // -----------------------------------------------------------------------
      var nombrePestanaEv = (edicionEv === '4ta') ? 'Evidencias_4ta' : 'Evidencias_3ra';
      var sheetEv = buscarPestana(doc, [nombrePestanaEv]);
      if (!sheetEv) {
        sheetEv = doc.insertSheet(nombrePestanaEv);
        sheetEv.appendRow([
          'Fecha', 'Edicion', 'Cedula', 'Dorsal', 'Nombre', 'Genero', 'Tiempo', 'UrlEvidencia', 'Estatus'
        ]);
      }

      // Evitar registros duplicados de la misma cédula EN LA MISMA EDICIÓN
      var datosEv = sheetEv.getDataRange().getValues();
      for (var k = 1; k < datosEv.length; k++) {
        var edEnFila = String(datosEv[k][1] || '').trim().toLowerCase();
        var ciEnFila = String(datosEv[k][2] || '').replace(/\D/g, '').trim();
        if (ciEnFila !== '' && ciEnFila === ciLimpiaEv && (edEnFila === edicionEv.toLowerCase() || edEnFila === '')) {
          return ContentService.createTextOutput("DUPLICADO").setMimeType(ContentService.MimeType.TEXT);
        }
      }

      var urlEvidencia = guardarCapturaDrive();

      sheetEv.appendRow([
        new Date(),
        edicionEv,
        ciLimpiaEv,
        "'" + dorsalEv,
        nombreAtleta,
        generoEv,
        tiempoEv,
        urlEvidencia,
        "Pendiente"
      ]);

      try {
        MailApp.sendEmail({
          to: correoDestino,
          subject: "⏱️ NUEVA EVIDENCIA (" + edicionEv + " Ed.) - Dorsal #" + dorsalEv + " - " + nombreAtleta,
          htmlBody: "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;'>" +
                    "<h2 style='color: #001E50;'>⏱️ Nueva Evidencia Recibida (" + edicionEv + " Edición)</h2>" +
                    "<p style='font-size: 16px; color: #00D2FF; font-weight: bold;'>Dorsal #" + dorsalEv + " — Tiempo: " + tiempoEv + "</p>" +
                    "<p><b>Atleta:</b> " + nombreAtleta + "<br>" +
                    "<b>Cédula:</b> " + ciLimpiaEv + "<br>" +
                    "<b>Género:</b> " + generoEv + "<br>" +
                    "<b>Modalidad:</b> " + modalidadEv + "<br>" +
                    "<b>Auditoría IA:</b> " + auditoriaIA + "<br>" +
                    "<b>Captura en Drive:</b> <a href='" + urlEvidencia + "' target='_blank'>Ver Captura de Carrera</a><br>" +
                    "<b>Estatus inicial en hoja:</b> Pendiente (Recuerda cambiarlo a <b>Aprobado</b> en la hoja para habilitar su certificado y ranking).</p>" +
                    "</div>"
        });
      } catch (errMailEv) { Logger.log("Error email evidencia: " + errMailEv); }

      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);

    // =========================================================================
    // FLUJO 1: TIENDA (Medallas, Portamedallas y Artículos)
    // =========================================================================
    } else if (tipoCarrera === 'TIENDA') {

      var sheetTienda = buscarPestana(doc, ['Tienda_Medallas', 'Tienda', 'Ventas_Tienda']);
      if (!sheetTienda) {
        sheetTienda = doc.insertSheet('Tienda_Medallas');
        sheetTienda.appendRow([
          'Fecha', 'Nombre', 'Cedula', 'Dorsal', 'Telefono', 'Referencia', 
          'M1', 'M2', 'Porta Medalla', 'Total a pagar', 'Modalidad Envio', 'Estatus'
        ]);
      }

      var cantM1 = Number(e.parameter['CantM1'] || 0);
      var cantM2 = Number(e.parameter['CantM2'] || 0);
      var cantMedallero = Number(e.parameter['CantMedallero'] || 0);
      var dorsalRecibido = e.parameter['Dorsal'] || '';

      sheetTienda.appendRow([
        new Date(),
        nombreAtleta,
        "'" + String(cedulaRecibida).replace(/\D/g, '').trim(),
        "'" + String(dorsalRecibido).trim(),
        "'" + String(telefonoAtleta).trim(),
        "'" + String(refPago).trim(),
        cantM1,
        cantM2,
        cantMedallero,
        "$" + montoTotal,
        agencia,
        "Por Validar"
      ]);

      try {
        MailApp.sendEmail({
          to: correoDestino,
          subject: "🛒 NUEVO PEDIDO TIENDA - " + nombreAtleta + (dorsalRecibido ? " (Dorsal #" + dorsalRecibido + ")" : ""),
          htmlBody: "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;'>" +
                    "<h2 style='color: #001E50;'>🛒 Nuevo Pedido en Tienda Oficial</h2>" +
                    "<p><b>Atleta:</b> " + nombreAtleta + "<br>" +
                    "<b>Cédula:</b> " + cedulaRecibida + "<br>" +
                    "<b>Dorsal:</b> " + (dorsalRecibido || 'No asignado') + "<br>" +
                    "<b>Teléfono:</b> " + telefonoAtleta + "<br>" +
                    "<b>Referencia:</b> " + refPago + "<br>" +
                    "<b>Medalla 1ra Ed. ($5):</b> " + cantM1 + "<br>" +
                    "<b>Medalla 2da Ed. ($5):</b> " + cantM2 + "<br>" +
                    "<b>Porta Medalla ($7):</b> " + cantMedallero + "<br>" +
                    "<b>Total:</b> $" + montoTotal + " USD<br>" +
                    "<b>Modalidad de Envío:</b> " + agencia + "</p>" +
                    "</div>"
        });
      } catch (errEmail) { Logger.log("Error email tienda: " + errEmail); }

      return ContentService.createTextOutput("Éxito").setMimeType(ContentService.MimeType.TEXT);

    // =========================================================================
    // FLUJO 2: ABONOS (Saldar cuentas de 10K)
    // =========================================================================
    } else if (tipoCarrera === 'ABONO') {

      var sheetAbonos = buscarPestana(doc, ['Abonos_10K', 'Abonos', 'Abonos 10K']);
      if (sheetAbonos) {
        var headersAbonos = sheetAbonos.getRange(1, 1, 1, sheetAbonos.getLastColumn()).getValues()[0];
        var nextRowAbonos = sheetAbonos.getLastRow() + 1;
        var newRowAbonos = headersAbonos.map(function(header) {
          if (header === 'FechaRegistro') return new Date();
          return e.parameter[header] || "";
        });
        sheetAbonos.getRange(nextRowAbonos, 1, 1, newRowAbonos.length).setValues([newRowAbonos]);
      }

      var sheetPrincipal = buscarPestana(doc, ['Inscripciones_10K', '10K', 'Inscripciones 10K']);
      if (sheetPrincipal && cedulaRecibida !== '') {
        var data = sheetPrincipal.getDataRange().getValues();
        var headers = data[0];
        var idxCedula = headers.indexOf('Cedula');
        var idxSaldo = headers.indexOf('SaldoPendiente');
        var montoAbonado = parseFloat(String(e.parameter['Total'] || '0').replace(/[^0-9.]/g, '')) || 0;

        for (var i = 1; i < data.length; i++) {
          var cedulaFila = String(data[i][idxCedula]).replace(/\D/g, '').trim();
          var cedulaLimpia = String(cedulaRecibida).replace(/\D/g, '').trim();

          if (cedulaFila === cedulaLimpia) {
            var valorCelda = String(data[i][idxSaldo]);
            if (valorCelda.toUpperCase() === 'SOLVENTE') { break; }
            var match = valorCelda.match(/[\d]+\.?[\d]*/g);
            var saldoActual = 0;
            if (match) { saldoActual = parseFloat(match[match.length - 1]) || 0; }
            var nuevoSaldo = saldoActual - montoAbonado;
            if (nuevoSaldo <= 0) {
              sheetPrincipal.getRange(i + 1, idxSaldo + 1).setValue("SOLVENTE");
            } else {
              sheetPrincipal.getRange(i + 1, idxSaldo + 1).setValue(nuevoSaldo.toFixed(2));
            }
            break;
          }
        }
      }

      try {
        MailApp.sendEmail({
          to: correoDestino,
          subject: "💰 NUEVO ABONO REPORTADO - " + nombreAtleta,
          htmlBody: "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;'>" +
                    "<h2 style='color: #001E50;'>💰 Reporte de Abono Recibido</h2>" +
                    "<p><b>Atleta:</b> " + nombreAtleta + "<br>" +
                    "<b>Cédula:</b> " + cedulaRecibida + "<br>" +
                    "<b>Teléfono:</b> " + telefonoAtleta + "<br>" +
                    "<b>Monto Abonado:</b> " + montoTotal + "<br>" +
                    "<b>Referencia Bancaria:</b> #" + refPago + "<br>" +
                    "<b>Fecha de Pago:</b> " + fechaPago + "</p>" +
                    "<p style='color: #64748b; font-size: 12px;'>Verifica tu Google Sheet para validar el ingreso.</p>" +
                    "</div>"
        });
      } catch (errEmail) { Logger.log("Error email: " + errEmail); }

      return ContentService.createTextOutput("Éxito").setMimeType(ContentService.MimeType.TEXT);

    // =========================================================================
    // FLUJO 3: 3RA EDICIÓN 5K Y COMBO DÚO
    // =========================================================================
    } else if (tipoCarrera === '5K' || tipoCarrera === 'COMBO') {

      var sheet3ra = buscarPestana(doc, ['3ra Edicion', '3ra Edición', '3ra edicion', '3ra edicón']);
      if (!sheet3ra) {
        throw new Error("No se encontró la pestaña '3ra Edicion'");
      }

      var headers3ra = sheet3ra.getRange(1, 1, 1, sheet3ra.getLastColumn()).getValues()[0];
      var idxDorsal3ra = 0;
      
      var ultimoDorsal = 0;
      var data3ra = sheet3ra.getDataRange().getValues();
      for (var i = data3ra.length - 1; i >= 1; i--) {
        var val = String(data3ra[i][idxDorsal3ra]).replace(/\D/g, '').trim();
        if (val !== '' && !isNaN(val)) {
          ultimoDorsal = parseInt(val);
          break;
        }
      }

      var dorsalNuevo = String(ultimoDorsal + 1).padStart(3, '0');
      var nextRow3ra = sheet3ra.getLastRow() + 1;

      var newRow3ra = headers3ra.map(function(header) {
        if (header === 'Dorsal' || header === 'A' || header === '') return "'" + dorsalNuevo;
        if (header === 'FechaRegistro') return new Date();
        return e.parameter[header] || "";
      });

      newRow3ra[0] = "'" + dorsalNuevo;
      sheet3ra.getRange(nextRow3ra, 1, 1, newRow3ra.length).setValues([newRow3ra]);

      if (tipoCarrera === 'COMBO') {
        var sheet4ta = buscarPestana(doc, ['4ta Edicion', '4ta Edición', '4ta edicion']);
        if (sheet4ta) {
          var headers4ta = sheet4ta.getRange(1, 1, 1, sheet4ta.getLastColumn()).getValues()[0];
          var nextRow4ta = sheet4ta.getLastRow() + 1;
          var newRow4ta = headers4ta.map(function(header) {
            if (header === 'FechaRegistro') return new Date();
            return e.parameter[header] || "";
          });
          newRow4ta[0] = "'" + dorsalNuevo;
          sheet4ta.getRange(nextRow4ta, 1, 1, newRow4ta.length).setValues([newRow4ta]);
        }
      }

      var esCombo = (tipoCarrera === 'COMBO');
      var asuntoEmail = esCombo 
        ? "💥 NUEVO COMBO DÚO (3ra + 4ta) - Dorsal #" + dorsalNuevo + " - " + nombreAtleta 
        : "🏃 NUEVA INSCRIPCIÓN 3RA EDICIÓN - Dorsal #" + dorsalNuevo + " - " + nombreAtleta;

      try {
        MailApp.sendEmail({
          to: correoDestino,
          subject: asuntoEmail,
          htmlBody: "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;'>" +
                    "<h2 style='color: #001E50;'>🏃 ¡Nueva Inscripción Recibida!</h2>" +
                    "<p style='font-size: 16px; color: #00D2FF; font-weight: bold;'>Dorsal Asignado: #" + dorsalNuevo + "</p>" +
                    "<p><b>Modalidad:</b> " + (esCombo ? '🔥 COMBO DÚO (3ra + 4ta Edición)' : '3ra Edición 5K') + "<br>" +
                    "<b>Atleta:</b> " + nombreAtleta + "<br>" +
                    "<b>Cédula:</b> " + cedulaRecibida + "<br>" +
                    "<b>Género:</b> " + genero + "<br>" +
                    "<b>Teléfono:</b> " + telefonoAtleta + "<br>" +
                    "<b>Monto Reportado:</b> " + montoTotal + "<br>" +
                    "<b>N° Referencia:</b> #" + refPago + "<br>" +
                    "<b>Fecha de Pago:</b> " + fechaPago + "</p>" +
                    "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;'>" +
                    "<p><b>Logística de Envío:</b><br>" +
                    "• <b>Estado:</b> " + estado + "<br>" +
                    "• <b>Ciudad:</b> " + ciudad + "<br>" +
                    "• <b>Agencia:</b> " + agencia + "<br>" +
                    "• <b>Dirección / Sucursal:</b> " + direccion + "</p>" +
                    "</div>"
        });
      } catch (errEmail) { Logger.log("Error email: " + errEmail); }

      return ContentService.createTextOutput(dorsalNuevo).setMimeType(ContentService.MimeType.TEXT);

    // =========================================================================
    // FLUJO 4: EDICIÓN ESPECIAL 10K
    // =========================================================================
    } else if (tipoCarrera === '10K' || tipoCarrera === '') {

      var sheet10k = buscarPestana(doc, ['Inscripciones_10K', '10K', 'Inscripciones 10K']);
      if (!sheet10k) {
        throw new Error("No se encontró la pestaña 'Inscripciones_10K'");
      }

      var totalInscritos10K = sheet10k.getLastRow() - 1; 
      var dorsalNuevo10K = String(totalInscritos10K + 1).padStart(3, '0');
      var headers = sheet10k.getRange(1, 1, 1, sheet10k.getLastColumn()).getValues()[0];
      var nextRow = sheet10k.getLastRow() + 1;
      var newRow = headers.map(function(header) {
        if (header === 'FechaRegistro') return new Date();
        else if (header === 'Dorsal') return "'" + dorsalNuevo10K; 
        return e.parameter[header] || "";
      });
      sheet10k.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

      try {
        MailApp.sendEmail({
          to: correoDestino,
          subject: "🏅 NUEVA INSCRIPCIÓN 10K - Dorsal #" + dorsalNuevo10K + " - " + nombreAtleta,
          htmlBody: "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;'>" +
                    "<h2 style='color: #001E50;'>🏅 ¡Nuevo Registro Edición Especial 10K!</h2>" +
                    "<p style='font-size: 16px; color: #00D2FF; font-weight: bold;'>Dorsal Asignado: #" + dorsalNuevo10K + "</p>" +
                    "<p><b>Nombre:</b> " + nombreAtleta + "<br>" +
                    "<b>Cédula:</b> " + cedulaRecibida + "<br>" +
                    "<b>Teléfono:</b> " + telefonoAtleta + "<br>" +
                    "<b>Monto Reportado:</b> " + montoTotal + "<br>" +
                    "<b>N° Referencia:</b> #" + refPago + "<br>" +
                    "<b>Fecha de Pago:</b> " + fechaPago + "<br>" +
                    "<b>Prenda y Talla:</b> " + (e.parameter['Textil10K'] || 'N/A') + "<br>" +
                    "<b>Estatus Reserva:</b> " + (e.parameter['Reserva10K'] || 'N/A') + "<br>" +
                    "<b>Saldo Pendiente:</b> $" + (e.parameter['SaldoPendiente'] || '0.00') + "</p>" +
                    "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;'>" +
                    "<p><b>Logística de Envío:</b><br>" +
                    "• <b>Estado:</b> " + estado + "<br>" +
                    "• <b>Ciudad:</b> " + ciudad + "<br>" +
                    "• <b>Agencia:</b> " + agencia + "<br>" +
                    "• <b>Dirección / Sucursal:</b> " + direccion + "</p>" +
                    "</div>"
        });
      } catch (errEmail) { Logger.log("Error email: " + errEmail); }

      return ContentService.createTextOutput(dorsalNuevo10K).setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService.createTextOutput("Acción no reconocida").setMimeType(ContentService.MimeType.TEXT);
  }
  catch (error) {
    return ContentService.createTextOutput("Error: " + error.message).setMimeType(ContentService.MimeType.TEXT);
  }
  finally {
    lock.releaseLock();
  }
}
