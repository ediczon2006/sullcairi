/**
 * ============================================================================
 * MOTOR DE EXPORTACIÓN E IMPORTACIÓN EMPRESARIAL DE EXCEL (js/export.js)
 * Manejador robusto para leer y generar hojas de cálculo .xlsx / .csv
 * ============================================================================
 */

const Exporter = (() => {

  // 1. EXPORTAR Y SACAR TODA LA INFORMACIÓN A EXCEL (.XLSX)
  function exportarExcel() {
    const state = Store.getState();
    const vales = state.vales;

    if (!vales || vales.length === 0) {
      alert("No hay registros de vales para exportar.");
      return;
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const nombreEmpresa = (state.empresa || "Estacion_Jesus").replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Vales_${nombreEmpresa}_${fechaHoy}.xlsx`;

    const filas = vales.map((v, i) => ({
      "ITEM": i + 1,
      "FECHA": v.fecha,
      "TURNO": v.turno,
      "N° VALE": v.n_vale,
      "CLIENTE / EMPRESA": v.cliente,
      "SEDE OPERATIVA": "jesus_de_lauricocha_huanuco",
      "WHATSAPP / TEL": v.telefono || "-",
      "PLACA": v.placa,
      "CONDUCTOR": v.conductor,
      "PRODUCTO": v.producto,
      "CANTIDAD (GLN)": Number(v.cantidad).toFixed(2),
      "PRECIO (S/)": Number(v.precio).toFixed(2),
      "TOTAL (S/)": Number(v.total).toFixed(2),
      "GRIFERO / PERSONAL": v.grifero,
      "ESTADO": v.estado,
      "OBSERVACIONES": v.observacion || ""
    }));

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vales_Combustible");

      ws['!cols'] = [
        { wch: 6 },  { wch: 12 }, { wch: 14 }, { wch: 10 },
        { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 12 },
        { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 14 },
        { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 28 }
      ];
      XLSX.writeFile(wb, filename);
    } else {
      exportarCSV(filas, filename.replace('.xlsx', '.csv'));
    }
  }

  // 2. DESCARGAR PLANTILLA OFICIAL DE EXCEL
  function descargarPlantillaExcel() {
    const plantilla = [
      {
        "FECHA": "2026-09-21",
        "TURNO": "T1 (Mañana)",
        "N° VALE": 450,
        "CLIENTE": "MUNICIPALIDAD JESUS",
        "SEDE": "jesus_de_lauricocha_huanuco",
        "WHATSAPP": "962334455",
        "PLACA": "EGA-512",
        "CONDUCTOR": "Carlos Martel",
        "PRODUCTO": "DIESEL B5-S50",
        "CANTIDAD": 25.0,
        "PRECIO": 16.80,
        "GRIFERO": "YANET",
        "ESTADO": "PENDIENTE",
        "OBSERVACIONES": "Camioneta de Serenazgo"
      },
      {
        "FECHA": "2026-09-21",
        "TURNO": "T1 (Mañana)",
        "N° VALE": 451,
        "CLIENTE": "RED DE SALUD",
        "SEDE": "jesus_de_lauricocha_huanuco",
        "WHATSAPP": "962778899",
        "PLACA": "H1B-740",
        "CONDUCTOR": "Manuel Alvarado",
        "PRODUCTO": "GASOHOL PREMIUM",
        "CANTIDAD": 12.0,
        "PRECIO": 19.50,
        "GRIFERO": "CRESILDO",
        "ESTADO": "FACTURADO",
        "OBSERVACIONES": "Ambulancia"
      },
      {
        "FECHA": "2026-09-21",
        "TURNO": "T2 (Tarde)",
        "N° VALE": 452,
        "CLIENTE": "UGEL",
        "SEDE": "jesus_de_lauricocha_huanuco",
        "WHATSAPP": "981223344",
        "PLACA": "B9K-114",
        "CONDUCTOR": "Jorge Rojas",
        "PRODUCTO": "GASOHOL REGULAR",
        "CANTIDAD": 10.0,
        "PRECIO": 17.20,
        "GRIFERO": "YAMILEX",
        "ESTADO": "PENDIENTE",
        "OBSERVACIONES": "Supervisión colegios"
      }
    ];

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(plantilla);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Carga");
      ws['!cols'] = [
        { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 28 },
        { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 20 },
        { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
        { wch: 14 }, { wch: 28 }
      ];
      XLSX.writeFile(wb, "Plantilla_Vales_Oficial.xlsx");
    } else {
      exportarCSV(plantilla, "Plantilla_Vales_Oficial.csv");
    }
  }

  // 3. LEER Y PROCESAR ARCHIVO EXCEL/CSV SUBIDO
  function procesarArchivoExcel(file, onResultado) {
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      onResultado({ ok: false, error: "Librería XLSX no inicializada en el navegador." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // 1. Detectar inteligentemente en qué fila inician los encabezados (si hay títulos, logos o banners superiores)
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(matrix.length, 15); r++) {
          const rowVals = Array.isArray(matrix[r]) ? matrix[r].map(cell => String(cell || '').toUpperCase()) : [];
          const hasVale = rowVals.some(c => c.includes('VALE') || c === 'N' || c === 'ITEM');
          const hasCliente = rowVals.some(c => c.includes('CLIENTE') || c.includes('EMPRESA') || c.includes('RAZON'));
          const hasComb = rowVals.some(c => c.includes('PRODUCTO') || c.includes('CONCEPTO') || c.includes('COMBUSTIBLE') || c.includes('GALON') || c.includes('CANTIDAD'));
          if ((hasVale && hasCliente) || (hasVale && hasComb) || (hasCliente && hasComb)) {
            headerRowIndex = r;
            break;
          }
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" });

        if (!rows || rows.length === 0) {
          onResultado({ ok: false, error: "El archivo no contiene filas de datos o la tabla está vacía." });
          return;
        }

        const valesValidos = [];
        const errores = [];

        // Helper de parseo numérico flexible (soporta comas y puntos de miles/decimales)
        const parsearNumeroFlexible = (val) => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          let str = String(val).trim().replace(/S\/|\$|\s/gi, '');
          if (!str) return 0;
          if (str.includes(',') && str.includes('.')) {
            if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
              str = str.replace(/\./g, '').replace(',', '.');
            } else {
              str = str.replace(/,/g, '');
            }
          } else if (str.includes(',')) {
            str = str.replace(',', '.');
          }
          const num = parseFloat(str);
          return isNaN(num) ? 0 : Math.round(num * 100) / 100;
        };

        const statePrecios = (typeof Store !== 'undefined' && Store.getState().precios) ? Store.getState().precios : {
          "DIESEL B5-S50": 16.80,
          "GASOHOL PREMIUM": 19.50,
          "GASOHOL REGULAR": 17.20
        };

        rows.forEach((r, idx) => {
          const numFila = idx + 2;

          // Normalizar llaves del objeto a mayúsculas sin espacios
          const rowNorm = {};
          Object.keys(r).forEach(k => {
            const cleanKey = k.toUpperCase().trim()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^A-Z0-9]/g, "");
            rowNorm[cleanKey] = r[k];
          });

          // 1. N° Vale
          let nValeRaw = (
            rowNorm["NVALE"] || rowNorm["VALE"] || rowNorm["NUMEROVALE"] ||
            rowNorm["NROVALE"] || rowNorm["VALENRO"] || rowNorm["NUMERO"] ||
            rowNorm["N"] || rowNorm["ITEM"] || rowNorm["A"]
          );
          let nVale = parseInt(nValeRaw, 10);
          if (isNaN(nVale) || nVale <= 0) {
            // Si no tiene N° de vale pero sí tiene producto/cantidad, autogenerar
            let tieneProducto = rowNorm["PRODUCTO"] || rowNorm["CONCEPTOPRODUCTO"] || rowNorm["CONCEPTO"] || rowNorm["COMBUSTIBLE"];
            let tieneCantidad = rowNorm["CANTIDAD"] || rowNorm["CANTIDADGLN"] || rowNorm["GALONES"];
            if (tieneProducto || tieneCantidad) {
              nVale = 90000 + idx; // Autogenerar número temporal
            } else {
              return; // Fila completamente vacía, saltar
            }
          }

          // 2. Fecha (Soporte para números seriales Excel, objetos Date y strings DD/MM/YYYY)
          let fechaRaw = rowNorm["FECHA"] || rowNorm["FECHADESPACHO"] || new Date();
          let fecha = "";
          if (typeof fechaRaw === 'number') {
            if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
              const dInfo = XLSX.SSF.parse_date_code(fechaRaw);
              if (dInfo) {
                const y = String(dInfo.y).padStart(4, '0');
                const m = String(dInfo.m).padStart(2, '0');
                const d = String(dInfo.d).padStart(2, '0');
                fecha = `${y}-${m}-${d}`;
              }
            }
            if (!fecha) {
              const parsedDate = new Date((fechaRaw - (25567 + 2)) * 86400 * 1000);
              fecha = parsedDate.toISOString().split('T')[0];
            }
          } else if (fechaRaw instanceof Date && !isNaN(fechaRaw.getTime())) {
            const anio = fechaRaw.getUTCFullYear();
            const mes = String(fechaRaw.getUTCMonth() + 1).padStart(2, '0');
            const dia = String(fechaRaw.getUTCDate()).padStart(2, '0');
            fecha = `${anio}-${mes}-${dia}`;
          } else if (typeof fechaRaw === 'string') {
            const cleanF = fechaRaw.trim();
            if (cleanF.includes('/')) {
              const p = cleanF.split('/');
              if (p.length === 3) {
                const anio = (p[2].length === 4) ? p[2] : `20${p[2]}`;
                fecha = `${anio}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
              }
            } else if (cleanF.includes('-')) {
              const p = cleanF.split('-');
              if (p.length === 3) {
                if (p[0].length === 4) {
                  fecha = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
                } else {
                  const anio = (p[2].length === 4) ? p[2] : `20${p[2]}`;
                  fecha = `${anio}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                }
              }
            }
          }
          if (!fecha || fecha.includes('NaN')) {
            fecha = new Date().toISOString().split('T')[0];
          }

          // 3. Cliente / Razón Social
          let clienteRaw = String(rowNorm["CLIENTE"] || rowNorm["CLIENTEEMPRESA"] || rowNorm["EMPRESA"] || rowNorm["RAZONSOCIAL"] || "-").trim();
          let cliente = clienteRaw.toUpperCase();
          if (cliente === "-" || cliente === "") cliente = "VENTA DIARIA";

          // 4. Sede Operativa Fija
          let lugar = "jesus_de_lauricocha_huanuco";

          // 5. Teléfono
          let telefono = String(rowNorm["WHATSAPP"] || rowNorm["TELEFONO"] || rowNorm["CELULAR"] || rowNorm["WHATSAPPTEL"] || "").trim();

          // 6. Placa
          let placa = String(rowNorm["PLACA"] || rowNorm["PLACAVEHICULO"] || rowNorm["PLACAVEHICULAR"] || rowNorm["VEHICULO"] || "-").trim().toUpperCase();

          // 7. Conductor
          let conductor = String(rowNorm["CONDUCTOR"] || rowNorm["CHOFER"] || rowNorm["RESPONSABLE"] || "-").trim();

          // 8. Producto (soporta: PRODUCTO, CONCEPTO, CONCEPTO (PRODUCTO), COMBUSTIBLE)
          let prodRaw = String(
            rowNorm["PRODUCTO"] || rowNorm["CONCEPTOPRODUCTO"] || rowNorm["CONCEPTO"] ||
            rowNorm["COMBUSTIBLE"] || rowNorm["TIPOCOMBUSTIBLE"] || ""
          ).toUpperCase().trim();

          // Si la fila no tiene producto ni cantidad, es una fila vacía → saltar
          let cantidadPrecheck = parsearNumeroFlexible(rowNorm["CANTIDAD"] || rowNorm["CANTIDADGLN"] || rowNorm["GALONES"] || rowNorm["GLN"]);
          if (!prodRaw && cantidadPrecheck <= 0) {
            return; // Fila vacía (filas rojas del Excel), se omite
          }

          let producto = "DIESEL B5-S50";
          if (prodRaw.includes("PREMIUM") || prodRaw.includes("PREMIUN") || prodRaw.includes("PREMIU")) {
            producto = "GASOHOL PREMIUM";
          } else if (prodRaw.includes("REGULAR")) {
            producto = "GASOHOL REGULAR";
          } else if (prodRaw.includes("DIESEL") || prodRaw.includes("DIESE") || prodRaw.includes("DB5")) {
            producto = "DIESEL B5-S50";
          }

          // 9. Cantidad y Precio con parser flexible universal
          let cantidad = parsearNumeroFlexible(rowNorm["CANTIDAD"] || rowNorm["CANTIDADGLN"] || rowNorm["GALONES"] || rowNorm["GLN"]);
          let precio = parsearNumeroFlexible(rowNorm["PRECIO"] || rowNorm["PRECIOS"] || rowNorm["PRECIOUNITARIO"] || rowNorm["PU"]);

          // Si el precio viene en 0, autocompletar dinámicamente según tarifas oficiales configuradas
          if (precio <= 0) {
            precio = statePrecios[producto] || 16.80;
          }

          let total = parsearNumeroFlexible(rowNorm["TOTAL"] || rowNorm["TOTALSOLES"] || rowNorm["IMPORTE"] || (cantidad * precio));
          if (total <= 0) total = Math.round(cantidad * precio * 100) / 100;

          // 10. Turno y Grifero
          let turno = String(rowNorm["TURNO"] || "T1 (Mañana)").trim();
          let grifero = String(rowNorm["GRIFEROPERSONAL"] || rowNorm["GRIFERO"] || rowNorm["PERSONAL"] || rowNorm["BOMBERO"] || "YANET").trim().toUpperCase();

          // 11. Estado
          let estadoRaw = String(rowNorm["ESTADO"] || "PENDIENTE").toUpperCase().trim();
          let estado = "PENDIENTE";
          if (estadoRaw.includes("FACT") || estadoRaw.includes("PAG") || estadoRaw.includes("COBR")) {
            estado = "FACTURADO";
          } else if (estadoRaw.includes("ANUL")) {
            estado = "ANULADO";
          }

          // 12. Observación + capturar columnas extra del Excel (compra, consumo, diferencia)
          let observacion = String(rowNorm["OBSERVACIONES"] || rowNorm["OBSERVACION"] || rowNorm["NOTA"] || rowNorm["NOTAS"] || "").trim();

          // Capturar datos extras de inventario si existen en el Excel
          let compraPremiun = parsearNumeroFlexible(rowNorm["COMPRAPREMIUN"] || rowNorm["COMPRAPREMIUM"] || rowNorm["COMPRAGASOHOL"]);
          let compraDiesel = parsearNumeroFlexible(rowNorm["COMPRADIESEL"]);
          let consumoPremiun = parsearNumeroFlexible(rowNorm["CONSUMOPREMIUN"] || rowNorm["CONSUMOPREMIUM"]);
          let consumoDiesel = parsearNumeroFlexible(rowNorm["CONSUMODIESEL"]);
          let diferencia = parsearNumeroFlexible(rowNorm["DIFERENCIA"]);

          // Agregar info extra a observaciones si existe
          const extras = [];
          if (compraPremiun > 0) extras.push(`Compra Premium: ${compraPremiun}`);
          if (compraDiesel > 0) extras.push(`Compra Diesel: ${compraDiesel}`);
          if (consumoPremiun > 0) extras.push(`Consumo Premium: ${consumoPremiun}`);
          if (consumoDiesel > 0) extras.push(`Consumo Diesel: ${consumoDiesel}`);
          if (diferencia !== 0) extras.push(`Diferencia: ${diferencia}`);
          if (extras.length > 0) {
            observacion = observacion ? (observacion + " | " + extras.join(", ")) : extras.join(", ");
          }

          valesValidos.push({
            id: Date.now() + idx + Math.floor(Math.random() * 1000),
            fecha,
            n_vale: nVale,
            turno,
            cliente,
            lugar,
            telefono,
            placa,
            conductor,
            producto,
            cantidad,
            precio,
            total,
            grifero,
            estado,
            observacion
          });
        });

        onResultado({
          ok: true,
          totalFilas: rows.length,
          valesValidos,
          errores
        });

      } catch (err) {
        onResultado({ ok: false, error: "Error de lectura de archivo: " + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function exportarCSV(filas, filename) {
    if (filas.length === 0) return;
    const cabeceras = Object.keys(filas[0]);
    const lineas = [cabeceras.join(";")];

    filas.forEach(row => {
      const valores = cabeceras.map(col => {
        let val = row[col] !== undefined ? String(row[col]) : "";
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      });
      lineas.push(valores.join(";"));
    });

    const csvContent = "\uFEFF" + lineas.join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  return {
    exportarExcel,
    descargarPlantillaExcel,
    procesarArchivoExcel,
    exportarCSV
  };
})();
