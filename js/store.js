/**
 * ============================================================================
 * STORE CENTRALIZADO - ESTACIÓN DE SERVICIOS JESÚS
 * Gestión de 3 Tanques (Sin GLP) y Panel de Movimientos Diarios (Día, Fecha, Año, Cantidad, Tipo)
 * ============================================================================
 */

const Store = (() => {
  const CLIENTES_OFICIALES = [
    "UGEL",
    "RED DE SALUD",
    "FISCALIA",
    "IVP",
    "AGRORURAL",
    "AGENCIA AGRARIA",
    "MUNICIPALIDAD JESUS",
    "CONSORCIO VIAL JESUS",
    "GRUPO MONTERRICO",
    "VENTA DIARIA"
  ];

  const PERSONAL_OFICIAL = [
    "YANET",
    "CRESILDO",
    "YAMILEX",
    "OTROS"
  ];

  const TANQUES_OFICIALES = {
    "DIESEL B5-S50": {
      capacidad: 3000,
      stock: 2150,
      alerta_naranja: 500,
      alerta_roja: 250,
      unidad: "Gln"
    },
    "GASOHOL PREMIUM": {
      capacidad: 1500,
      stock: 1100,
      alerta_naranja: 500,
      alerta_roja: 250,
      unidad: "Gln"
    },
    "GASOHOL REGULAR": {
      capacidad: 1500,
      stock: 980,
      alerta_naranja: 500,
      alerta_roja: 250,
      unidad: "Gln"
    }
  };

  const SEDE_ESTATICA = "jesus_de_lauricocha_huanuco";

  const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  let state = {
    empresa: "ESTACIÓN DE SERVICIOS SULLCAIRI",
    ruc: "20608945123",
    direccion: SEDE_ESTATICA,
    telefono: "962123456",
    precios: {
      "DIESEL B5-S50": 16.80,
      "GASOHOL PREMIUM": 19.50,
      "GASOHOL REGULAR": 17.20
    },
    tanques: JSON.parse(JSON.stringify(TANQUES_OFICIALES)),
    clientes: [...CLIENTES_OFICIALES],
    personal: [...PERSONAL_OFICIAL],
    lugares: [SEDE_ESTATICA],
    movimientos_tanque: [
      {
        id: 1,
        dia: "Lunes",
        fecha: "15/09",
        anio: 2026,
        fecha_completa: "2026-09-15",
        tipo: "DIESEL B5-S50",
        cantidad: 25.0,
        operacion: "Despacho Vale #401",
        cliente: "MUNICIPALIDAD JESUS",
        stock_resultante: 2150
      },
      {
        id: 2,
        dia: "Lunes",
        fecha: "15/09",
        anio: 2026,
        fecha_completa: "2026-09-15",
        tipo: "GASOHOL PREMIUM",
        cantidad: 12.0,
        operacion: "Despacho Vale #402",
        cliente: "RED DE SALUD",
        stock_resultante: 1100
      },
      {
        id: 3,
        dia: "Martes",
        fecha: "16/09",
        anio: 2026,
        fecha_completa: "2026-09-16",
        tipo: "GASOHOL REGULAR",
        cantidad: 10.0,
        operacion: "Despacho Vale #403",
        cliente: "UGEL",
        stock_resultante: 980
      }
    ],
    vales: []
  };

  const listeners = [];

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function notify() {
    listeners.forEach(fn => fn(getState()));
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function descomponerFecha(fStr) {
    let dObj = null;
    if (fStr) {
      if (typeof fStr === 'string') {
        const clean = fStr.trim();
        if (clean.includes('-')) {
          const parts = clean.split('-');
          if (parts.length >= 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
              dObj = new Date(y, m, d);
            }
          }
        } else if (clean.includes('/')) {
          const parts = clean.split('/');
          if (parts.length >= 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const y = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
              dObj = new Date(y, m, d);
            }
          }
        }
      } else if (fStr instanceof Date && !isNaN(fStr.getTime())) {
        dObj = fStr;
      }
    }
    if (!dObj || isNaN(dObj.getTime())) {
      dObj = new Date();
    }

    const diaSemana = DIAS_SEMANA[dObj.getDay()] || "Lunes";
    const diaNum = String(dObj.getDate()).padStart(2, '0');
    const mesNum = String(dObj.getMonth() + 1).padStart(2, '0');
    const anioNum = dObj.getFullYear();

    return {
      dia: diaSemana,
      fecha: `${diaNum}/${mesNum}`,
      anio: anioNum,
      fecha_completa: `${anioNum}-${mesNum}-${diaNum}`
    };
  }

  async function init() {
    // 1. Siempre cargar desde localStorage primero (datos del dispositivo)
    const local = localStorage.getItem('grifo_erp_jesus_state');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.vales)) state.vales = parsed.vales;
          if (parsed.empresa) state.empresa = parsed.empresa;
          if (parsed.ruc) state.ruc = parsed.ruc;
          state.direccion = SEDE_ESTATICA;
          if (parsed.precios) state.precios = { ...state.precios, ...parsed.precios };
          if (parsed.tanques) state.tanques = { ...state.tanques, ...parsed.tanques };
          if (Array.isArray(parsed.clientes)) state.clientes = parsed.clientes;
          if (Array.isArray(parsed.personal)) state.personal = parsed.personal;
          state.lugares = [SEDE_ESTATICA];
          if (Array.isArray(parsed.movimientos_tanque)) state.movimientos_tanque = parsed.movimientos_tanque;
        }
      } catch (e) {}
    }

    // 2. Intentar sincronizar con servidor (opcional, no bloquea)
    try {
      const res = await fetch('/api/datos', { cache: 'no-store' });
      if (res.ok) {
        const remote = await res.json();
        if (remote && Array.isArray(remote.vales) && remote.vales.length > state.vales.length) {
          // Solo sobrescribir si el servidor tiene más datos
          if (Array.isArray(remote.vales)) state.vales = remote.vales;
          if (remote.empresa) state.empresa = remote.empresa;
          if (remote.ruc) state.ruc = remote.ruc;
          state.direccion = SEDE_ESTATICA;
          if (remote.precios) state.precios = { ...state.precios, ...remote.precios };
          if (remote.tanques) state.tanques = { ...state.tanques, ...remote.tanques };
          if (Array.isArray(remote.clientes)) state.clientes = remote.clientes;
          if (Array.isArray(remote.personal)) state.personal = remote.personal;
          state.lugares = [SEDE_ESTATICA];
          if (Array.isArray(remote.movimientos_tanque)) state.movimientos_tanque = remote.movimientos_tanque;
        }
      }
    } catch (e) {
      // Sin servidor disponible (GitHub Pages) → funciona 100% local
    }

    saveLocal();
    notify();
  }

  function saveLocal() {
    try {
      localStorage.setItem('grifo_erp_jesus_state', JSON.stringify(state));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e.message);
    }
  }

  async function persist() {
    saveLocal();
    notify();
    // Intentar sincronizar con servidor (si existe), sin bloquear
    try {
      await fetch('/api/datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (e) {
      // Sin servidor → datos ya guardados en localStorage
    }
  }

  // REGISTRO DE VALE + ACTUALIZACIÓN DE STOCK Y PANEL DIARIO
  async function agregarVale(vale) {
    vale.lugar = SEDE_ESTATICA;
    state.vales.unshift(vale);
    registrarNuevoClienteSiNoExiste(vale.cliente);
    registrarNuevoPersonalSiNoExiste(vale.grifero);

    // Descontar del stock del tanque si no está anulado
    if (vale.estado !== "ANULADO" && state.tanques[vale.producto]) {
      const cant = Number(vale.cantidad) || 0;
      state.tanques[vale.producto].stock = Math.max(0, Math.round((state.tanques[vale.producto].stock - cant) * 100) / 100);

      // Registrar movimiento en el panel de auditoría diaria
      const fInfo = descomponerFecha(vale.fecha);
      state.movimientos_tanque.unshift({
        id: Date.now(),
        dia: fInfo.dia,
        fecha: fInfo.fecha,
        anio: fInfo.anio,
        fecha_completa: fInfo.fecha_completa,
        tipo: vale.producto,
        cantidad: cant,
        operacion: `Despacho Vale #${vale.n_vale}`,
        cliente: vale.cliente,
        stock_resultante: state.tanques[vale.producto].stock
      });
    }

    await persist();
  }

  async function actualizarVale(id, valeActualizado) {
    const idx = state.vales.findIndex(v => v.id === id);
    if (idx !== -1) {
      const valePrevio = state.vales[idx];

      // Revertir stock previo si no estaba anulado
      if (valePrevio.estado !== "ANULADO" && state.tanques[valePrevio.producto]) {
        state.tanques[valePrevio.producto].stock += (Number(valePrevio.cantidad) || 0);
      }

      // Aplicar nuevo stock
      if (valeActualizado.estado !== "ANULADO" && state.tanques[valeActualizado.producto]) {
        const cant = Number(valeActualizado.cantidad) || 0;
        state.tanques[valeActualizado.producto].stock = Math.max(0, Math.round((state.tanques[valeActualizado.producto].stock - cant) * 100) / 100);

        // Movimiento diario
        const fInfo = descomponerFecha(valeActualizado.fecha);
        state.movimientos_tanque.unshift({
          id: Date.now(),
          dia: fInfo.dia,
          fecha: fInfo.fecha,
          anio: fInfo.anio,
          fecha_completa: fInfo.fecha_completa,
          tipo: valeActualizado.producto,
          cantidad: cant,
          operacion: `Edición Vale #${valeActualizado.n_vale}`,
          cliente: valeActualizado.cliente,
          stock_resultante: state.tanques[valeActualizado.producto].stock
        });
      }

      valeActualizado.lugar = SEDE_ESTATICA;
      state.vales[idx] = { ...state.vales[idx], ...valeActualizado };
      registrarNuevoClienteSiNoExiste(valeActualizado.cliente);
      registrarNuevoPersonalSiNoExiste(valeActualizado.grifero);
      await persist();
    }
  }

  async function anularVale(id, motivo) {
    const v = state.vales.find(item => item.id === id);
    if (v && v.estado !== "ANULADO") {
      // Revertir stock al tanque
      if (state.tanques[v.producto]) {
        state.tanques[v.producto].stock += (Number(v.cantidad) || 0);
      }
      v.estado = "ANULADO";
      v.observacion = motivo ? `ANULADO: ${motivo}` : "ANULADO";

      const fInfo = descomponerFecha(v.fecha);
      state.movimientos_tanque.unshift({
        id: Date.now(),
        dia: fInfo.dia,
        fecha: fInfo.fecha,
        anio: fInfo.anio,
        fecha_completa: fInfo.fecha_completa,
        tipo: v.producto,
        cantidad: Number(v.cantidad) || 0,
        operacion: `Anulación Vale #${v.n_vale} (+${v.cantidad} Gln repuestos)`,
        cliente: v.cliente,
        stock_resultante: state.tanques[v.producto].stock
      });

      await persist();
    }
  }

  async function eliminarVale(id) {
    const v = state.vales.find(item => item.id === id);
    if (v && v.estado !== "ANULADO" && state.tanques[v.producto]) {
      state.tanques[v.producto].stock += (Number(v.cantidad) || 0);
    }
    state.vales = state.vales.filter(item => item.id !== id);
    await persist();
  }

  // MODIFICAR CANTIDAD DE GASOLINA EN TANQUE (VARILLAJE / DESCARGA CISTERNA)
  async function modificarStockTanque(tipoCombustible, nuevoStockGln, motivo, fechaMovimiento) {
    if (!state.tanques[tipoCombustible]) return;

    const stockAnterior = state.tanques[tipoCombustible].stock;
    const nuevoStock = Math.max(0, Math.min(state.tanques[tipoCombustible].capacidad, parseFloat(nuevoStockGln) || 0));
    const diferencia = Math.round((nuevoStock - stockAnterior) * 100) / 100;

    state.tanques[tipoCombustible].stock = nuevoStock;

    // Registrar en panel diario: Día, Fecha, Año, Cantidad, Tipo
    const fInfo = descomponerFecha(fechaMovimiento || new Date().toISOString().split('T')[0]);
    state.movimientos_tanque.unshift({
      id: Date.now(),
      dia: fInfo.dia,
      fecha: fInfo.fecha,
      anio: fInfo.anio,
      fecha_completa: fInfo.fecha_completa,
      tipo: tipoCombustible,
      cantidad: nuevoStock,
      diferencia: diferencia,
      operacion: motivo || "Ajuste de Varillaje / Medición Física",
      cliente: "Tanque " + tipoCombustible,
      stock_resultante: nuevoStock
    });

    await persist();
  }

  async function importarValesMasivos(nuevosVales, reemplazar = false) {
    let valesAProcesar = [];
    if (reemplazar) {
      state.vales = nuevosVales;
      valesAProcesar = nuevosVales;
    } else {
      const valesExistentes = new Set(state.vales.map(v => Number(v.n_vale)));
      valesAProcesar = nuevosVales.filter(v => !valesExistentes.has(Number(v.n_vale)));
      state.vales = [...valesAProcesar, ...state.vales];
    }

    valesAProcesar.forEach(v => {
      v.lugar = SEDE_ESTATICA;
      registrarNuevoClienteSiNoExiste(v.cliente);
      registrarNuevoPersonalSiNoExiste(v.grifero);

      if (v.estado !== "ANULADO" && state.tanques[v.producto]) {
        const cant = Number(v.cantidad) || 0;
        state.tanques[v.producto].stock = Math.max(0, Math.round((state.tanques[v.producto].stock - cant) * 100) / 100);
        const fInfo = descomponerFecha(v.fecha);
        state.movimientos_tanque.unshift({
          id: Date.now() + Math.floor(Math.random() * 100000),
          dia: fInfo.dia,
          fecha: fInfo.fecha,
          anio: fInfo.anio,
          fecha_completa: fInfo.fecha_completa,
          tipo: v.producto,
          cantidad: cant,
          operacion: `Importación Excel Vale #${v.n_vale}`,
          cliente: v.cliente,
          stock_resultante: state.tanques[v.producto].stock
        });
      }
    });

    await persist();
    return valesAProcesar.length;
  }

  function registrarNuevoClienteSiNoExiste(c) {
    if (!c || c === "-" || c.trim() === "") return;
    const limpio = c.trim().toUpperCase();
    if (!state.clientes.includes(limpio)) state.clientes.push(limpio);
  }

  function registrarNuevoPersonalSiNoExiste(p) {
    if (!p || p === "-" || p.trim() === "") return;
    const limpio = p.trim().toUpperCase();
    if (!state.personal.includes(limpio)) state.personal.push(limpio);
  }

  async function cargarDatosDemo() {
    await init();
  }

  async function limpiarBaseDatos() {
    state.vales = [];
    state.movimientos_tanque = [];
    await persist();
  }

  async function actualizarConfiguracion(empresa, ruc, direccion, precios) {
    state.empresa = empresa;
    state.ruc = ruc;
    state.direccion = SEDE_ESTATICA;
    state.precios = { ...state.precios, ...precios };
    await persist();
  }

  function getMetricas() {
    let dieselGln = 0, dieselSoles = 0;
    let premiumGln = 0, premiumSoles = 0;
    let regularGln = 0, regularSoles = 0;
    let totalGln = 0, totalSoles = 0;
    let pendienteSoles = 0, cantPendientes = 0;
    let anulados = 0;

    const clientesMap = {};
    const lugaresMap = {};
    const personalMap = {};

    for (let i = 0; i < state.vales.length; i++) {
      const v = state.vales[i];
      if (v.estado === "ANULADO") {
        anulados++;
        continue;
      }

      const g = Number(v.cantidad) || 0;
      const s = Number(v.total) || 0;

      totalGln += g;
      totalSoles += s;

      const prod = String(v.producto || "").toUpperCase();
      if (prod.includes("DIESEL") || prod.includes("B5")) {
        dieselGln += g; dieselSoles += s;
      } else if (prod.includes("PREMIUM")) {
        premiumGln += g; premiumSoles += s;
      } else if (prod.includes("REGULAR")) {
        regularGln += g; regularSoles += s;
      }

      if (v.estado === "PENDIENTE") {
        pendienteSoles += s;
        cantPendientes++;
      }

      const cNom = v.cliente || "General";
      if (!clientesMap[cNom]) {
        clientesMap[cNom] = {
          cliente: cNom,
          lugar: v.lugar || "Sede Jesús",
          telefono: v.telefono || "",
          valesPendientes: 0,
          valesTotales: 0,
          totalGln: 0,
          deudaSoles: 0,
          totalSoles: 0
        };
      }
      clientesMap[cNom].valesTotales++;
      clientesMap[cNom].totalGln += g;
      clientesMap[cNom].totalSoles += s;
      if (v.estado === "PENDIENTE") {
        clientesMap[cNom].valesPendientes++;
        clientesMap[cNom].deudaSoles += s;
      }

      const lugarNom = (v.lugar && v.lugar.trim() !== "") ? v.lugar.trim() : "Sede Jesús";
      if (!lugaresMap[lugarNom]) {
        lugaresMap[lugarNom] = { lugar: lugarNom, galones: 0, soles: 0, vales: 0 };
      }
      lugaresMap[lugarNom].galones += g;
      lugaresMap[lugarNom].soles += s;
      lugaresMap[lugarNom].vales++;

      const persNom = (v.grifero && v.grifero.trim() !== "") ? v.grifero.trim() : "OTROS";
      if (!personalMap[persNom]) {
        personalMap[persNom] = { personal: persNom, vales: 0, galones: 0, soles: 0 };
      }
      personalMap[persNom].vales++;
      personalMap[persNom].galones += g;
      personalMap[persNom].soles += s;
    }

    const rankingClientes = Object.values(clientesMap).sort((a, b) => b.totalSoles - a.totalSoles);
    const rankingLugares = Object.values(lugaresMap).sort((a, b) => b.soles - a.soles);
    const rankingPersonal = Object.values(personalMap).sort((a, b) => b.galones - a.galones);

    return {
      dieselGln, dieselSoles,
      premiumGln, premiumSoles,
      regularGln, regularSoles,
      totalGln, totalSoles,
      pendienteSoles, cantPendientes,
      anulados,
      totalVales: state.vales.length,
      rankingClientes,
      rankingLugares,
      rankingPersonal
    };
  }

  function getSiguienteVale() {
    let max = 0;
    for (let i = 0; i < state.vales.length; i++) {
      const n = Number(state.vales[i].n_vale);
      if (!isNaN(n) && n > max) max = n;
    }
    return max > 0 ? max + 1 : 401;
  }

  return {
    init,
    getState,
    subscribe,
    agregarVale,
    actualizarVale,
    anularVale,
    eliminarVale,
    modificarStockTanque,
    importarValesMasivos,
    cargarDatosDemo,
    limpiarBaseDatos,
    actualizarConfiguracion,
    descomponerFecha,
    getMetricas,
    getSiguienteVale
  };
})();
