/**
 * ============================================================================
 * CONECTOR Y SINCRONIZADOR SUPABASE CLOUD (js/supabase_client.js)
 * Estación de Servicios Sullcairi - Proyecto: gtfmhtrvsbfcftstbadj
 * Modo Híbrido: Offline-First (LocalStorage) + Realtime Cloud (Supabase)
 * ============================================================================
 */

const SUPA_URL = 'https://gtfmhtrvsbfcftstbadj.supabase.co';
const SUPA_KEY = 'sb_publishable_jLqnXfwQ2Zksb_fvuympjQ_v2OR8F8x';
const SUPA_PROJECT_ID = 'gtfmhtrvsbfcftstbadj';

let _supa = null;
let _supaOnline = false;
let _supaIniciado = false;
let _realtimeCanal = null;

// SCRIPT SQL DE MIGRACIÓN PARA SUPABASE
const SUPABASE_SETUP_SQL = `-- SISTEMA ESTACIÓN DE SERVICIOS SULLCAIRI - ESQUEMA SUPABASE CLOUD
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA DE VALES DE COMBUSTIBLE
CREATE TABLE IF NOT EXISTS public.vales (
  id BIGINT PRIMARY KEY,
  fecha DATE NOT NULL,
  n_vale INTEGER NOT NULL,
  turno VARCHAR(50) DEFAULT 'T1 (Mañana)',
  cliente TEXT NOT NULL,
  lugar VARCHAR(120) DEFAULT 'jesus_de_lauricocha_huanuco',
  telefono VARCHAR(30),
  placa VARCHAR(20),
  conductor VARCHAR(120),
  producto VARCHAR(60) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad >= 0),
  precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  grifero VARCHAR(60),
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'FACTURADO', 'ANULADO')),
  observacion TEXT,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW()),
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

-- 2. TABLA DE TANQUES DE ALMACENAMIENTO
CREATE TABLE IF NOT EXISTS public.tanques (
  producto VARCHAR(60) PRIMARY KEY,
  capacidad NUMERIC(10,2) NOT NULL,
  stock NUMERIC(10,2) NOT NULL,
  alerta_naranja NUMERIC(10,2) DEFAULT 500,
  alerta_roja NUMERIC(10,2) DEFAULT 250,
  unidad VARCHAR(10) DEFAULT 'Gln',
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

-- 3. TABLA DE AUDITORÍA Y PANEL DE MOVIMIENTOS DIARIOS
CREATE TABLE IF NOT EXISTS public.movimientos_tanque (
  id TEXT PRIMARY KEY,
  dia VARCHAR(20),
  fecha VARCHAR(20),
  anio INTEGER,
  fecha_completa DATE,
  tipo VARCHAR(60),
  cantidad NUMERIC(10,2),
  diferencia NUMERIC(10,2) DEFAULT 0,
  operacion TEXT,
  cliente TEXT,
  stock_resultante NUMERIC(10,2),
  creado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

-- 4. TABLA DE CONFIGURACIÓN Y TARIFARIO
CREATE TABLE IF NOT EXISTS public.configuracion (
  id VARCHAR(20) PRIMARY KEY DEFAULT 'principal',
  empresa TEXT NOT NULL DEFAULT 'ESTACIÓN DE SERVICIOS SULLCAIRI',
  ruc VARCHAR(20) DEFAULT '20608945123',
  direccion VARCHAR(120) DEFAULT 'jesus_de_lauricocha_huanuco',
  telefono VARCHAR(30) DEFAULT '962123456',
  admin_pin_hash TEXT,
  precios JSONB,
  clientes JSONB,
  personal JSONB,
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.vales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_tanque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Limpieza y creación de políticas públicas anon / authenticated
DROP POLICY IF EXISTS "Permitir select vales" ON public.vales;
DROP POLICY IF EXISTS "Permitir insert vales" ON public.vales;
DROP POLICY IF EXISTS "Permitir update vales" ON public.vales;
DROP POLICY IF EXISTS "Permitir delete vales" ON public.vales;

CREATE POLICY "Permitir select vales" ON public.vales FOR SELECT USING (true);
CREATE POLICY "Permitir insert vales" ON public.vales FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update vales" ON public.vales FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete vales" ON public.vales FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir select tanques" ON public.tanques;
DROP POLICY IF EXISTS "Permitir insert tanques" ON public.tanques;
DROP POLICY IF EXISTS "Permitir update tanques" ON public.tanques;

CREATE POLICY "Permitir select tanques" ON public.tanques FOR SELECT USING (true);
CREATE POLICY "Permitir insert tanques" ON public.tanques FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update tanques" ON public.tanques FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir select movimientos" ON public.movimientos_tanque;
DROP POLICY IF EXISTS "Permitir insert movimientos" ON public.movimientos_tanque;
DROP POLICY IF EXISTS "Permitir delete movimientos" ON public.movimientos_tanque;

CREATE POLICY "Permitir select movimientos" ON public.movimientos_tanque FOR SELECT USING (true);
CREATE POLICY "Permitir insert movimientos" ON public.movimientos_tanque FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir delete movimientos" ON public.movimientos_tanque FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir select configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Permitir insert configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Permitir update configuracion" ON public.configuracion;

CREATE POLICY "Permitir select configuracion" ON public.configuracion FOR SELECT USING (true);
CREATE POLICY "Permitir insert configuracion" ON public.configuracion FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update configuracion" ON public.configuracion FOR UPDATE USING (true) WITH CHECK (true);

-- Activar Realtime en Supabase
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vales, public.tanques, public.movimientos_tanque, public.configuracion;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Datos iniciales oficiales de tanques
INSERT INTO public.tanques (producto, capacidad, stock, alerta_naranja, alerta_roja, unidad)
VALUES 
  ('DIESEL B5-S50', 3000, 2150, 500, 250, 'Gln'),
  ('GASOHOL PREMIUM', 1500, 1100, 500, 250, 'Gln'),
  ('GASOHOL REGULAR', 1500, 980, 500, 250, 'Gln')
ON CONFLICT (producto) DO NOTHING;
`;

