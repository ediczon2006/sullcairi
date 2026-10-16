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
  pin_hash text not null default '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
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
insert into public.configuracion (id, estacion_nombre, ruc, telefono, sede, precio_diesel, precio_premium, precio_regular)
values ('sullcairi_config', 'ESTACIÓN DE SERVICIOS SULLCAIRI', '20608945123', '962123456', 'jesus_de_lauricocha_huanuco', 16.80, 19.50, 17.20)
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

function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

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
      <div class="mobile-cloud-pill" onclick="abrirModalSupabase()" title="Supabase Cloud">
        <span id="mobileSupaDot" class="mobile-cloud-dot"></span>
        <span>☁️</span>
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

  // 3. Menú de navegación
  const links = [
    { href: 'index.html',         icon: '🏠', text: 'Panel General',        key: 'index' },
    { href: 'vales.html',         icon: '⛽', text: 'Registro de Vales',    key: 'vales' },
    { href: 'agregar.html',       icon: '➕', text: 'Emitir Vale',          key: 'agregar' },
    { href: 'cobranza.html',      icon: '💳', text: 'Cuentas por Cobrar',   key: 'cobranza' },
    { href: 'tanques.html',       icon: '🛢️', text: 'Tanques & Varillaje',  key: 'tanques' },
    { href: 'diario.html',        icon: '📋', text: 'Registro Diario',      key: 'diario' },
    { href: 'importexport.html',  icon: '📊', text: 'Importar / Exportar',  key: 'importexport' },
    { href: 'configuracion.html', icon: '⚙️', text: 'Tarifas & Ajustes',    key: 'configuracion' }
  ];

  sidebar.innerHTML = `
    <div class="sidebar-logo" style="text-align:center;padding:18px 14px 12px;position:relative">
      <button onclick="cerrarSidebarMobile()" class="btn-sidebar-close" style="position:absolute;top:10px;right:10px;background:none;border:none;color:#94A3B8;font-size:1.4rem;cursor:pointer;display:none" title="Cerrar Menú">✕</button>
      <img src="img/logo.png" alt="Sullcairi" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2.5px solid #F97316;box-shadow:0 0 18px rgba(249,115,22,0.45);display:block;margin:0 auto 8px;background:#030712" onerror="this.src='img/logo.jpg'" />
      <h1 style="font-size:0.95rem;margin:0;letter-spacing:0.5px;color:#F8FAFC">ESTACIÓN SULLCAIRI</h1>
      <p style="font-size:0.75rem;margin:3px 0 0;color:#94A3B8">Jesús de Lauricocha • Huánuco</p>
      <div style="margin-top:5px;font-size:0.72rem;color:#F97316;font-weight:600">
        📞 962 123 456
      </div>
      <div class="sidebar-supa-pill" onclick="abrirModalSupabase()" title="Configuración de Supabase Cloud">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.95rem">☁️</span>
          <span id="sidebarSupaStatus" style="font-size:0.75rem;font-weight:700;color:#F97316">Supabase Cloud</span>
        </div>
        <span id="sidebarSupaDot" style="width:9px;height:9px;border-radius:50%;background:#F59E0B" title="Estado"></span>
      </div>
    </div>
    <div style="flex:1;padding:8px 0;overflow-y:auto">
      ${links.map(l => `
        <a href="${l.href}" class="nav-link${activePage === l.key ? ' active' : ''}" onclick="cerrarSidebarMobile()">
          <span class="nav-icon">${l.icon}</span>
          <span>${l.text}</span>
        </a>
      `).join('')}
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

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => {
  const pre = document.getElementById('codigoSqlSupa');
  if (pre) pre.textContent = SQL_SCHEMA_SUPABASE;
});
