/**
 * ============================================================================
 * MOTOR DE EXPORTACIÓN E IMPORTACIÓN EMPRESARIAL DE EXCEL (js/export.js)
 * ============================================================================
 */

const Exporter = (() => {

  // 1. DESCARGAR EXCEL COMPLETO
  function exportarExcel() {
    const state = Store.getState();
    const vales = state.vales;

    if (!vales || vales.length === 0) {
      alert("No hay registros de vales para exportar.");
      return;
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const nombreEmpresa = (state.empresa || "Estacion_Servicios").replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Reporte_Vales_${nombreEmpresa}_${fechaHoy}.xlsx`;

    const filas = vales.map((v, i) => ({
      "ITEM": i + 1,
      "FECHA": v.fecha,
      "TURNO": v.turno,
      "N° VALE": v.n_vale,
      "CLIENTE / EMPRESA": v.cliente,
      "LUGAR / SEDE": v.lugar || "Principal",
      "WHATSAPP / TEL": v.telefono || "-",
      "PLACA": v.placa,
      "CONDUCTOR": v.conductor,
      "PRODUCTO": v.producto,
      "CANTIDAD (GLN)": v.cantidad,
      "PRECIO (S/)": v.precio,
      "TOTAL (S/)": v.total,
      "GRIFERO": v.grifero,
      "ESTADO": v.estado,
      "OBSERVACIONES": v.observacion || ""
    }));

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vales");

      ws['!cols'] = [
        { wch: 6 },  { wch: 12 }, { wch: 14 }, { wch: 10 },
        { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
        { wch: 20 }, { wch: 14 }, { wch: 15 }, { wch: 14 },
        { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 25 }
      ];
      XLSX.writeFile(wb, filename);
    } else {
      exportarCSV(filas, filename.replace('.xlsx', '.csv'));
    }
  }

  // 2. DESCARGAR PLANTILLA LIMPIA DE EXCEL PARA IMPORTACIÓN
  function descargarPlantillaExcel() {
    const plantilla = [
      {
        "FECHA": "2026-09-20",
        "TURNO": "T1 (Mañana)",
        "N° VALE": 501,
        "CLIENTE": "Transportes del Pacífico S.A.C.",
        "LUGAR / SEDE": "Sede Lima",
        "WHATSAPP": "987654321",
        "PLACA": "B7X-912",
        "CONDUCTOR": "Juan Gómez",
        "PRODUCTO": "DIESEL B5",
        "CANTIDAD": 15.5,
        "PRECIO": 16.80,
        "GRIFERO": "Isla 01 - Pedro",
        "ESTADO": "PENDIENTE",
        "OBSERVACIONES": "Factura quincenal"
      },
      {
        "FECHA": "2026-09-20",
        "TURNO": "T2 (Tarde)",
        "N° VALE": 502,
        "CLIENTE": "Constructora Horizonte",
        "LUGAR / SEDE": "Cantera Sur",
        "WHATSAPP": "951234567",
        "PLACA": "C3F-102",
        "CONDUCTOR": "Manuel Silva",
        "PRODUCTO": "PREMIUM",
        "CANTIDAD": 8.0,
        "PRECIO": 19.50,
        "GRIFERO": "Isla 02 - Mario",
        "ESTADO": "PENDIENTE",
        "OBSERVACIONES": ""
      }
    ];

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(plantilla);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Vales");
      ws['!cols'] = [
        { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 30 },
        { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 20 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
        { wch: 14 }, { wch: 24 }
      ];
      XLSX.writeFile(wb, "Plantilla_Importar_Vales.xlsx");
    } else {
      exportarCSV(plantilla, "Plantilla_Importar_Vales.csv");
    }
  }

  // 3. PROCESAR Y LEER ARCHIVO EXCEL/CSV SUBIDO
  function procesarArchivoExcel(file, onResultado) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!json || json.length === 0) {
          onResultado({ ok: false, error: "El archivo está vacío o no tiene filas válidas." });
          return;
        }

        // Mapeo flexible de encabezados
        const valesMapeados = [];
        const errores = [];

        json.forEach((row, i) => {
          const numFila = i + 2;

          // Buscar columna de N° Vale
          const n_vale_raw = row["N° VALE"] || row["N VALE"] || row["VALE"] || row["NUMERO VALE"] || row["NRO VALE"] || row["n_vale"];
          const n_vale = parseInt(n_vale_raw);

          if (isNaN(n_vale)) {
            errores.push(`Fila ${numFila}: N° de Vale inválido o vacío.`);
            return;
          }

          // Fecha
          let fecha = row["FECHA"] || row["fecha"] || new Date().toISOString().split('T')[0];
          if (fecha instanceof Date) {
            fecha = fecha.toISOString().split('T')[0];
          } else if (typeof fecha === 'string' && fecha.includes('/')) {
            const p = fecha.split('/');
            if (p.length === 3) fecha = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
          }

          const cliente = String(row["CLIENTE"] || row["CLIENTE / EMPRESA"] || row["EMPRESA"] || row["RAZON SOCIAL"] || "-").trim();
          const lugar = String(row["LUGAR / SEDE"] || row["LUGAR"] || row["SEDE"] || row["ZONA"] || "Principal").trim();
          const telefono = String(row["WHATSAPP"] || row["TELEFONO"] || row["CELULAR"] || row["WHATSAPP / TEL"] || "").trim();
          const placa = String(row["PLACA"] || row["PLACA VEHICULAR"] || "-").trim().toUpperCase();
          const conductor = String(row["CONDUCTOR"] || row["CHOFER"] || "-").trim();

          // Producto
          let producto = String(row["PRODUCTO"] || row["COMBUSTIBLE"] || "PREMIUM").toUpperCase().trim();
          if (producto.includes("DIESEL") || producto.includes("DB5") || producto.includes("B5")) producto = "DIESEL B5";
          else if (producto.includes("PREMIUM")) producto = "PREMIUM";
          else if (producto.includes("REGULAR")) producto = "REGULAR";
          else if (producto.includes("GLP")) producto = "GLP";

          const cantidad = parseFloat(row["CANTIDAD"] || row["CANTIDAD (GLN)"] || row["GALONES"] || 0) || 0;
          const precio = parseFloat(row["PRECIO"] || row["PRECIO (S/)"] || row["P.U."] || 0) || 0;
          const total = Math.round(cantidad * precio * 100) / 100;

          const turno = String(row["TURNO"] || "T1 (Mañana)").trim();
          const grifero = String(row["GRIFERO"] || row["BOMBERO"] || "Isla 01").trim();

          let estado = String(row["ESTADO"] || "PENDIENTE").toUpperCase().trim();
          if (!["PENDIENTE", "FACTURADO", "ANULADO"].includes(estado)) estado = "PENDIENTE";

          const observacion = String(row["OBSERVACIONES"] || row["OBSERVACION"] || "").trim();

          valesMapeados.push({
            id: Date.now() + i,
            fecha,
            n_vale,
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
          totalFilas: json.length,
          valesValidos: valesMapeados,
          errores
        });

      } catch (err) {
        onResultado({ ok: false, error: "Error al procesar el archivo Excel: " + err.message });
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

  function descargarBackupJSON() {
    const state = Store.getState();
    const str = JSON.stringify(state, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_grifo_${timestamp}.json`;
    link.click();
  }

  return {
    exportarExcel,
    descargarPlantillaExcel,
    procesarArchivoExcel,
    descargarBackupJSON
  };
})();
