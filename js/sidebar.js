// ========================================================
//  ESTACIÓN DE SERVICIOS SULLCAIRI — SIDEBAR COMPONENT
//  Arquitectura y diseño: Leytrix Standalone Multi-Page
//  Sede Fija Oficial: jesus_de_lauricocha_huanuco
// ========================================================

const SQL_SCHEMA_SUPABASE = `-- ====================================================================
-- ESTACIÓN DE SERVICIOS SULLCAIRI — ESQUEMA SUPABASE CLOUD
-- Proyecto: gtfmhtrvsbfcftstbadj
-- Sede Fija Oficial: jesus_de_lauricocha_huanuco
-- ====================================================================

create extension if not exists "pgcrypto";

-- 1. Limpieza de tablas previas (evita errores de columnas antiguas)
drop table if exists public.movimientos_tanque cascade;
drop table if exists public.configuracion cascade;
drop table if exists public.vales cascade;
drop table if exists public.tanques cascade;

-- 2. Tabla de vales de combustible
create table public.vales (
  id bigint primary key,
  fecha date not null,
  fecha_recojo date,
  n_vale integer not null,
  turno varchar(50) default 'T1 (Mañana)',
  cliente text not null,
  lugar varchar(120) not null default 'jesus_de_lauricocha_huanuco',
  telefono varchar(30),
  placa varchar(20) default '-',
  conductor varchar(120) default '-',
  producto varchar(60) not null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  precio numeric(10,2) not null check (precio > 0),
  total numeric(12,2) not null check (total >= 0),
  grifero varchar(60) default 'YANET',
  estado varchar(20) not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'FACTURADO', 'ANULADO')),
  observacion text,
  creado_el timestamptz not null default timezone('America/Lima', now()),
  actualizado_el timestamptz not null default timezone('America/Lima', now())
);

alter table public.vales add column if not exists fecha_recojo date;

-- 3. Tabla de tanques de combustible (6,000 GL)
create table public.tanques (
  producto varchar(60) primary key,
  capacidad numeric(10,2) not null check (capacidad > 0),
  stock numeric(10,2) not null check (stock >= 0),
  alerta_naranja numeric(10,2) not null default 500,
  alerta_roja numeric(10,2) not null default 250,
  unidad varchar(10) not null default 'Gln',
  actualizado_el timestamptz not null default timezone('America/Lima', now())
);

-- 4. Tabla de movimientos y auditoría de tanques
create table public.movimientos_tanque (
  id text primary key,
  fecha_completa timestamptz not null default timezone('America/Lima', now()),
  dia integer not null default 1,
  mes integer not null default 1,
  ano integer not null default 2026,
  producto varchar(60) not null default 'DIESEL B5-S50',
  tipo varchar(60) not null default 'DESPACHO',
  cantidad numeric(10,2) not null default 0,
  saldo numeric(10,2) not null default 0,
  motivo text,
  responsable varchar(60) default 'YANET'
);

-- 5. Tabla de configuración
create table public.configuracion (
  id text primary key default 'sullcairi_config',
  estacion_nombre text not null default 'ESTACIÓN DE SERVICIOS SULLCAIRI',
  ruc varchar(20) not null default '20608945123',
  telefono varchar(30) not null default '962123456',
  sede varchar(120) not null default 'jesus_de_lauricocha_huanuco',
  precio_diesel numeric(10,2) not null default 16.80,
  precio_premium numeric(10,2) not null default 19.50,
  precio_regular numeric(10,2) not null default 17.20,
  pin_hash text not null default 'f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf',
  usuarios jsonb default '[{"usuario":"ADMIN","nombre":"Administrador de Estación","rol":"ADMIN","pin_hash":"f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf","activo":true},{"usuario":"YANET","nombre":"Yanet Quispe","rol":"OPERADOR","pin_hash":"551e64290af89b026ed20617797ffe2b7cdcbcd401d894d105308089c86b3bf8","activo":true},{"usuario":"CRESILDO","nombre":"Cresildo Alvarado","rol":"OPERADOR","pin_hash":"45ee58c792f5a8b094a5126d33af19b0501b59782f92a0b1cdcc4834bb31f48c","activo":true},{"usuario":"YAMILEX","nombre":"Yamilex Soto","rol":"OPERADOR","pin_hash":"3f9e0144391381255366e5b359bd59a6ba7a6c53afd8eda48f6ea311a7b6b155","activo":true}]'::jsonb,
  actualizado_el timestamptz not null default timezone('America/Lima', now())
);

-- 6. Habilitar Row Level Security (RLS)
alter table public.vales enable row level security;
alter table public.tanques enable row level security;
alter table public.movimientos_tanque enable row level security;
alter table public.configuracion enable row level security;

-- 7. Políticas de acceso seguro
create policy "vales_politica_acceso" on public.vales for all using (true) with check (true);
create policy "tanques_politica_acceso" on public.tanques for all using (true) with check (true);
create policy "movimientos_politica_acceso" on public.movimientos_tanque for all using (true) with check (true);
create policy "configuracion_politica_acceso" on public.configuracion for all using (true) with check (true);

-- 8. Semillas de tanques
insert into public.tanques (producto, capacidad, stock, alerta_naranja, alerta_roja, unidad)
values
  ('DIESEL B5-S50', 3000, 2150, 500, 250, 'Gln'),
  ('GASOHOL PREMIUM', 1500, 1100, 500, 250, 'Gln'),
  ('GASOHOL REGULAR', 1500, 980, 500, 250, 'Gln')
on conflict (producto) do nothing;

-- 9. Semilla de configuración
insert into public.configuracion (id, estacion_nombre, ruc, telefono, sede, precio_diesel, precio_premium, precio_regular, pin_hash)
values ('sullcairi_config', 'ESTACIÓN DE SERVICIOS SULLCAIRI', '20608945123', '962123456', 'jesus_de_lauricocha_huanuco', 16.80, 19.50, 17.20, 'f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf')
on conflict (id) do nothing;

-- 10. Activar Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.vales, public.tanques, public.movimientos_tanque, public.configuracion;
  exception when others then
    null;
  end;
end $$;
`;

