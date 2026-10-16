// ========================================================
//  ESTACIÓN DE SERVICIOS SULLCAIRI — CAPA DE DATOS HÍBRIDA (IndexedDB + Supabase)
//  Estilo: Leytrix Core DB Architecture
//  Sede Fija Oficial: jesus_de_lauricocha_huanuco
//  Modo: 100% Offline-First + Realtime Cloud (gtfmhtrvsbfcftstbadj)
// ========================================================

const SUPA_URL = 'https://gtfmhtrvsbfcftstbadj.supabase.co';
const SUPA_KEY = 'sb_publishable_jLqnXfwQ2Zksb_fvuympjQ_v2OR8F8x';
const SUPA_PROJECT_ID = 'gtfmhtrvsbfcftstbadj';
const SEDE_OFICIAL = 'jesus_de_lauricocha_huanuco';

const COMBUSTIBLES = ['DIESEL B5-S50', 'GASOHOL PREMIUM', 'GASOHOL REGULAR'];
const ESTADOS_VALE = ['PENDIENTE', 'FACTURADO', 'ANULADO'];
const TURNOS = ['T1 (Mañana)', 'T2 (Tarde)', 'T3 (Noche)'];

let _supa = null;
let _supaOnline = false;
let _supaIniciado = false;
let _realtimeCanal = null;

try {
  if (!_supaIniciado && typeof supabase !== 'undefined' && supabase.createClient) {
    _supa = supabase.createClient(SUPA_URL, SUPA_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } }
    });
    _supaIniciado = true;
  }
} catch (err) {
  console.warn('[Supabase] Cliente JS no disponible:', err);
}

const DB_NAME = 'grifo_sullcairi_erp_v1';
const DB_VER  = 1;

// SEED INICIAL DE TANQUES
const TANQUES_DEFAULT = {
  'DIESEL B5-S50':  { producto: 'DIESEL B5-S50', capacidad: 3000, stock: 2150, alerta_naranja: 500, alerta_roja: 250, unidad: 'Gln' },
  'GASOHOL PREMIUM': { producto: 'GASOHOL PREMIUM', capacidad: 1500, stock: 1100, alerta_naranja: 500, alerta_roja: 250, unidad: 'Gln' },
  'GASOHOL REGULAR': { producto: 'GASOHOL REGULAR', capacidad: 1500, stock: 980, alerta_naranja: 500, alerta_roja: 250, unidad: 'Gln' }
};

const CLIENTES_DEFAULT = [
  'UGEL', 'RED DE SALUD', 'FISCALIA', 'IVP', 'AGRORURAL',
  'AGENCIA AGRARIA', 'MUNICIPALIDAD JESUS', 'CONSORCIO VIAL JESUS',
  'GRUPO MONTERRICO', 'VENTA DIARIA'
];

const PERSONAL_DEFAULT = ['YANET', 'CRESILDO', 'YAMILEX', 'OTROS'];

const PRECIOS_DEFAULT = {
  'DIESEL B5-S50': 16.80,
  'GASOHOL PREMIUM': 19.50,
  'GASOHOL REGULAR': 17.20
};

// PIN ADMIN POR DEFECTO: 1234
const DEFAULT_PIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

