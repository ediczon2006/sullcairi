/**
 * ============================================================================
 * STORE CENTRALIZADO - ESTACIÓN DE SERVICIOS SULLCAIRI (js/store.js)
 * Versión 2.3 - Seguridad Empresarial, Validación Estricta de Stock y Hash SHA-256
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

  let idCounter = 0;
  function generarIdUnico() {
    idCounter++;
    return Date.now() + "_" + idCounter + "_" + Math.random().toString(36).substring(2, 7);
  }

  // Clamping y precisión para inventario
  function sumarStockSeguro(tanque, cantidad) {
    if (!tanque) return;
    const c = Math.max(0, Number(cantidad) || 0);
    const nuevo = Math.min(tanque.capacidad, (Number(tanque.stock) || 0) + c);
    tanque.stock = Math.round(nuevo * 100) / 100;
  }

  function restarStockSeguro(tanque, cantidad) {
    if (!tanque) return;
    const c = Math.max(0, Number(cantidad) || 0);
    const nuevo = Math.max(0, (Number(tanque.stock) || 0) - c);
    tanque.stock = Math.round(nuevo * 100) / 100;
  }

  // Hash SHA-256 para PIN Administrativo (Web Crypto API)
  async function hashearTexto(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(texto) + "_grifo_salt_2026");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  let state = {
    version: "2.3.0",
    empresa: "ESTACIÓN DE SERVICIOS SULLCAIRI",
    ruc: "20608945123",
    direccion: SEDE_ESTATICA,
    telefono: "962123456",
    admin_pin_hash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", // Default PIN: 1234
    precios: {
      "DIESEL B5-S50": 16.80,
      "GASOHOL PREMIUM": 19.50,
      "GASOHOL REGULAR": 17.20
    },
    tanques: JSON.parse(JSON.stringify(TANQUES_OFICIALES)),
    clientes: [...CLIENTES_OFICIALES],
    personal: [...PERSONAL_OFICIAL],
    lugares: [SEDE_ESTATICA],
    movimientos_tanque: [],
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
    const s = getState();
    listeners.forEach(fn => fn(s));
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
    // 1. Cargar desde localStorage primero (Offline-First en dispositivo local)
    const local = localStorage.getItem('grifo_erp_jesus_state');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.vales)) state.vales = parsed.vales;
          if (parsed.empresa) state.empresa = String(parsed.empresa).trim();
          if (parsed.ruc) state.ruc = String(parsed.ruc).trim();
          if (parsed.telefono) state.telefono = String(parsed.telefono).trim();
          if (parsed.admin_pin_hash) state.admin_pin_hash = parsed.admin_pin_hash;
          state.direccion = SEDE_ESTATICA;
          state.lugares = [SEDE_ESTATICA];
          if (parsed.precios && typeof parsed.precios === 'object') {
            state.precios = { ...state.precios, ...parsed.precios };
          }
          if (parsed.tanques && typeof parsed.tanques === 'object') {
            state.tanques = { ...state.tanques, ...parsed.tanques };
          }
          if (Array.isArray(parsed.clientes)) state.clientes = parsed.clientes;
          if (Array.isArray(parsed.personal)) state.personal = parsed.personal;
          if (Array.isArray(parsed.movimientos_tanque)) state.movimientos_tanque = parsed.movimientos_tanque;
        }
      } catch (e) {
        console.warn("[Store] Error al parsear estado local:", e);
      }
    }

    // 2. Sincronización pasiva con servidor si está disponible
    try {
      const res = await fetch('/api/datos', { cache: 'no-store' });
      if (res.ok) {
        const remote = await res.json();
        if (remote && Array.isArray(remote.vales) && remote.vales.length > state.vales.length) {
          state.vales = remote.vales;
          if (remote.empresa) state.empresa = remote.empresa;
          if (remote.ruc) state.ruc = remote.ruc;
          state.direccion = SEDE_ESTATICA;
          state.lugares = [SEDE_ESTATICA];
          if (remote.precios) state.precios = { ...state.precios, ...remote.precios };
          if (remote.tanques) state.tanques = { ...state.tanques, ...remote.tanques };
          if (Array.isArray(remote.clientes)) state.clientes = remote.clientes;
          if (Array.isArray(remote.personal)) state.personal = remote.personal;
          if (Array.isArray(remote.movimientos_tanque)) state.movimientos_tanque = remote.movimientos_tanque;
        }
      }
    } catch (e) {
      // Entorno estático (GitHub Pages) sin backend
    }

    saveLocal();
    notify();
  }

  function saveLocal() {
    try {
      localStorage.setItem('grifo_erp_jesus_state', JSON.stringify(state));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        // Poda preventiva de auditoría histórica para recuperar espacio
        if (state.movimientos_tanque && state.movimientos_tanque.length > 200) {
          state.movimientos_tanque = state.movimientos_tanque.slice(0, 200);
          try {
            localStorage.setItem('grifo_erp_jesus_state', JSON.stringify(state));
            return;
          } catch (e2) {}
        }
      }
      console.warn('Alerta de almacenamiento en dispositivo:', e.message);
    }
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
    } catch (e) {
      // Persistencia en dispositivo completada
    }
  }

  // Verificación y Cambio de PIN de Administrador
  async function verificarPinAdmin(pin) {
    if (!pin) return false;
    const h = await hashearTexto(pin);
    // Si no tiene PIN configurado o coincide con hash guardado
    if (!state.admin_pin_hash) return pin === "1234";
    return h === state.admin_pin_hash;
  }

  async function cambiarPinAdmin(pinActual, nuevoPin) {
    const valido = await verificarPinAdmin(pinActual);
    if (!valido) throw new Error("El PIN actual es incorrecto.");
    if (!nuevoPin || String(nuevoPin).trim().length < 4) {
      throw new Error("El nuevo PIN debe tener al menos 4 caracteres.");
    }
    state.admin_pin_hash = await hashearTexto(String(nuevoPin).trim());
    await persist();
    return true;
  }

  // REGISTRO DE VALE + CONTROL DE STOCK CON CLAMP
  async function agregarVale(vale) {
    vale.lugar = SEDE_ESTATICA;
    vale.n_vale = parseInt(vale.n_vale, 10);
    vale.cantidad = Math.max(0, parseFloat(vale.cantidad) || 0);
    vale.precio = Math.max(0, parseFloat(vale.precio) || 0);
    vale.total = Math.round(vale.cantidad * vale.precio * 100) / 100;

    state.vales.unshift(vale);
    registrarNuevoClienteSiNoExiste(vale.cliente);
    registrarNuevoPersonalSiNoExiste(vale.grifero);

    if (vale.estado !== "ANULADO" && state.tanques[vale.producto]) {
      restarStockSeguro(state.tanques[vale.producto], vale.cantidad);

      const fInfo = descomponerFecha(vale.fecha);
      state.movimientos_tanque.unshift({
        id: generarIdUnico(),
        dia: fInfo.dia,
        fecha: fInfo.fecha,
        anio: fInfo.anio,
        fecha_completa: fInfo.fecha_completa,
        tipo: vale.producto,
        cantidad: vale.cantidad,
        operacion: `Despacho Vale #${vale.n_vale}`,
        cliente: vale.cliente,
        stock_resultante: state.tanques[vale.producto].stock
      });
    }

    await persist();
    if (typeof subirValeASupabase === 'function') {
      subirValeASupabase(vale);
    }
  }

  async function actualizarVale(id, valeActualizado) {
    const idx = state.vales.findIndex(v => String(v.id) === String(id));
    if (idx !== -1) {
      const valePrevio = state.vales[idx];

      // Revertir con clamp seguro
      if (valePrevio.estado !== "ANULADO" && state.tanques[valePrevio.producto]) {
        sumarStockSeguro(state.tanques[valePrevio.producto], valePrevio.cantidad);
      }

      valeActualizado.cantidad = Math.max(0, parseFloat(valeActualizado.cantidad) || 0);
      valeActualizado.precio = Math.max(0, parseFloat(valeActualizado.precio) || 0);
      valeActualizado.total = Math.round(valeActualizado.cantidad * valeActualizado.precio * 100) / 100;
      valeActualizado.lugar = SEDE_ESTATICA;

      if (valeActualizado.estado !== "ANULADO" && state.tanques[valeActualizado.producto]) {
        restarStockSeguro(state.tanques[valeActualizado.producto], valeActualizado.cantidad);

        const fInfo = descomponerFecha(valeActualizado.fecha);
        state.movimientos_tanque.unshift({
          id: generarIdUnico(),
          dia: fInfo.dia,
          fecha: fInfo.fecha,
          anio: fInfo.anio,
          fecha_completa: fInfo.fecha_completa,
          tipo: valeActualizado.producto,
          cantidad: valeActualizado.cantidad,
          operacion: `Edición Vale #${valeActualizado.n_vale}`,
          cliente: valeActualizado.cliente,
          stock_resultante: state.tanques[valeActualizado.producto].stock
        });
      }

      state.vales[idx] = { ...state.vales[idx], ...valeActualizado };
      registrarNuevoClienteSiNoExiste(valeActualizado.cliente);
      registrarNuevoPersonalSiNoExiste(valeActualizado.grifero);
      await persist();
      if (typeof subirValeASupabase === 'function') {
        subirValeASupabase(state.vales[idx]);
      }
    }
  }

  async function anularVale(id, motivo) {
    const v = state.vales.find(item => String(item.id) === String(id));
    if (v && v.estado !== "ANULADO") {
      if (state.tanques[v.producto]) {
        sumarStockSeguro(state.tanques[v.producto], v.cantidad);
      }
      v.estado = "ANULADO";
      v.observacion = motivo ? `ANULADO: ${motivo}` : "ANULADO";

      const fInfo = descomponerFecha(v.fecha);
      state.movimientos_tanque.unshift({
        id: generarIdUnico(),
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
      if (typeof subirValeASupabase === 'function') {
        subirValeASupabase(v);
      }
    }
  }

  async function eliminarVale(id) {
    const v = state.vales.find(item => String(item.id) === String(id));
    if (v && v.estado !== "ANULADO" && state.tanques[v.producto]) {
      sumarStockSeguro(state.tanques[v.producto], v.cantidad);
    }
    state.vales = state.vales.filter(item => String(item.id) !== String(id));
    await persist();
    if (typeof eliminarValeDeSupabase === 'function') {
      eliminarValeDeSupabase(id);
    }
  }

  async function modificarStockTanque(tipoCombustible, nuevoStockGln, motivo, fechaMovimiento) {
    if (!state.tanques[tipoCombustible]) return;

    const stockAnterior = state.tanques[tipoCombustible].stock;
    const nuevoStock = Math.max(0, Math.min(state.tanques[tipoCombustible].capacidad, parseFloat(nuevoStockGln) || 0));
    const diferencia = Math.round((nuevoStock - stockAnterior) * 100) / 100;

    state.tanques[tipoCombustible].stock = nuevoStock;

    const fInfo = descomponerFecha(fechaMovimiento || new Date().toISOString().split('T')[0]);
    state.movimientos_tanque.unshift({
      id: generarIdUnico(),
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
    if (typeof sincronizarTanqueASupabase === 'function') {
      sincronizarTanqueASupabase(tipoCombustible, nuevoStock);
    }
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
        restarStockSeguro(state.tanques[v.producto], cant);
        const fInfo = descomponerFecha(v.fecha);
        state.movimientos_tanque.unshift({
          id: generarIdUnico(),
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

  async function limpiarBaseDatos() {
    state.vales = [];
    state.movimientos_tanque = [];
    await persist();
  }

  async function actualizarConfiguracion(empresa, ruc, direccion, precios, telefono) {
    if (empresa) state.empresa = String(empresa).trim();
    if (ruc) state.ruc = String(ruc).trim();
    if (telefono) state.telefono = String(telefono).trim();
    state.direccion = SEDE_ESTATICA;
    if (precios) state.precios = { ...state.precios, ...precios };
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
          lugar: SEDE_ESTATICA,
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

      const persNom = (v.grifero && v.grifero.trim() !== "") ? v.grifero.trim() : "OTROS";
      if (!personalMap[persNom]) {
        personalMap[persNom] = { personal: persNom, vales: 0, galones: 0, soles: 0 };
      }
      personalMap[persNom].vales++;
      personalMap[persNom].galones += g;
      personalMap[persNom].soles += s;
    }

    const rankingClientes = Object.values(clientesMap).sort((a, b) => b.totalSoles - a.totalSoles);
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
    limpiarBaseDatos,
    actualizarConfiguracion,
    descomponerFecha,
    getMetricas,
    getSiguienteVale,
    verificarPinAdmin,
    cambiarPinAdmin
  };
})();