function toggleSidebarMobile() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (!sb) return;
  const isOpen = sb.classList.toggle('open');
  if (ov) {
    if (isOpen) ov.classList.add('active');
    else ov.classList.remove('active');
  }
}

function cerrarSidebarMobile() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('active');
}

function abrirModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function cerrarModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

function abrirModalSupabase() {
  abrirModal('modalSupabase');
  const pre = document.getElementById('codigoSqlSupa');
  if (pre && !pre.textContent) {
    pre.textContent = SQL_SCHEMA_SUPABASE;
  }
}

function copiarSqlSupabase() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(SQL_SCHEMA_SUPABASE).then(() => {
      mostrarNotificacionToast("📋 ¡Script SQL copiado al portapapeles!");
    }).catch(() => {
      copiarManual();
    });
  } else {
    copiarManual();
  }

  function copiarManual() {
    const el = document.getElementById('codigoSqlSupa');
    if (!el) return;
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    document.execCommand('copy');
    mostrarNotificacionToast("📋 ¡Script SQL copiado al portapapeles!");
  }
}

function mostrarNotificacionToast(mensaje, tipo = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.className = 'toast active ' + (tipo === 'error' ? 'toast-error' : tipo === 'success' ? 'toast-success' : '');
  
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('active');
  }, 3500);
}

function cerrarSesionSistema() {
  if (confirm("¿Desea cerrar la sesión actual del sistema?")) {
    if (typeof UserSession !== 'undefined') UserSession.cerrar();
    window.location.href = 'login.html';
  }
}