const IDB = (() => {
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        
        // 1. Vales
        if (!db.objectStoreNames.contains('vales')) {
          const vs = db.createObjectStore('vales', { keyPath: 'id' });
          vs.createIndex('fecha', 'fecha', { unique: false });
          vs.createIndex('n_vale', 'n_vale', { unique: false });
          vs.createIndex('cliente', 'cliente', { unique: false });
          vs.createIndex('producto', 'producto', { unique: false });
          vs.createIndex('estado', 'estado', { unique: false });
          vs.createIndex('grifero', 'grifero', { unique: false });
        }

        // 2. Tanques
        if (!db.objectStoreNames.contains('tanques')) {
          db.createObjectStore('tanques', { keyPath: 'producto' });
        }

        // 3. Movimientos Diarios / Auditoría
        if (!db.objectStoreNames.contains('movimientos_tanque')) {
          const ms = db.createObjectStore('movimientos_tanque', { keyPath: 'id' });
          ms.createIndex('fecha_completa', 'fecha_completa', { unique: false });
          ms.createIndex('tipo', 'tipo', { unique: false });
        }

        // 4. Configuración
        if (!db.objectStoreNames.contains('configuracion')) {
          db.createObjectStore('configuracion', { keyPath: 'id' });
        }
      };

      req.onsuccess = async e => {
        _db = e.target.result;
        await seedInicialSiVacio();
        resolve(_db);
      };

      req.onerror = e => reject(e.target.error);
      req.onblocked = () => {
        console.warn('[IDB] Bloqueado por otra pestaña.');
        reject(new Error('IndexedDB bloqueada.'));
      };
    });
  }

  async function db() { return _db || (_db = await open()); }

  async function seedInicialSiVacio() {
    try {
      const d = _db;
      // Verificar si hay configuración
      const tx = d.transaction(['configuracion', 'tanques'], 'readwrite');
      const storeCfg = tx.objectStore('configuracion');
      const reqCfg = storeCfg.get('principal');

      reqCfg.onsuccess = () => {
        if (!reqCfg.result) {
          storeCfg.put({
            id: 'principal',
            empresa: 'ESTACIÓN DE SERVICIOS SULLCAIRI',
            ruc: '20608945123',
            direccion: SEDE_OFICIAL,
            telefono: '962123456',
            admin_pin_hash: DEFAULT_PIN_HASH,
            precios: PRECIOS_DEFAULT,
            clientes: CLIENTES_DEFAULT,
            personal: PERSONAL_DEFAULT,
            actualizado_el: new Date().toISOString()
          });
        }
      };

      const storeTanques = tx.objectStore('tanques');
      const reqT = storeTanques.getAll();
      reqT.onsuccess = () => {
        if (!reqT.result || reqT.result.length === 0) {
          Object.values(TANQUES_DEFAULT).forEach(t => {
            storeTanques.put({ ...t, actualizado_el: new Date().toISOString() });
          });
        }
      };
    } catch (_) {}
  }

  return {
    async add(store, data) {
      if (!data || typeof data !== 'object') throw new Error(`[IDB.add] dato inválido en ${store}`);
      const d = await db();
      const id = await new Promise((resolve, reject) => {
        const tx = d.transaction([store], 'readwrite');
        const req = tx.objectStore(store).add(data);
        req.onsuccess = () => resolve(data.id || data.producto);
        req.onerror = e => reject(e.target.error);
      });

      if (_supa && _supaOnline) {
        try {
          await _supa.from(store).upsert(data, { onConflict: store === 'tanques' ? 'producto' : 'id' });
        } catch (_) {}
      }
      return id;
    },

    async put(store, data) {
      if (!data || typeof data !== 'object') throw new Error(`[IDB.put] dato inválido en ${store}`);
      const d = await db();
      await new Promise((resolve, reject) => {
        const tx = d.transaction([store], 'readwrite');
        const req = tx.objectStore(store).put(data);
        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
      });

      if (_supa && _supaOnline) {
        try {
          await _supa.from(store).upsert(data, { onConflict: store === 'tanques' ? 'producto' : 'id' });
        } catch (_) {}
      }
    },

    async delete(store, id) {
      const d = await db();
      await new Promise((resolve, reject) => {
        const tx = d.transaction([store], 'readwrite');
        const req = tx.objectStore(store).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
      });

      if (_supa && _supaOnline) {
        try {
          const keyCol = store === 'tanques' ? 'producto' : 'id';
          await _supa.from(store).delete().eq(keyCol, id);
        } catch (_) {}
      }
    },

    async get(store, id) {
      const d = await db();
      return new Promise((resolve, reject) => {
        const tx = d.transaction([store], 'readonly');
        const req = tx.objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = e => reject(e.target.error);
      });
    },

    async getAll(store) {
      const d = await db();
      return new Promise((resolve, reject) => {
        const tx = d.transaction([store], 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = e => reject(e.target.error);
      });
    },

    async count(store) {
      const d = await db();
      return new Promise((resolve, reject) => {
        const tx = d.transaction([store], 'readonly');
        const req = tx.objectStore(store).count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = e => reject(e.target.error);
      });
    },

    async clear(store) {
      const d = await db();
      return new Promise((resolve, reject) => {
        const tx = d.transaction([store], 'readwrite');
        const req = tx.objectStore(store).clear();
        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
      });
    }
  };
})();

