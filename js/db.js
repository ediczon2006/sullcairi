// ====================================================================
//  ESTACIÓN DE SERVICIOS SULLCAIRI — CAPA DE DATOS HÍBRIDA EMPRESARIAL
//  IndexedDB (100% Offline-First) + Supabase Cloud (gtfmhtrvsbfcftstbadj)
//  Sede Oficial Inmutable: jesus_de_lauricocha_huanuco
// ====================================================================

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

// SEED INICIAL DE TANQUES (6,000 GL Capacidad Total)
const TANQUES_DEFAULT = {
  'DIESEL B5-S50':   { producto: 'DIESEL B5-S50', capacidad: 3000, stock: 2150, alerta_naranja: 500, alerta_roja: 250, unidad: 'Gln' },
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

// ====================================================================
// USUARIOS Y CÓDIGOS OFICIALES DE PRODUCCIÓN (NO DEMO)
// 1. ADMIN (Administrador General): PIN 849201
// 2. YANET (Personal de Atención T1): PIN 713824
// 3. CRESILDO (Personal de Atención T2): PIN 582941
// 4. YAMILEX (Personal de Atención T3): PIN 936172
// ====================================================================
const USUARIOS_DEFAULT = [
  {
    usuario: 'ADMIN',
    nombre: 'Administrador de Estación',
    rol: 'ADMIN',
    pin_hash: 'f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf', // PIN: 849201
    activo: true
  },
  {
    usuario: 'YANET',
    nombre: 'Yanet Quispe',
    rol: 'OPERADOR',
    pin_hash: '551e64290af89b026ed20617797ffe2b7cdcbcd401d894d105308089c86b3bf8', // PIN: 713824
    activo: true
  },
  {
    usuario: 'CRESILDO',
    nombre: 'Cresildo Alvarado',
    rol: 'OPERADOR',
    pin_hash: '45ee58c792f5a8b094a5126d33af19b0501b59782f92a0b1cdcc4834bb31f48c', // PIN: 582941
    activo: true
  },
  {
    usuario: 'YAMILEX',
    nombre: 'Yamilex Soto',
    rol: 'OPERADOR',
    pin_hash: '3f9e0144391381255366e5b359bd59a6ba7a6c53afd8eda48f6ea311a7b6b155', // PIN: 936172
    activo: true
  }
];

// PIN ADMIN POR DEFECTO: 849201 (SHA-256)
const DEFAULT_PIN_HASH = "f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf";

// ====================================================================
//  MOTOR INDEXEDDB CON TRANSACCIONES SEGURAS
// ====================================================================
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
        await seedInitialData();
        resolve(_db);
      };

      req.onerror = e => reject(e.target.error);
    });
  }

  async function seedInitialData() {
    try {
      const tx = _db.transaction(['tanques', 'configuracion'], 'readwrite');
      const storeT = tx.objectStore('tanques');
      const storeC = tx.objectStore('configuracion');

      const countTReq = storeT.count();
      countTReq.onsuccess = () => {
        if (countTReq.result === 0) {
          Object.values(TANQUES_DEFAULT).forEach(t => storeT.put(t));
        }
      };

      const getCfgReq = storeC.get('sullcairi_config');
      getCfgReq.onsuccess = () => {
        if (!getCfgReq.result) {
          storeC.put({
            id: 'sullcairi_config',
            estacion_nombre: 'ESTACIÓN DE SERVICIOS SULLCAIRI',
            ruc: '20608945123',
            telefono: '962123456',
            sede: SEDE_OFICIAL,
            precio_diesel: PRECIOS_DEFAULT['DIESEL B5-S50'],
            precio_premium: PRECIOS_DEFAULT['GASOHOL PREMIUM'],
            precio_regular: PRECIOS_DEFAULT['GASOHOL REGULAR'],
            pin_hash: DEFAULT_PIN_HASH,
            usuarios: USUARIOS_DEFAULT,
            actualizado_el: new Date().toISOString()
          });
        }
      };
    } catch (_) {}
  }

  async function db() {
    if (_db) return _db;
    return await open();
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

// ====================================================================
//  FACHADA DE CONTROL Y NEGOCIO DE LA ESTACIÓN (DB)
// ====================================================================
const DB = {
  // Generador de ID a prueba de colisiones
  generarIdUnico() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      const hex = crypto.randomUUID().replace(/\D/g, '').slice(0, 15);
      return Number(Date.now().toString().slice(0, 8) + hex.slice(0, 6));
    }
    return Date.now() + Math.floor(Math.random() * 10000);
  },

  generarIdMovimiento() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'mov_' + crypto.randomUUID();
    }
    return 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  },

  // Clamping seguro contra desbordes numéricos y errores de coma flotante
  sumarStock(actual, delta, max) {
    const res = Math.round((Number(actual || 0) + Number(delta || 0)) * 100) / 100;
    return Math.max(0, Math.min(res, Number(max || 999999)));
  },

  restarStock(actual, delta) {
    const res = Math.round((Number(actual || 0) - Number(delta || 0)) * 100) / 100;
    return Math.max(0, res);
  },

  async obtenerConfiguracion() {
    let cfg = await IDB.get('configuracion', 'sullcairi_config');
    if (!cfg) {
      cfg = {
        id: 'sullcairi_config',
        estacion_nombre: 'ESTACIÓN DE SERVICIOS SULLCAIRI',
        ruc: '20608945123',
        telefono: '962123456',
        sede: SEDE_OFICIAL,
        precio_diesel: PRECIOS_DEFAULT['DIESEL B5-S50'],
        precio_premium: PRECIOS_DEFAULT['GASOHOL PREMIUM'],
        precio_regular: PRECIOS_DEFAULT['GASOHOL REGULAR'],
        pin_hash: DEFAULT_PIN_HASH,
        usuarios: USUARIOS_DEFAULT,
        actualizado_el: new Date().toISOString()
      };
      await IDB.put('configuracion', cfg);
    } else {
      // Migración defensiva: asegurar lista de usuarios oficiales y pin no demo
      let modificado = false;
      if (!cfg.usuarios || !Array.isArray(cfg.usuarios) || cfg.usuarios.length === 0) {
        cfg.usuarios = USUARIOS_DEFAULT;
        modificado = true;
      }
      if (cfg.pin_hash === "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4") {
        // Reemplazar viejo PIN demo 1234 por PIN oficial 849201
        cfg.pin_hash = DEFAULT_PIN_HASH;
        modificado = true;
      }
      if (modificado) {
        await IDB.put('configuracion', cfg);
      }
    }
    cfg.sede = SEDE_OFICIAL; // Inmutable
    return cfg;
  },

  async guardarConfiguracion(cfg) {
    cfg.id = 'sullcairi_config';
    cfg.sede = SEDE_OFICIAL;
    cfg.actualizado_el = new Date().toISOString();
    await IDB.put('configuracion', cfg);
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async obtenerUsuarios() {
    const cfg = await this.obtenerConfiguracion();
    return cfg.usuarios || USUARIOS_DEFAULT;
  },

  async autenticarUsuario(usuarioId, pinIngresado) {
    // 1. Verificar bloqueo por fuerza bruta
    if (typeof SullcairiSecurity !== 'undefined' && SullcairiSecurity.estaPinBloqueado) {
      const estadoBloqueo = SullcairiSecurity.estaPinBloqueado();
      if (estadoBloqueo.bloqueado) {
        throw new Error(`🔒 Acceso temporalmente bloqueado por seguridad. Intente nuevamente en ${estadoBloqueo.segundos} segundos.`);
      }
    }

    const uId = String(usuarioId).trim().toUpperCase();
    const pin = String(pinIngresado).trim();
    if (!pin) throw new Error("Debe ingresar un código PIN de acceso.");

    const usuarios = await this.obtenerUsuarios();
    const usuarioObj = usuarios.find(u => u.usuario.toUpperCase() === uId);

    if (!usuarioObj) {
      throw new Error(`Usuario "${uId}" no encontrado en el sistema.`);
    }

    const hashIngresado = await SullcairiSecurity.hashPin(pin);
    const cfg = await this.obtenerConfiguracion();

    // Verificación especial para ADMIN: valida contra su pin_hash o cfg.pin_hash
    let esValido = false;
    if (uId === 'ADMIN') {
      esValido = (hashIngresado === usuarioObj.pin_hash) || (hashIngresado === cfg.pin_hash);
    } else {
      esValido = (hashIngresado === usuarioObj.pin_hash);
    }

    // Registrar intento para protección anti-brute-force
    if (typeof SullcairiSecurity !== 'undefined' && SullcairiSecurity.registrarIntentoPin) {
      SullcairiSecurity.registrarIntentoPin(esValido);
    }

    if (!esValido) {
      return { ok: false, error: "Código PIN incorrecto. Acceso denegado." };
    }

    // Iniciar sesión exitosa
    if (typeof UserSession !== 'undefined') {
      UserSession.iniciar(usuarioObj.usuario, usuarioObj.nombre, usuarioObj.rol);
    }

    return {
      ok: true,
      usuario: usuarioObj.usuario,
      nombre: usuarioObj.nombre,
      rol: usuarioObj.rol
    };
  },

  async cambiarPinUsuario(usuarioId, pinActual, pinNuevo) {
    const uId = String(usuarioId).trim().toUpperCase();
    const pinN = String(pinNuevo).trim();

    if (!SullcairiSecurity.isValid.pin(pinN)) {
      throw new Error("El nuevo PIN debe tener entre 4 y 8 dígitos numéricos.");
    }

    // Si no es admin autenticado, validar pinActual
    if (!UserSession.esAdmin()) {
      const auth = await this.autenticarUsuario(uId, pinActual);
      if (!auth.ok) throw new Error("El PIN actual es incorrecto.");
    }

    const cfg = await this.obtenerConfiguracion();
    const usuarios = cfg.usuarios || [...USUARIOS_DEFAULT];
    const uIndex = usuarios.findIndex(u => u.usuario.toUpperCase() === uId);

    if (uIndex === -1) {
      throw new Error("Usuario no encontrado.");
    }

    const nuevoHash = await SullcairiSecurity.hashPin(pinN);
    usuarios[uIndex].pin_hash = nuevoHash;
    cfg.usuarios = usuarios;

    if (uId === 'ADMIN') {
      cfg.pin_hash = nuevoHash;
    }

    await this.guardarConfiguracion(cfg);
    return true;
  },

  async verificarPinAdmin(pinIngresado) {
    // 1. Verificar si está bloqueado por fuerza bruta
    if (typeof SullcairiSecurity !== 'undefined' && SullcairiSecurity.estaPinBloqueado) {
      const estadoBloqueo = SullcairiSecurity.estaPinBloqueado();
      if (estadoBloqueo.bloqueado) {
        throw new Error(`🔒 Acceso temporalmente bloqueado por seguridad. Intente nuevamente en ${estadoBloqueo.segundos} segundos.`);
      }
    }

    const cfg = await this.obtenerConfiguracion();
    const hash = await SullcairiSecurity.hashPin(pinIngresado);

    // Valida contra cfg.pin_hash o contra el usuario ADMIN
    const usuarios = cfg.usuarios || USUARIOS_DEFAULT;
    const adminUser = usuarios.find(u => u.usuario === 'ADMIN');
    const adminHash = adminUser ? adminUser.pin_hash : DEFAULT_PIN_HASH;

    const correcto = (hash === (cfg.pin_hash || DEFAULT_PIN_HASH)) || (hash === adminHash);

    // 2. Registrar intento en rate-limiter
    if (typeof SullcairiSecurity !== 'undefined' && SullcairiSecurity.registrarIntentoPin) {
      SullcairiSecurity.registrarIntentoPin(correcto);
    }

    if (correcto && typeof SullcairiSecurity !== 'undefined' && SullcairiSecurity.AdminSession) {
      SullcairiSecurity.AdminSession.iniciar();
    }

    return correcto;
  },

  async cambiarPinAdmin(pinActual, pinNuevo) {
    const valido = await this.verificarPinAdmin(pinActual);
    if (!valido) throw new Error("El PIN actual es incorrecto.");
    if (!SullcairiSecurity.isValid.pin(pinNuevo)) throw new Error("El nuevo PIN debe tener entre 4 y 8 dígitos.");
    const nuevoHash = await SullcairiSecurity.hashPin(pinNuevo);
    const cfg = await this.obtenerConfiguracion();
    cfg.pin_hash = nuevoHash;

    const usuarios = cfg.usuarios || [...USUARIOS_DEFAULT];
    const adminIdx = usuarios.findIndex(u => u.usuario === 'ADMIN');
    if (adminIdx !== -1) {
      usuarios[adminIdx].pin_hash = nuevoHash;
      cfg.usuarios = usuarios;
    }

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

  async obtenerSiguienteVale() {
    const vales = await IDB.getAll('vales');
    if (!vales.length) return 1001;
    const max = Math.max(...vales.map(v => Number(v.n_vale) || 0));
    return max >= 1001 ? max + 1 : 1001;
  },

  async listarVales() {
    const vales = await IDB.getAll('vales');
    return vales.sort((a, b) => {
      const fA = a.fecha || '';
      const fB = b.fecha || '';
      if (fA !== fB) return fB.localeCompare(fA);
      return (Number(b.n_vale) || 0) - (Number(a.n_vale) || 0);
    });
  },

  // Registro y Edición de Vale con Bloqueo de Manipulación de Campos
  async guardarVale(vale) {
    if (!vale) throw new Error("Datos de vale vacíos.");

    // Validar cantidad y precio
    const cantidad = parseFloat(vale.cantidad);
    const precio = parseFloat(vale.precio);
    if (!SullcairiSecurity.isValid.cantidad(cantidad)) {
      throw new Error("Cantidad de galones inválida.");
    }
    if (!SullcairiSecurity.isValid.precio(precio)) {
      throw new Error("Precio unitario inválido.");
    }

    // BLOQUEO ESTRICTO: El total SIEMPRE se calcula en backend/lógica de datos
    const totalCalculado = Math.round(cantidad * precio * 100) / 100;

    const id = vale.id ? Number(vale.id) : this.generarIdUnico();
    const esNuevo = !vale.id;

    // Verificar si es edición para calcular delta de combustible
    let valePrevio = null;
    if (!esNuevo) {
      valePrevio = await IDB.get('vales', id);
    }

    const valeFinal = {
      id,
      fecha: vale.fecha,
      fecha_recojo: vale.fecha_recojo || vale.fecha,
      n_vale: Number(vale.n_vale),
      turno: vale.turno || 'T1 (Mañana)',
      cliente: SullcairiSecurity.sanitize(vale.cliente || 'VENTA DIARIA'),
      lugar: SEDE_OFICIAL, // Inmutable
      telefono: SullcairiSecurity.sanitize(vale.telefono || ''),
      placa: SullcairiSecurity.sanitize(vale.placa || '-'),
      conductor: SullcairiSecurity.sanitize(vale.conductor || '-'),
      producto: vale.producto,
      cantidad,
      precio,
      total: totalCalculado,
      grifero: SullcairiSecurity.sanitize(vale.grifero || 'YANET'),
      estado: vale.estado || 'PENDIENTE',
      observacion: SullcairiSecurity.sanitize(vale.observacion || ''),
      creado_el: vale.creado_el || new Date().toISOString(),
      actualizado_el: new Date().toISOString()
    };

    // Actualizar stock de tanques
    const tanques = await this.obtenerTanques();
    const t = tanques[valeFinal.producto];

    if (t) {
      if (esNuevo && valeFinal.estado !== 'ANULADO') {
        t.stock = this.restarStock(t.stock, valeFinal.cantidad);
        t.actualizado_el = new Date().toISOString();
        await IDB.put('tanques', t);

        // Auditoría
        const dObj = new Date(valeFinal.fecha);
        const mov = {
          id: this.generarIdMovimiento(),
          fecha_completa: new Date().toISOString(),
          dia: dObj.getUTCDate() || 1,
          mes: (dObj.getUTCMonth() + 1) || 1,
          ano: dObj.getUTCFullYear() || 2026,
          producto: valeFinal.producto,
          tipo: 'DESPACHO',
          cantidad: -valeFinal.cantidad,
          saldo: t.stock,
          motivo: `Vale #${valeFinal.n_vale} - ${valeFinal.cliente}`,
          responsable: valeFinal.grifero
        };
        await IDB.put('movimientos_tanque', mov);
      } else if (!esNuevo && valePrevio) {
        // Revertir previo si estaba activo y aplicar nuevo si está activo
        let stockTemp = t.stock;
        if (valePrevio.estado !== 'ANULADO') {
          stockTemp = this.sumarStock(stockTemp, valePrevio.cantidad, t.capacidad);
        }
        if (valeFinal.estado !== 'ANULADO') {
          stockTemp = this.restarStock(stockTemp, valeFinal.cantidad);
        }
        t.stock = stockTemp;
        t.actualizado_el = new Date().toISOString();
        await IDB.put('tanques', t);
      }
    }

    await IDB.put('vales', valeFinal);
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
    return valeFinal;
  },

  // Alias para compatibilidad
  async registrarVale(vale) {
    return await this.guardarVale(vale);
  },

  async actualizarEstadoVale(id, nuevoEstado) {
    const v = await IDB.get('vales', Number(id));
    if (!v) throw new Error("Vale no encontrado.");

    const estadoAnterior = v.estado;
    if (estadoAnterior === nuevoEstado) return;

    v.estado = nuevoEstado;
    v.actualizado_el = new Date().toISOString();

    const tanques = await this.obtenerTanques();
    const t = tanques[v.producto];

    if (t) {
      if (nuevoEstado === 'ANULADO' && estadoAnterior !== 'ANULADO') {
        // Reponer combustible al tanque con límite seguro
        t.stock = this.sumarStock(t.stock, v.cantidad, t.capacidad);
        t.actualizado_el = new Date().toISOString();
        await IDB.put('tanques', t);

        const dObj = new Date();
        const mov = {
          id: this.generarIdMovimiento(),
          fecha_completa: dObj.toISOString(),
          dia: dObj.getDate(),
          mes: dObj.getMonth() + 1,
          ano: dObj.getFullYear(),
          producto: v.producto,
          tipo: 'ANULACION',
          cantidad: v.cantidad,
          saldo: t.stock,
          motivo: `Anulación Vale #${v.n_vale}`,
          responsable: v.grifero || 'ADMINISTRADOR'
        };
        await IDB.put('movimientos_tanque', mov);
      } else if (estadoAnterior === 'ANULADO' && nuevoEstado !== 'ANULADO') {
        // Descontar nuevamente
        t.stock = this.restarStock(t.stock, v.cantidad);
        t.actualizado_el = new Date().toISOString();
        await IDB.put('tanques', t);
      }
    }

    await IDB.put('vales', v);
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async eliminarVale(id) {
    const v = await IDB.get('vales', Number(id));
    if (v && v.estado !== 'ANULADO') {
      const tanques = await this.obtenerTanques();
      const t = tanques[v.producto];
      if (t) {
        t.stock = this.sumarStock(t.stock, v.cantidad, t.capacidad);
        t.actualizado_el = new Date().toISOString();
        await IDB.put('tanques', t);
      }
    }
    await IDB.delete('vales', Number(id));
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async registrarVarillajeFisico(producto, nuevoStock, motivo, responsable) {
    const tanques = await this.obtenerTanques();
    const t = tanques[producto] || { producto, capacidad: 1500, stock: 0 };
    const stockAnterior = t.stock;
    const nuevo = Math.max(0, Math.min(Number(nuevoStock), t.capacidad));
    const dif = Math.round((nuevo - stockAnterior) * 100) / 100;

    t.stock = nuevo;
    t.actualizado_el = new Date().toISOString();
    await IDB.put('tanques', t);

    const dObj = new Date();
    const mov = {
      id: this.generarIdMovimiento(),
      fecha_completa: dObj.toISOString(),
      dia: dObj.getDate(),
      mes: dObj.getMonth() + 1,
      ano: dObj.getFullYear(),
      producto,
      tipo: dif >= 0 ? 'INGRESO / AJUSTE' : 'MERMA / AJUSTE',
      cantidad: dif,
      saldo: nuevo,
      motivo: motivo || 'Varillaje Físico',
      responsable: responsable || 'ADMINISTRADOR'
    };

    await IDB.put('movimientos_tanque', mov);
    if (typeof window.onDatosActualizados === 'function') window.onDatosActualizados();
  },

  async modificarStockTanque(producto, nuevoStock, motivo, fecha) {
    return await this.registrarVarillajeFisico(producto, nuevoStock, motivo, 'ADMINISTRADOR');
  },

  async obtenerResumenGeneral() {
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
      if (v.estado === 'ANULADO') {
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
  },

  async obtenerMetricas() {
    return await this.obtenerResumenGeneral();
  }
};

// ====================================================================
//  SINCRONIZACIÓN Y REALTIME CON SUPABASE CLOUD
// ====================================================================
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

      // Subir vales locales a la nube por lotes con cálculo forzado
      const paraSubir = Array.from(mapa.values()).map(v => {
        const cant = Number(v.cantidad);
        const prec = Number(v.precio);
        const tot = Math.round(cant * prec * 100) / 100;
        return {
          id: Number(v.id),
          fecha: v.fecha,
          fecha_recojo: v.fecha_recojo || v.fecha,
          n_vale: Number(v.n_vale),
          turno: v.turno,
          cliente: v.cliente,
          lugar: SEDE_OFICIAL,
          telefono: v.telefono || null,
          placa: v.placa || '-',
          conductor: v.conductor || '-',
          producto: v.producto,
          cantidad: cant,
          precio: prec,
          total: tot,
          grifero: v.grifero || 'YANET',
          estado: v.estado || 'PENDIENTE',
          observacion: v.observacion || ''
        };
      });

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