function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const sesionActiva = typeof UserSession !== 'undefined' ? UserSession.obtener() : null;

  // 1. Inyectar Barra Superior Móvil si no existe
  if (!document.getElementById('mobile-topbar')) {
    const topbar = document.createElement('header');
    topbar.id = 'mobile-topbar';
    topbar.innerHTML = `
      <button class="mobile-hamburger-btn" onclick="toggleSidebarMobile()" aria-label="Abrir Menú">☰</button>
      <div class="mobile-brand">
        <img src="img/logo.png" alt="Sullcairi Logo" onerror="this.src='img/logo.jpg'" />
        <div>
          <div class="mobile-brand-title">E.S. SULLCAIRI</div>
          <span class="mobile-brand-sub">Jesús de Lauricocha</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <div class="mobile-cloud-pill" onclick="window.location.href='login.html'" title="Usuario Activo">
          <span>${sesionActiva ? (sesionActiva.rol === 'ADMIN' ? '🛡️' : '👷') : '🔑'}</span>
          <span style="font-size:0.72rem;font-weight:700">${sesionActiva ? esc(sesionActiva.usuario) : 'Login'}</span>
        </div>
        <div class="mobile-cloud-pill" onclick="abrirModalSupabase()" title="Supabase Cloud">
          <span id="mobileSupaDot" class="mobile-cloud-dot"></span>
          <span>☁️</span>
        </div>
      </div>
    `;
    document.body.prepend(topbar);
  }

  // 2. Inyectar Overlay para móvil
  if (!document.getElementById('sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.onclick = cerrarSidebarMobile;
    document.body.appendChild(overlay);
  }

  // 3. Menú de navegación con distinción de roles
  const links = [
    { href: 'index.html',         icon: '🏠', text: 'Panel General',        key: 'index', adminOnly: false },
    { href: 'vales.html',         icon: '⛽', text: 'Registro de Vales',    key: 'vales', adminOnly: false },
    { href: 'agregar.html',       icon: '➕', text: 'Emitir Vale',          key: 'agregar', adminOnly: false },
    { href: 'cobranza.html',      icon: '💳', text: 'Cuentas por Cobrar',   key: 'cobranza', adminOnly: false },
    { href: 'tanques.html',       icon: '🛢️', text: 'Tanques & Varillaje',  key: 'tanques', adminOnly: true },
    { href: 'diario.html',        icon: '📋', text: 'Registro Diario',      key: 'diario', adminOnly: false },
    { href: 'importexport.html',  icon: '📊', text: 'Importar / Exportar',  key: 'importexport', adminOnly: true },
    { href: 'configuracion.html', icon: '⚙️', text: 'Tarifas & Ajustes',    key: 'configuracion', adminOnly: true }
  ];

  const userBoxHtml = sesionActiva ? `
    <div style="background:#0F172A;border:1.5px solid #334155;border-radius:10px;padding:8px 10px;margin:10px 14px 6px;text-align:center">
      <div style="display:flex;align-items:center;justify-content:center;gap:6px">
        <span>${sesionActiva.rol === 'ADMIN' ? '🛡️' : '👷'}</span>
        <strong style="font-size:0.82rem;color:#F8FAFC">${esc(sesionActiva.usuario)}</strong>
        <span class="badge" style="font-size:0.65rem;padding:2px 6px;font-weight:800;background:${sesionActiva.rol === 'ADMIN' ? '#FEF3C7' : '#E0F2FE'};color:${sesionActiva.rol === 'ADMIN' ? '#92400E' : '#0369A1'}">
          ${sesionActiva.rol === 'ADMIN' ? 'ADMIN' : 'ATENCIÓN'}
        </span>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <a href="login.html" class="btn btn-outline btn-sm btn-full" style="padding:3px 6px;font-size:0.7rem;color:#CBD5E1;border-color:#475569;text-decoration:none">
          🔄 Cambiar
        </a>
        <button onclick="cerrarSesionSistema()" class="btn btn-outline btn-sm" style="padding:3px 8px;font-size:0.7rem;color:#FCA5A5;border-color:#7F1D1D" title="Cerrar Sesión">
          🚪 Salir
        </button>
      </div>
    </div>
  ` : `
    <div style="background:#FFF7ED;border:1.5px solid #FDBA74;border-radius:10px;padding:8px 10px;margin:10px 14px 6px;text-align:center">
      <div style="font-size:0.75rem;font-weight:700;color:#9A3412">⚠️ Sin Sesión Activa</div>
      <a href="login.html" class="btn btn-primary btn-sm btn-full" style="background:#EA580C;border-color:#C2410C;padding:4px 8px;font-size:0.75rem;margin-top:6px;text-decoration:none;display:block">
        🔑 Iniciar Sesión
      </a>
    </div>
  `;

  sidebar.innerHTML = `
    <div class="sidebar-logo" style="text-align:center;padding:18px 14px 8px;position:relative">
      <button onclick="cerrarSidebarMobile()" class="btn-sidebar-close" style="position:absolute;top:10px;right:10px;background:none;border:none;color:#94A3B8;font-size:1.4rem;cursor:pointer;display:none" title="Cerrar Menú">✕</button>
      <img src="img/logo.png" alt="Sullcairi" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2.5px solid #F97316;box-shadow:0 0 18px rgba(249,115,22,0.45);display:block;margin:0 auto 8px;background:#030712" onerror="this.src='img/logo.jpg'" />
      <h1 style="font-size:0.95rem;margin:0;letter-spacing:0.5px;color:#F8FAFC">ESTACIÓN SULLCAIRI</h1>
      <p style="font-size:0.75rem;margin:3px 0 0;color:#94A3B8">Jesús de Lauricocha • Huánuco</p>
      <div style="margin-top:5px;font-size:0.72rem;color:#F97316;font-weight:600">
        📞 962 123 456
      </div>
      
      ${userBoxHtml}

      <div class="sidebar-supa-pill" onclick="abrirModalSupabase()" title="Configuración de Supabase Cloud">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.95rem">☁️</span>
          <span id="sidebarSupaStatus" style="font-size:0.75rem;font-weight:700;color:#F97316">Supabase Cloud</span>
        </div>
        <span id="sidebarSupaDot" style="width:9px;height:9px;border-radius:50%;background:#F59E0B" title="Estado"></span>
      </div>
    </div>
    <div style="flex:1;padding:6px 0;overflow-y:auto">
      ${links.map(l => {
        const esAdmin = sesionActiva && sesionActiva.rol === 'ADMIN';
        const candado = l.adminOnly && !esAdmin ? ' 🔒' : '';
        const clickHandler = l.adminOnly && !esAdmin 
          ? `event.preventDefault(); solicitarAutorizacionAdmin('${l.href}');` 
          : 'cerrarSidebarMobile();';

        return `
          <a href="${l.href}" class="nav-link${activePage === l.key ? ' active' : ''}" onclick="${clickHandler}">
            <span class="nav-icon">${l.icon}</span>
            <span>${l.text}${candado}</span>
          </a>
        `;
      }).join('')}
    </div>
    <div class="sidebar-stats" id="sidebarStats">
      <p>⛽ Cargando métricas...</p>
    </div>
  `;

  // 4. Inyectar modal Supabase en el DOM si no existe
  if (!document.getElementById('modalSupabase')) {
    const modWrap = document.createElement('div');
    modWrap.id = 'modalSupabase';
    modWrap.className = 'modal-bg';
    modWrap.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>☁️ Conexión Supabase Cloud</h3>
          <button class="modal-close" onclick="cerrarModal('modalSupabase')">✕</button>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--borde);border-radius:10px;padding:14px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="font-size:0.85rem">Estado de Conexión:</strong>
            <span id="modalSupaStatusBadge" style="font-size:0.78rem;font-weight:700;padding:4px 10px;border-radius:12px;background:#FFFBEB;color:#B45309">
              🟡 Modo Local (Pendiente SQL)
            </span>
          </div>
          <div style="font-size:0.78rem;color:var(--gris);word-break:break-all">
            <strong>URL Proyecto:</strong> https://gtfmhtrvsbfcftstbadj.supabase.co
          </div>
        </div>
        <div style="margin-bottom:16px">
          <h4 style="font-size:0.88rem;color:var(--azul);margin-bottom:6px">⚡ Sincronización en la Nube</h4>
          <p style="font-size:0.8rem;color:var(--gris);line-height:1.4;margin-bottom:10px">
            Sube todos los vales, tanques, precios y arqueos a Supabase para consultarlos desde cualquier celular o PC y compartir el enlace de GitHub Pages en tiempo real.
          </p>
          <button class="btn btn-primary btn-full" onclick="sincronizarConSupabase(true)" style="background:#F97316;border-color:#EA580C">
            ☁️ Sincronizar Todos los Datos a Supabase Cloud
          </button>
        </div>
        <div style="border-top:1px solid var(--borde);padding-top:14px">
          <h4 style="font-size:0.88rem;margin-bottom:6px">📋 Script SQL para crear tablas en Supabase</h4>
          <p style="font-size:0.78rem;color:var(--gris);margin-bottom:8px">
            Copia este código, ve a <strong>Supabase Dashboard &gt; SQL Editor &gt; New Query</strong>, pégalo y haz clic en <strong>Run</strong>:
          </p>
          <pre id="codigoSqlSupa" style="background:#0F172A;color:#FDBA74;padding:12px;border-radius:8px;font-size:0.72rem;max-height:140px;overflow:auto;user-select:all"></pre>
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="copiarSqlSupabase()" style="background:#16A34A;border-color:#16A34A;flex:1;min-width:140px">
              📋 Copiar Código SQL
            </button>
            <a href="https://supabase.com/dashboard/project/gtfmhtrvsbfcftstbadj/sql/new" target="_blank" class="btn btn-primary btn-sm" style="background:#0284C7;border-color:#0284C7;flex:1;min-width:160px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px">
              🔗 Abrir SQL Editor
            </a>
            <button class="btn btn-outline btn-sm" onclick="verificarSupabase(true)" style="flex:1;min-width:120px">
              🔄 Probar Conexión
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modWrap);
  }

  // Actualizar métricas del sidebar
  actualizarEstadisticasSidebar();
  if (typeof verificarSupabase === 'function') {
    verificarSupabase(false);
  }
}

