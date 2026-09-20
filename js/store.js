/**
 * ============================================================================
 * STORE CENTRALIZADO Y MOTOR DE CÁLCULO EMPRESARIAL (js/store.js)
 * Versión 2.1 - Soporte para Sedes/Lugares e Importación Masiva de Excel
 * ============================================================================
 */

const Store = (() => {
  // DATOS EMPRESARIALES DE REFERENCIA CON ZONAS / LUGARES
  const DEMO_VALES = [
    { id: 101, fecha: "2026-08-17", n_vale: 377, turno: "T1 (Mañana)", cliente: "Transportes Andina S.A.C.", lugar: "Sede Lima", telefono: "987654321", placa: "A1B-823", conductor: "Carlos Rojas", producto: "PREMIUM", cantidad: 8.0, precio: 19.50, total: 156.00, grifero: "Juan P.", estado: "FACTURADO", observacion: "F001-00452" },
    { id: 102, fecha: "2026-08-17", n_vale: 378, turno: "T1 (Mañana)", cliente: "Constructora del Sur", lugar: "Cantera Sur", telefono: "951234567", placa: "C4F-912", conductor: "Manuel Vega", producto: "PREMIUM", cantidad: 3.0, precio: 19.50, total: 58.50, grifero: "Juan P.", estado: "FACTURADO", observacion: "F001-00455" },
    { id: 103, fecha: "2026-08-18", n_vale: 379, turno: "T2 (Tarde)", cliente: "-", lugar: "General", telefono: "", placa: "-", conductor: "-", producto: "PREMIUM", cantidad: 0.0, precio: 0.0, total: 0.0, grifero: "Pedro M.", estado: "ANULADO", observacion: "VALE ROTO" },
    { id: 104, fecha: "2026-08-19", n_vale: 380, turno: "T1 (Mañana)", cliente: "Distribuidora Lima", lugar: "Almacén Central", telefono: "940112233", placa: "T6U-711", conductor: "Jorge Quispe", producto: "DIESEL B5", cantidad: 10.0, precio: 16.80, total: 168.00, grifero: "Luis G.", estado: "FACTURADO", observacion: "F001-00460" },
    { id: 105, fecha: "2026-08-19", n_vale: 381, turno: "T2 (Tarde)", cliente: "Transportes Andina S.A.C.", lugar: "Sede Lima", telefono: "987654321", placa: "A1B-823", conductor: "Carlos Rojas", producto: "PREMIUM", cantidad: 4.0, precio: 19.50, total: 78.00, grifero: "Pedro M.", estado: "PENDIENTE", observacion: "" },
    { id: 106, fecha: "2026-08-17", n_vale: 382, turno: "T3 (Noche)", cliente: "Minera Horizonte", lugar: "Campamento Norte", telefono: "998877665", placa: "V7X-551", conductor: "Alonso Ruiz", producto: "PREMIUM", cantidad: 1.0, precio: 19.50, total: 19.50, grifero: "Mario S.", estado: "PENDIENTE", observacion: "" },
    { id: 107, fecha: "2026-08-20", n_vale: 383, turno: "T1 (Mañana)", cliente: "Constructora del Sur", lugar: "Cantera Sur", telefono: "951234567", placa: "C4F-912", conductor: "Manuel Vega", producto: "PREMIUM", cantidad: 4.0, precio: 19.50, total: 78.00, grifero: "Juan P.", estado: "PENDIENTE", observacion: "" },
    { id: 108, fecha: "2026-08-21", n_vale: 384, turno: "T1 (Mañana)", cliente: "Distribuidora Lima", lugar: "Almacén Central", telefono: "940112233", placa: "T6U-711", conductor: "Jorge Quispe", producto: "PREMIUM", cantidad: 7.0, precio: 19.50, total: 136.50, grifero: "Luis G.", estado: "PENDIENTE", observacion: "" },
    { id: 109, fecha: "2026-08-21", n_vale: 385, turno: "T2 (Tarde)", cliente: "Agropecuaria San José", lugar: "Fundo Cañete", telefono: "977441122", placa: "B8K-102", conductor: "Raúl Castro", producto: "PREMIUM", cantidad: 8.0, precio: 19.50, total: 156.00, grifero: "Pedro M.", estado: "PENDIENTE", observacion: "" },
    { id: 110, fecha: "2026-08-22", n_vale: 386, turno: "T1 (Mañana)", cliente: "-", lugar: "General", telefono: "", placa: "-", conductor: "-", producto: "PREMIUM", cantidad: 0.0, precio: 0.0, total: 0.0, grifero: "Juan P.", estado: "ANULADO", observacion: "VALE EXTRAVIADO" },
    { id: 111, fecha: "2026-08-25", n_vale: 387, turno: "T1 (Mañana)", cliente: "Distribuidora Lima", lugar: "Almacén Central", telefono: "940112233", placa: "T6U-711", conductor: "Jorge Quispe", producto: "DIESEL B5", cantidad: 11.0, precio: 16.80, total: 184.80, grifero: "Luis G.", estado: "PENDIENTE", observacion: "" },
    { id: 112, fecha: "2026-08-25", n_vale: 388, turno: "T2 (Tarde)", cliente: "Transportes Andina S.A.C.", lugar: "Sede Lima", telefono: "987654321", placa: "A1B-823", conductor: "Carlos Rojas", producto: "PREMIUM", cantidad: 4.0, precio: 19.50, total: 78.00, grifero: "Pedro M.", estado: "PENDIENTE", observacion: "" },
    { id: 113, fecha: "2026-08-26", n_vale: 389, turno: "T1 (Mañana)", cliente: "Constructora del Sur", lugar: "Cantera Sur", telefono: "951234567", placa: "C4F-912", conductor: "Manuel Vega", producto: "PREMIUM", cantidad: 4.0, precio: 19.50, total: 78.00, grifero: "Juan P.", estado: "PENDIENTE", observacion: "" },
    { id: 114, fecha: "2026-08-27", n_vale: 390, turno: "T1 (Mañana)", cliente: "Agropecuaria San José", lugar: "Fundo Cañete", telefono: "977441122", placa: "B8K-102", conductor: "Raúl Castro", producto: "PREMIUM", cantidad: 8.0, precio: 19.50, total: 156.00, grifero: "Luis G.", estado: "PENDIENTE", observacion: "" },
    { id: 115, fecha: "2026-08-31", n_vale: 391, turno: "T2 (Tarde)", cliente: "Transportes Andina S.A.C.", lugar: "Sede Lima", telefono: "987654321", placa: "B3M-442", conductor: "Felipe Díaz", producto: "PREMIUM", cantidad: 7.0, precio: 19.50, total: 136.50, grifero: "Pedro M.", estado: "PENDIENTE", observacion: "" },
    { id: 116, fecha: "2026-08-31", n_vale: 392, turno: "T3 (Noche)", cliente: "-", lugar: "General", telefono: "", placa: "-", conductor: "-", producto: "PREMIUM", cantidad: 0.0, precio: 0.0, total: 0.0, grifero: "Mario S.", estado: "ANULADO", observacion: "CORRELATIVO SALTADO" },
    { id: 117, fecha: "2026-08-31", n_vale: 393, turno: "T3 (Noche)", cliente: "-", lugar: "General", telefono: "", placa: "-", conductor: "-", producto: "PREMIUM", cantidad: 0.0, precio: 0.0, total: 0.0, grifero: "Mario S.", estado: "ANULADO", observacion: "ERROR DE IMPRESIÓN" },
    { id: 118, fecha: "2026-09-01", n_vale: 394, turno: "T1 (Mañana)", cliente: "Distribuidora Lima", lugar: "Almacén Central", telefono: "940112233", placa: "T6U-711", conductor: "Jorge Quispe", producto: "DIESEL B5", cantidad: 6.0, precio: 16.80, total: 100.80, grifero: "Luis G.", estado: "PENDIENTE", observacion: "" },
    { id: 119, fecha: "2026-09-02", n_vale: 395, turno: "T2 (Tarde)", cliente: "Minera Horizonte", lugar: "Campamento Norte", telefono: "998877665", placa: "V7X-551", conductor: "Alonso Ruiz", producto: "PREMIUM", cantidad: 12.0, precio: 19.50, total: 234.00, grifero: "Pedro M.", estado: "PENDIENTE", observacion: "" },
    { id: 120, fecha: "2026-09-02", n_vale: 396, turno: "T3 (Noche)", cliente: "-", lugar: "General", telefono: "", placa: "-", conductor: "-", producto: "PREMIUM", cantidad: 0.0, precio: 0.0, total: 0.0, grifero: "Mario S.", estado: "ANULADO", observacion: "PLACA INCORRECTA" }
  ];

  let state = {
    empresa: "ESTACIÓN DE SERVICIOS Y COMBUSTIBLES S.A.C.",
    ruc: "20601234567",
    direccion: "Av. Panamericana Sur Km 140 - Cañete, Lima",
    telefono: "01-480-1234",
    precios: {
      "DIESEL B5": 16.80,
      "PREMIUM": 19.50,
      "REGULAR": 17.20,
      "GLP": 8.50
    },
    tanques: {
      "DIESEL B5": { capacidad: 8000, stock: 4250, unidad: "Gln" },
      "PREMIUM": { capacidad: 5000, stock: 2840, unidad: "Gln" },
      "REGULAR": { capacidad: 6000, stock: 3100, unidad: "Gln" },
      "GLP": { capacidad: 4000, stock: 1950, unidad: "Gln" }
    },
    vales: [...DEMO_VALES]
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

  async function init() {
    try {
      const res = await fetch('/api/datos', { cache: 'no-store' });
      if (res.ok) {
        const remote = await res.json();
        if (remote && Array.isArray(remote.vales)) {
          if (remote.vales.length > 0) state.vales = remote.vales;
          if (remote.empresa) state.empresa = remote.empresa;
          if (remote.ruc) state.ruc = remote.ruc;
          if (remote.direccion) state.direccion = remote.direccion;
          if (remote.precios) state.precios = { ...state.precios, ...remote.precios };
          if (remote.tanques) state.tanques = { ...state.tanques, ...remote.tanques };
          saveLocal();
          notify();
          return;
        }
      }
    } catch (e) {}

    const local = localStorage.getItem('grifo_erp_state');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && Array.isArray(parsed.vales)) {
          state = { ...state, ...parsed };
        }
      } catch (e) {}
    }

    saveLocal();
    notify();
  }

  function saveLocal() {
    localStorage.setItem('grifo_erp_state', JSON.stringify(state));
  }

  async function persist() {
    saveLocal();
    notify();
    try {
      await fetch('/api/datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (e) {}
  }

  async function agregarVale(vale) {
    state.vales.unshift(vale);
    await persist();
  }

  async function actualizarVale(id, valeActualizado) {
    const idx = state.vales.findIndex(v => v.id === id);
    if (idx !== -1) {
      state.vales[idx] = { ...state.vales[idx], ...valeActualizado };
      await persist();
    }
  }

  async function anularVale(id, motivo) {
    const v = state.vales.find(item => item.id === id);
    if (v) {
      v.estado = "ANULADO";
      v.observacion = motivo ? `ANULADO: ${motivo}` : "ANULADO";
      await persist();
    }
  }

  async function eliminarVale(id) {
    state.vales = state.vales.filter(item => item.id !== id);
    await persist();
  }

  async function importarValesMasivos(nuevosVales, reemplazar = false) {
    if (reemplazar) {
      state.vales = nuevosVales;
    } else {
      // Filtrar duplicados por n_vale
      const valesExistentes = new Set(state.vales.map(v => Number(v.n_vale)));
      const sinDuplicados = nuevosVales.filter(v => !valesExistentes.has(Number(v.n_vale)));
      state.vales = [...sinDuplicados, ...state.vales];
    }
    await persist();
  }

  async function cargarDatosDemo() {
    state.vales = JSON.parse(JSON.stringify(DEMO_VALES));
    await persist();
  }

  async function limpiarBaseDatos() {
    state.vales = [];
    await persist();
  }

  async function actualizarConfiguracion(empresa, ruc, direccion, precios) {
    state.empresa = empresa;
    state.ruc = ruc;
    state.direccion = direccion;
    state.precios = { ...state.precios, ...precios };
    await persist();
  }

  function getLugaresDisponibles() {
    const lugares = new Set();
    state.vales.forEach(v => {
      if (v.lugar && v.lugar.trim() !== "" && v.lugar !== "-") {
        lugares.add(v.lugar.trim());
      }
    });
    return Array.from(lugares).sort();
  }

  function getMetricas() {
    let dieselGln = 0, dieselSoles = 0;
    let premiumGln = 0, premiumSoles = 0;
    let regularGln = 0, regularSoles = 0;
    let glpGln = 0, glpSoles = 0;
    let totalGln = 0, totalSoles = 0;
    let pendienteSoles = 0, cantPendientes = 0;
    let anulados = 0;

    const clientesMap = {};
    const lugaresMap = {};

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

      if (v.producto === "DIESEL B5") { dieselGln += g; dieselSoles += s; }
      else if (v.producto === "PREMIUM") { premiumGln += g; premiumSoles += s; }
      else if (v.producto === "REGULAR") { regularGln += g; regularSoles += s; }
      else if (v.producto === "GLP") { glpGln += g; glpSoles += s; }

      if (v.estado === "PENDIENTE") {
        pendienteSoles += s;
        cantPendientes++;
      }

      // Agrupación por cliente
      const cNom = v.cliente || "Cliente General";
      if (!clientesMap[cNom]) {
        clientesMap[cNom] = {
          cliente: cNom,
          lugar: v.lugar || "Principal",
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

      // Agrupación por Lugar / Zona
      const lugarNom = (v.lugar && v.lugar.trim() !== "") ? v.lugar.trim() : "General";
      if (!lugaresMap[lugarNom]) {
        lugaresMap[lugarNom] = { lugar: lugarNom, galones: 0, soles: 0, vales: 0 };
      }
      lugaresMap[lugarNom].galones += g;
      lugaresMap[lugarNom].soles += s;
      lugaresMap[lugarNom].vales++;
    }

    const rankingClientes = Object.values(clientesMap).sort((a, b) => b.totalSoles - a.totalSoles);
    const rankingLugares = Object.values(lugaresMap).sort((a, b) => b.soles - a.soles);

    return {
      dieselGln, dieselSoles,
      premiumGln, premiumSoles,
      regularGln, regularSoles,
      glpGln, glpSoles,
      totalGln, totalSoles,
      pendienteSoles, cantPendientes,
      anulados,
      totalVales: state.vales.length,
      rankingClientes,
      rankingLugares
    };
  }

  function getSiguienteVale() {
    let max = 0;
    for (let i = 0; i < state.vales.length; i++) {
      const n = Number(state.vales[i].n_vale);
      if (!isNaN(n) && n > max) max = n;
    }
    return max > 0 ? max + 1 : 101;
  }

  return {
    init,
    getState,
    subscribe,
    agregarVale,
    actualizarVale,
    anularVale,
    eliminarVale,
    importarValesMasivos,
    cargarDatosDemo,
    limpiarBaseDatos,
    actualizarConfiguracion,
    getLugaresDisponibles,
    getMetricas,
    getSiguienteVale
  };
})();