// ========================================================
//  FACHADA DE ALTO NIVEL PARA LA ESTACIÓN (DB)
// ========================================================
const DB = {
  // Clamping seguro contra desbordes numéricos de tanques
  sumarStock(actual, delta, max) {
    const res = Math.round((Number(actual || 0) + Number(delta || 0)) * 100) / 100;
    return Math.max(0, Math.min(res, Number(max || 999999)));
  },

  restarStock(actual, delta) {
    const res = Math.round((Number(actual || 0) - Number(delta || 0)) * 100) / 100;
    return Math.max(0, res);
  },

  async obtenerConfiguracion() {
    let cfg = await IDB.get('configuracion', 'principal');
    if (!cfg) {
      cfg = {
        id: 'principal',
        empresa: 'ESTACIÓN DE SERVICIOS SULLCAIRI',
        ruc: '20608945123',
        direccion: SEDE_OFICIAL,
        telefono: '962123456',
        admin_pin_hash: DEFAULT_PIN_HASH,
        precios: PRECIOS_DEFAULT,
        clientes: CLIENTES_DEFAULT,
        personal: PERSONAL_DEFAULT
      };
      await IDB.put('configuracion', cfg);
    }
    cfg.direccion = SEDE_OFICIAL; // Inmutable
    return cfg;
  },

  async guardarConfiguracion(cfg) {
    cfg.id = 'principal';
    cfg.direccion = SEDE_OFICIAL;
    cfg.actualizado_el = new Date().toISOString();
    await IDB.put('configuracion', cfg);
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async verificarPinAdmin(pinIngresado) {
    const cfg = await this.obtenerConfiguracion();
    const hashIngresado = await SullcairiSecurity.hashPin(pinIngresado);
    return hashIngresado === (cfg.admin_pin_hash || DEFAULT_PIN_HASH);
  },

  async cambiarPinAdmin(pinActual, pinNuevo) {
    const valido = await this.verificarPinAdmin(pinActual);
    if (!valido) throw new Error("El PIN actual es incorrecto.");
    if (!SullcairiSecurity.isValid.pin(pinNuevo)) throw new Error("El nuevo PIN debe tener entre 4 y 16 dígitos.");
    const nuevoHash = await SullcairiSecurity.hashPin(pinNuevo);
    const cfg = await this.obtenerConfiguracion();
    cfg.admin_pin_hash = nuevoHash;
    await this.guardarConfiguracion(cfg);
  },

  async obtenerTanques() {
    const lista = await IDB.getAll('tanques');
    const mapa = {};
    if (lista.length > 0) {
      lista.forEach(t => { mapa[t.producto] = t; });
    } else {
      Object.assign(mapa, TANQUES_DEFAULT);
    }
    return mapa;
  },

  async guardarTanque(producto, stock, capacidad) {
    const t = {
      producto,
      stock: Number(stock),
      capacidad: Number(capacidad || 1500),
      alerta_naranja: 500,
      alerta_roja: 250,
      unidad: 'Gln',
      actualizado_el: new Date().toISOString()
    };
    await IDB.put('tanques', t);
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async modificarStockTanque(producto, nuevoStock, motivo, fecha) {
    const tanques = await this.obtenerTanques();
    const t = tanques[producto] || { producto, capacidad: 1500, stock: 0 };
    const stockAnterior = t.stock;
    const nuevo = Math.max(0, Number(nuevoStock));
    const dif = Math.round((nuevo - stockAnterior) * 100) / 100;

    t.stock = nuevo;
    t.actualizado_el = new Date().toISOString();
    await IDB.put('tanques', t);

    // Registrar en auditoría de panel diario
    const fParts = (fecha || new Date().toISOString().split('T')[0]).split('-');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dObj = new Date(fecha || Date.now());
    const diaNombre = dias[dObj.getDay()] || 'Día';

    const mov = {
      id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      dia: diaNombre,
      fecha: `${fParts[2]}/${fParts[1]}`,
      anio: parseInt(fParts[0], 10),
      fecha_completa: fecha,
      tipo: producto,
      cantidad: Math.abs(dif),
      diferencia: dif,
      operacion: motivo || (dif >= 0 ? 'Recepción de Combustible / Ajuste' : 'Ajuste Varillaje'),
      cliente: 'CONTROL INTERNO',
      stock_resultante: nuevo,
      creado_el: new Date().toISOString()
    };

    await IDB.add('movimientos_tanque', mov);
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async obtenerSiguienteVale() {
    const vales = await IDB.getAll('vales');
    if (!vales.length) return 401;
    const max = Math.max(...vales.map(v => Number(v.n_vale) || 0));
    return max >= 401 ? max + 1 : 401;
  },

  async registrarVale(vale) {
    vale.id = vale.id ? Number(vale.id) : Date.now();
    vale.lugar = SEDE_OFICIAL;
    vale.creado_el = vale.creado_el || new Date().toISOString();
    vale.actualizado_el = new Date().toISOString();

    // Guardar vale
    await IDB.put('vales', vale);

    // Descontar inventario de tanque si no está anulado
    if (vale.estado !== 'ANULADO') {
      const tanques = await this.obtenerTanques();
      if (tanques[vale.producto]) {
        const t = tanques[vale.producto];
        const stockPrevio = t.stock;
        t.stock = this.restarStock(t.stock, vale.cantidad);
        t.actualizado_el = new Date().toISOString();
        await IDB.put('tanques', t);

        // Registrar en panel diario
        const fParts = (vale.fecha || new Date().toISOString().split('T')[0]).split('-');
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dObj = new Date(vale.fecha);
        const diaNombre = dias[dObj.getDay()] || 'Día';

        const mov = {
          id: 'mov_v_' + vale.id,
          dia: diaNombre,
          fecha: `${fParts[2]}/${fParts[1]}`,
          anio: parseInt(fParts[0], 10),
          fecha_completa: vale.fecha,
          tipo: vale.producto,
          cantidad: Number(vale.cantidad),
          diferencia: -Number(vale.cantidad),
          operacion: `Despacho Vale #${vale.n_vale} (${vale.turno})`,
          cliente: vale.cliente,
          stock_resultante: t.stock,
          creado_el: new Date().toISOString()
        };
        await IDB.put('movimientos_tanque', mov);
      }
    }

    // Agregar cliente o personal a listas maestras si no están
    const cfg = await this.obtenerConfiguracion();
    let modCfg = false;
    if (vale.cliente && !cfg.clientes.includes(vale.cliente)) {
      cfg.clientes.push(vale.cliente);
      modCfg = true;
    }
    if (vale.grifero && !cfg.personal.includes(vale.grifero)) {
      cfg.personal.push(vale.grifero);
      modCfg = true;
    }
    if (modCfg) await this.guardarConfiguracion(cfg);

    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
    return vale.id;
  },

  async anularVale(id, motivo) {
    const v = await IDB.get('vales', Number(id));
    if (!v) return;
    if (v.estado === 'ANULADO') return;

    // Reponer combustible al tanque
    const tanques = await this.obtenerTanques();
    if (tanques[v.producto]) {
      const t = tanques[v.producto];
      t.stock = this.sumarStock(t.stock, v.cantidad, t.capacidad);
      t.actualizado_el = new Date().toISOString();
      await IDB.put('tanques', t);

      // Movimiento auditoría
      const fParts = v.fecha.split('-');
      const mov = {
        id: 'mov_anul_' + v.id,
        dia: 'Anulado',
        fecha: `${fParts[2]}/${fParts[1]}`,
        anio: parseInt(fParts[0], 10),
        fecha_completa: v.fecha,
        tipo: v.producto,
        cantidad: Number(v.cantidad),
        diferencia: Number(v.cantidad),
        operacion: `Reposición por Vale #${v.n_vale} Anulado (${motivo || 'Error'})`,
        cliente: v.cliente,
        stock_resultante: t.stock,
        creado_el: new Date().toISOString()
      };
      await IDB.put('movimientos_tanque', mov);
    }

    v.estado = 'ANULADO';
    v.observacion = (v.observacion ? v.observacion + ' | ' : '') + `ANULADO: ${motivo || 'Sin detalle'}`;
    v.actualizado_el = new Date().toISOString();
    await IDB.put('vales', v);

    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async eliminarVale(id) {
    await IDB.delete('vales', Number(id));
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async obtenerMetricas() {
    const [vales, tanques] = await Promise.all([
      IDB.getAll('vales'),
      this.obtenerTanques()
    ]);

    let dieselGln = 0, dieselSoles = 0;
    let premiumGln = 0, premiumSoles = 0;
    let regularGln = 0, regularSoles = 0;
    let totalGln = 0, totalSoles = 0;
    let pendienteSoles = 0, cantPendientes = 0;
    let facturadoSoles = 0, cantFacturados = 0;
    let anulados = 0;

    const rankingCliMap = {};
    const rankingGrifMap = {};

    vales.forEach(v => {
      const isAnulado = v.estado === 'ANULADO';
      if (isAnulado) {
        anulados++;
        return;
      }

      const cant = Number(v.cantidad) || 0;
      const tot = Number(v.total) || 0;

      totalGln += cant;
      totalSoles += tot;

      if (v.producto === 'DIESEL B5-S50') {
        dieselGln += cant;
        dieselSoles += tot;
      } else if (v.producto === 'GASOHOL PREMIUM') {
        premiumGln += cant;
        premiumSoles += tot;
      } else if (v.producto === 'GASOHOL REGULAR') {
        regularGln += cant;
        regularSoles += tot;
      }

      if (v.estado === 'PENDIENTE') {
        pendienteSoles += tot;
        cantPendientes++;
      } else if (v.estado === 'FACTURADO') {
        facturadoSoles += tot;
        cantFacturados++;
      }

      // Ranking Clientes
      const cli = v.cliente || 'VARIOS';
      if (!rankingCliMap[cli]) {
        rankingCliMap[cli] = {
          cliente: cli,
          valesTotales: 0,
          valesPendientes: 0,
          totalGln: 0,
          totalSoles: 0,
          deudaSoles: 0,
          telefono: v.telefono || '',
          lugar: SEDE_OFICIAL
        };
      }
      rankingCliMap[cli].valesTotales++;
      rankingCliMap[cli].totalGln += cant;
      rankingCliMap[cli].totalSoles += tot;
      if (v.estado === 'PENDIENTE') {
        rankingCliMap[cli].valesPendientes++;
        rankingCliMap[cli].deudaSoles += tot;
      }
      if (v.telefono && !rankingCliMap[cli].telefono) rankingCliMap[cli].telefono = v.telefono;

      // Ranking Personal
      const grif = v.grifero || 'YANET';
      if (!rankingGrifMap[grif]) {
        rankingGrifMap[grif] = { personal: grif, vales: 0, galones: 0, soles: 0 };
      }
      rankingGrifMap[grif].vales++;
      rankingGrifMap[grif].galones += cant;
      rankingGrifMap[grif].soles += tot;
    });

    const rankingClientes = Object.values(rankingCliMap).sort((a, b) => b.totalSoles - a.totalSoles);
    const rankingPersonal = Object.values(rankingGrifMap).sort((a, b) => b.soles - a.soles);

    return {
      dieselGln, dieselSoles,
      premiumGln, premiumSoles,
      regularGln, regularSoles,
      totalGln, totalSoles,
      pendienteSoles, cantPendientes,
      facturadoSoles, cantFacturados,
      anulados,
      totalVales: vales.length,
      rankingClientes,
      rankingPersonal,
      tanques
    };
  }
};

// ========================================================
//  SINCRONIZACIÓN Y REALTIME CON SUPABASE CLOUD
// ========================================================
async function verificarSupabase(mostrarToast = false) {
  if (!_supa) {
    actualizarBadgesSupabase(false);
    return false;
  }

  try {
    const { data, error } = await _supa.from('vales').select('id').limit(1);
    if (error) {
      actualizarBadgesSupabase(false);
      const banner = document.getElementById('bannerSupaAlerta');
      if (banner) banner.style.display = 'flex';
      if (mostrarToast) {
        alert("Las tablas aún no están creadas en tu proyecto de Supabase. Abre el configurador y ejecuta el script SQL en Supabase (1 clic).");
        abrirModalSupabase();
      }
      return false;
    }

    _supaOnline = true;
    actualizarBadgesSupabase(true);
    const banner = document.getElementById('bannerSupaAlerta');
    if (banner) banner.style.display = 'none';

    iniciarRealtimeSupabase();

    if (mostrarToast) {
      mostrarNotificacionToast("☁️ ¡Conectado exitosamente a Supabase Cloud!");
    }
    return true;
  } catch (err) {
    actualizarBadgesSupabase(false);
    return false;
  }
}

function actualizarBadgesSupabase(online) {
  _supaOnline = online;
  const navStatus = document.getElementById('sidebarSupaStatus');
  const navDot = document.getElementById('sidebarSupaDot');
  const mobileDot = document.getElementById('mobileSupaDot');
  const modalBadge = document.getElementById('modalSupaStatusBadge');

  if (navStatus) navStatus.textContent = online ? 'Supabase En Línea' : 'Supabase (Modo Local)';
  if (navDot) navDot.style.background = online ? '#4ADE80' : '#F59E0B';
  if (mobileDot) mobileDot.style.background = online ? '#4ADE80' : '#F59E0B';

  if (modalBadge) {
    if (online) {
      modalBadge.textContent = '🟢 En Línea y Conectado';
      modalBadge.style.background = '#DCFCE7';
      modalBadge.style.color = '#15803D';
    } else {
      modalBadge.textContent = '🟡 Modo Local (Pendiente SQL)';
      modalBadge.style.background = '#FEF3C7';
      modalBadge.style.color = '#B45309';
    }
  }
}

function iniciarRealtimeSupabase() {
  if (!_supa || _realtimeCanal) return;
  try {
    _realtimeCanal = _supa
      .channel('cambios-estacion-sullcairi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vales' }, payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          IDB.put('vales', payload.new).then(() => {
            if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
          });
        } else if (payload.eventType === 'DELETE' && payload.old) {
          IDB.delete('vales', payload.old.id).then(() => {
            if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tanques' }, payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          IDB.put('tanques', payload.new).then(() => {
            if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
          });
        }
      })
      .subscribe();
  } catch (e) {
    console.warn('[Realtime] Error:', e);
  }
}

async function sincronizarConSupabase(mostrarFeedback = true) {
  if (!_supa) {
    if (mostrarFeedback) alert("Cliente Supabase no disponible.");
    return;
  }

  const online = await verificarSupabase(false);
  if (!online) {
    if (mostrarFeedback) {
      alert("Aviso: No se pudo conectar a las tablas de Supabase. Copia el código SQL y pégalo en tu panel de Supabase.");
      abrirModalSupabase();
    }
    return;
  }

  if (mostrarFeedback) mostrarNotificacionToast("☁️ Sincronizando datos con Supabase Cloud...");

  try {
    // 1. Descargar vales remotos
    const { data: remotos, error: errVales } = await _supa.from('vales').select('*').order('fecha', { ascending: false });
    if (!errVales && Array.isArray(remotos)) {
      const locales = await IDB.getAll('vales');
      const mapa = new Map(locales.map(v => [Number(v.id), v]));

      remotos.forEach(vr => {
        if (!mapa.has(Number(vr.id))) {
          mapa.set(Number(vr.id), vr);
          IDB.put('vales', vr);
        }
      });

      // Subir vales locales a la nube por lotes
      const paraSubir = Array.from(mapa.values()).map(v => ({
        id: Number(v.id),
        fecha: v.fecha,
        n_vale: Number(v.n_vale),
        turno: v.turno,
        cliente: v.cliente,
        lugar: SEDE_OFICIAL,
        telefono: v.telefono || null,
        placa: v.placa || '-',
        conductor: v.conductor || '-',
        producto: v.producto,
        cantidad: Number(v.cantidad),
        precio: Number(v.precio),
        total: Number(v.total),
        grifero: v.grifero || 'YANET',
        estado: v.estado || 'PENDIENTE',
        observacion: v.observacion || ''
      }));

      for (let i = 0; i < paraSubir.length; i += 200) {
        await _supa.from('vales').upsert(paraSubir.slice(i, i + 200), { onConflict: 'id' });
      }
    }

    // 2. Subir tanques
    const tanques = await IDB.getAll('tanques');
    if (tanques.length > 0) {
      await _supa.from('tanques').upsert(tanques, { onConflict: 'producto' });
    }

    // 3. Subir configuración
    const cfg = await DB.obtenerConfiguracion();
    await _supa.from('configuracion').upsert(cfg, { onConflict: 'id' });

    if (mostrarFeedback) mostrarNotificacionToast("✅ ¡Sincronización completa con Supabase!");
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  } catch (err) {
    console.error('[Supabase Sync Error]', err);
    if (mostrarFeedback) alert("Error de sincronización: " + err.message);
  }
}

// Iniciar chequeo en fondo al cargar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    verificarSupabase(false);
  }, 1000);
});