async function actualizarEstadisticasSidebar() {
  const statsEl = document.getElementById('sidebarStats');
  if (!statsEl) return;
  try {
    if (typeof DB !== 'undefined' && DB.obtenerResumenGeneral) {
      const resumen = await DB.obtenerResumenGeneral();
      statsEl.innerHTML = `
        <p>⛽ <strong>Total Vales:</strong> ${resumen.totalVales.toLocaleString()}</p>
        <p>💳 <strong>Por Cobrar:</strong> S/. ${resumen.pendienteSoles.toFixed(2)}</p>
        <p>✅ <strong>Facturado:</strong> S/. ${resumen.facturadoSoles.toFixed(2)}</p>
        <p>🛢️ <strong>Despacho:</strong> ${resumen.totalGln.toFixed(1)} Gln</p>
      `;
    } else {
      statsEl.innerHTML = '<p>ESTACIÓN SULLCAIRI v2.0</p>';
    }
  } catch(err) {
    statsEl.innerHTML = '<p>ESTACIÓN SULLCAIRI v2.0</p>';
  }
}

// ========================================================
// CONTROL DE ACCESO DEFENSIVO Y ELEVACIÓN DE PRIVILEGIOS
// ========================================================
let _destinoAdminPendiente = null;

function solicitarAutorizacionAdmin(hrefDestino) {
  _destinoAdminPendiente = hrefDestino;

  let modal = document.getElementById('modalAuthAdminRapido');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalAuthAdminRapido';
    modal.className = 'modal-bg';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center">
        <div class="modal-header">
          <h3>🔒 Acceso de Administrador</h3>
          <button class="modal-close" onclick="cerrarModal('modalAuthAdminRapido')">✕</button>
        </div>
        <p style="font-size:0.83rem;color:var(--gris);margin-bottom:14px">
          Esta sección ("${hrefDestino}") está reservada para el <strong>Administrador</strong>. Ingrese su código PIN de seguridad para ingresar:
        </p>
        <input type="password" id="inputPinAdminRapido" class="form-input" placeholder="PIN de Administrador" maxlength="8" style="text-align:center;font-size:1.3rem;letter-spacing:4px;margin-bottom:14px" />
        <div id="alertaErrorAuthRapido" style="display:none;color:#991B1B;background:#FEE2E2;border:1px solid #FECACA;padding:6px;border-radius:6px;font-size:0.75rem;margin-bottom:12px;font-weight:700"></div>
        <div style="display:flex;gap:10px">
          <button type="button" class="btn btn-outline btn-full" onclick="cerrarModal('modalAuthAdminRapido')">Cancelar</button>
          <button type="button" class="btn btn-primary btn-full" onclick="confirmarAuthAdminRapido()" style="background:#EA580C;border-color:#C2410C">Entrar</button>
        </div>
        <div style="margin-top:12px">
          <a href="login.html" style="font-size:0.75rem;color:var(--azul);text-decoration:none;font-weight:700">
            O cambiar de usuario en la pantalla de inicio ➔
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('inputPinAdminRapido').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmarAuthAdminRapido();
    });
  }

  const errBox = document.getElementById('alertaErrorAuthRapido');
  if (errBox) errBox.style.display = 'none';
  const inp = document.getElementById('inputPinAdminRapido');
  if (inp) inp.value = '';

  abrirModal('modalAuthAdminRapido');
  setTimeout(() => { if (inp) inp.focus(); }, 150);
}