// Inicializar cliente Supabase
function obtenerClienteSupabase() {
  if (!_supa && typeof supabase !== 'undefined' && supabase.createClient) {
    try {
      _supa = supabase.createClient(SUPA_URL, SUPA_KEY, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      _supaIniciado = true;
    } catch (e) {
      console.warn("[Supabase] No se pudo inicializar:", e);
    }
  }
  return _supa;
}

// Verificar conexión y estado de tablas
async function verificarSupabase(mostrarToast = false) {
  const client = obtenerClienteSupabase();
  if (!client) {
    actualizarBadgesSupabase(false);
    return false;
  }

  try {
    const { data, error } = await client.from('vales').select('id').limit(1);
    if (error) {
      actualizarBadgesSupabase(false);
      const banner = document.getElementById('bannerSupaAlerta');
      if (banner) banner.style.display = 'flex';
      if (mostrarToast) {
        alert("Aviso: Las tablas aún no están creadas en tu proyecto de Supabase. Abre el configurador y copia el código SQL para crearlas con un clic.");
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
      if (typeof App !== 'undefined' && App.mostrarToast) {
        App.mostrarToast("☁️ ¡Conectado exitosamente a Supabase Cloud!");
      } else {
        alert("¡Conexión exitosa a Supabase Cloud!");
      }
    }
    return true;
  } catch (err) {
    actualizarBadgesSupabase(false);
    return false;
  }
}

function actualizarBadgesSupabase(online) {
  _supaOnline = online;
  const navStatus = document.getElementById('nav-supa-badge');
  const modalStatus = document.getElementById('modalSupaStatusBadge');

  if (navStatus) {
    if (online) {
      navStatus.innerHTML = '☁️ Supabase: <span style="color:#4ade80;font-weight:800;">En Línea</span>';
      navStatus.style.borderColor = 'rgba(74, 222, 128, 0.4)';
    } else {
      navStatus.innerHTML = '☁️ Supabase: <span style="color:#fbbf24;font-weight:700;">Modo Local</span>';
      navStatus.style.borderColor = 'rgba(251, 191, 36, 0.4)';
    }
  }

  if (modalStatus) {
    if (online) {
      modalStatus.textContent = '🟢 En Línea y Conectado';
      modalStatus.style.background = '#dcfce7';
      modalStatus.style.color = '#15803d';
    } else {
      modalStatus.textContent = '🟡 Modo Local (Pendiente SQL)';
      modalStatus.style.background = '#fef3c7';
      modalStatus.style.color = '#b45309';
    }
  }
}

// Suscripción Realtime a cambios en Supabase
function iniciarRealtimeSupabase() {
  const client = obtenerClienteSupabase();
  if (!client || _realtimeCanal) return;

  try {
    _realtimeCanal = client
      .channel('cambios-estacion-sullcairi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vales' }, payload => {
        procesarCambioRealtimeVales(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tanques' }, payload => {
        procesarCambioRealtimeTanques(payload);
      })
      .subscribe();
  } catch (err) {
    console.warn("[Realtime] Error al suscribir canal:", err);
  }
}

function procesarCambioRealtimeVales(payload) {
  if (typeof Store === 'undefined') return;
  const state = Store.getState();
  const currentVales = state.vales || [];

  if (payload.eventType === 'INSERT') {
    const v = payload.new;
    if (!currentVales.some(item => Number(item.id) === Number(v.id))) {
      currentVales.unshift(v);
      localStorage.setItem('grifo_erp_jesus_state', JSON.stringify({ ...state, vales: currentVales }));
      Store.init();
    }
  } else if (payload.eventType === 'UPDATE') {
    const v = payload.new;
    const idx = currentVales.findIndex(item => Number(item.id) === Number(v.id));
    if (idx !== -1) {
      currentVales[idx] = v;
      localStorage.setItem('grifo_erp_jesus_state', JSON.stringify({ ...state, vales: currentVales }));
      Store.init();
    }
  } else if (payload.eventType === 'DELETE') {
    const deletedId = payload.old ? payload.old.id : null;
    if (deletedId) {
      const filtered = currentVales.filter(item => Number(item.id) !== Number(deletedId));
      localStorage.setItem('grifo_erp_jesus_state', JSON.stringify({ ...state, vales: filtered }));
      Store.init();
    }
  }
}

function procesarCambioRealtimeTanques(payload) {
  if (typeof Store === 'undefined') return;
  if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
    const t = payload.new;
    const state = Store.getState();
    if (state.tanques && state.tanques[t.producto]) {
      state.tanques[t.producto].stock = Number(t.stock);
      state.tanques[t.producto].capacidad = Number(t.capacidad);
      localStorage.setItem('grifo_erp_jesus_state', JSON.stringify(state));
      Store.init();
    }
  }
}

// Sincronización Bidireccional
async function sincronizarConSupabase(mostrarFeedback = true) {
  const client = obtenerClienteSupabase();
  if (!client) {
    if (mostrarFeedback) alert("Cliente Supabase no inicializado en el navegador.");
    return;
  }

  const online = await verificarSupabase(false);
  if (!online) {
    if (mostrarFeedback) {
      alert("Aviso: No se pudo conectar a las tablas de Supabase. Por favor abra el configurador y pegue el código SQL en su Dashboard de Supabase.");
      abrirModalSupabase();
    }
    return;
  }

  if (mostrarFeedback && typeof App !== 'undefined' && App.mostrarToast) {
    App.mostrarToast("☁️ Sincronizando datos con Supabase Cloud...");
  }

  try {
    const state = Store.getState();

    // 1. DESCARGAR VALES REMOTOS DE SUPABASE
    const { data: valesRemotos, error: errVales } = await client.from('vales').select('*').order('fecha', { ascending: false });
    if (!errVales && Array.isArray(valesRemotos)) {
      const mapaLocal = new Map((state.vales || []).map(v => [Number(v.id), v]));
      
      // Anexar vales remotos que no estén en local
      valesRemotos.forEach(vr => {
        if (!mapaLocal.has(Number(vr.id))) {
          mapaLocal.set(Number(vr.id), vr);
        }
      });

      // 2. SUBIR VALES LOCALES A SUPABASE (Upsert masivo)
      const valesParaSubir = Array.from(mapaLocal.values()).map(v => ({
        id: Number(v.id),
        fecha: v.fecha,
        n_vale: Number(v.n_vale),
        turno: v.turno,
        cliente: v.cliente,
        lugar: 'jesus_de_lauricocha_huanuco',
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

      if (valesParaSubir.length > 0) {
        // Enviar por lotes de 200 para evitar timeout
        for (let i = 0; i < valesParaSubir.length; i += 200) {
          const lote = valesParaSubir.slice(i, i + 200);
          await client.from('vales').upsert(lote, { onConflict: 'id' });
        }
      }

      state.vales = Array.from(mapaLocal.values());
    }

    // 3. SUBIR Y SINCRONIZAR TANQUES
    if (state.tanques) {
      const listaTanques = Object.entries(state.tanques).map(([prod, t]) => ({
        producto: prod,
        capacidad: Number(t.capacidad),
        stock: Number(t.stock),
        alerta_naranja: Number(t.alerta_naranja),
        alerta_roja: Number(t.alerta_roja),
        unidad: t.unidad || 'Gln'
      }));
      await client.from('tanques').upsert(listaTanques, { onConflict: 'producto' });
    }

    // 4. SUBIR CONFIGURACIÓN
    await client.from('configuracion').upsert({
      id: 'principal',
      empresa: state.empresa,
      ruc: state.ruc,
      direccion: 'jesus_de_lauricocha_huanuco',
      telefono: state.telefono,
      admin_pin_hash: state.admin_pin_hash,
      precios: state.precios,
      clientes: state.clientes,
      personal: state.personal
    }, { onConflict: 'id' });

    // Guardar en local y notificar
    localStorage.setItem('grifo_erp_jesus_state', JSON.stringify(state));
    await Store.init();

    if (mostrarFeedback && typeof App !== 'undefined' && App.mostrarToast) {
      App.mostrarToast("✅ ¡Sincronización completa con Supabase Cloud!");
    }
  } catch (err) {
    console.error("[Supabase] Error durante sincronización:", err);
    if (mostrarFeedback) alert("Error en sincronización: " + err.message);
  }
}

// Operaciones Atómicas Individuales en Supabase (Segundo Plano)
async function subirValeASupabase(v) {
  const client = obtenerClienteSupabase();
  if (!client || !_supaOnline) return;
  try {
    await client.from('vales').upsert({
      id: Number(v.id),
      fecha: v.fecha,
      n_vale: Number(v.n_vale),
      turno: v.turno,
      cliente: v.cliente,
      lugar: 'jesus_de_lauricocha_huanuco',
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
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn("[Supabase] Error subiendo vale individual:", e);
  }
}

async function eliminarValeDeSupabase(id) {
  const client = obtenerClienteSupabase();
  if (!client || !_supaOnline) return;
  try {
    await client.from('vales').delete().eq('id', Number(id));
  } catch (e) {
    console.warn("[Supabase] Error eliminando vale individual:", e);
  }
}

async function sincronizarTanqueASupabase(producto, stock) {
  const client = obtenerClienteSupabase();
  if (!client || !_supaOnline) return;
  try {
    await client.from('tanques').update({ stock: Number(stock) }).eq('producto', producto);
  } catch (e) {
    console.warn("[Supabase] Error actualizando stock de tanque:", e);
  }
}

// Control del Modal de Supabase
function abrirModalSupabase() {
  const modal = document.getElementById('modal-supabase');
  const codigoEl = document.getElementById('codigo-sql-supabase');
  if (codigoEl) {
    codigoEl.textContent = SUPABASE_SETUP_SQL;
  }
  if (modal) {
    modal.classList.add('active');
  }
  actualizarBadgesSupabase(_supaOnline);
}

function cerrarModalSupabase() {
  const modal = document.getElementById('modal-supabase');
  if (modal) modal.classList.remove('active');
}

async function copiarSqlSupabase() {
  try {
    await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    if (typeof App !== 'undefined' && App.mostrarToast) {
      App.mostrarToast("📋 Código SQL copiado al portapapeles. Pégalo en tu Supabase SQL Editor.");
    } else {
      alert("Código SQL copiado al portapapeles.");
    }
  } catch (e) {
    alert("No se pudo copiar automáticamente. Por favor selecciónalo manualmente.");
  }
}

// Auto-arranque al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    verificarSupabase(false);
  }, 1000);
});