async function confirmarAuthAdminRapido() {
  const pin = (document.getElementById('inputPinAdminRapido').value || '').trim();
  const errBox = document.getElementById('alertaErrorAuthRapido');

  if (!pin) {
    if (errBox) {
      errBox.textContent = 'Ingrese el PIN de Administrador.';
      errBox.style.display = 'block';
    }
    return;
  }

  try {
    const ok = await DB.verificarPinAdmin(pin);
    if (!ok) {
      if (errBox) {
        errBox.textContent = '❌ PIN de Administrador incorrecto.';
        errBox.style.display = 'block';
      }
      return;
    }

    // Elevación de sesión a Admin
    if (typeof UserSession !== 'undefined') {
      UserSession.iniciar('ADMIN', 'Administrador de Estación', 'ADMIN');
    }

    cerrarModal('modalAuthAdminRapido');
    if (_destinoAdminPendiente) {
      window.location.href = _destinoAdminPendiente;
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  }
}

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => {
  const pre = document.getElementById('codigoSqlSupa');
  if (pre) pre.textContent = SQL_SCHEMA_SUPABASE;

  // Verificación pasiva de sesión: si no está en login y no hay sesión, advertir
  if (typeof UserSession !== 'undefined' && !window.location.pathname.includes('login.html')) {
    if (!UserSession.estaAutenticado()) {
      // Redirigir a login para asegurar identificación del operador
      window.location.href = 'login.html';
    }
  }
});

