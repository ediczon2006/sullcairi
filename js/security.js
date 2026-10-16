// ====================================================================
//  ESTACIÓN DE SERVICIOS SULLCAIRI - CAPA DE SEGURIDAD DEFENSIVA (SECURITY.JS)
//  Arquitectura: OWASP Top 10 Enterprise Client-Side Hardening
//  Sede Oficial Inmutable: jesus_de_lauricocha_huanuco
// ====================================================================

const SullcairiSecurity = (() => {

  // 1. Forzar HTTPS en entornos de producción (GitHub Pages / Web)
  function forzarHTTPS() {
    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
      if (!isLocal && window.location.protocol === 'http:') {
        window.location.href = window.location.href.replace('http:', 'https:');
      }
    }
  }

  // 2. Sanitización estricta contra Cross-Site Scripting (XSS)
  function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/`/g, '&#96;')
      .trim();
  }

  // 3. Validadores estrictos de Dominio y Negocio
  const Validators = {
    celular(num) {
      if (!num) return true; // Opcional
      const clean = String(num).replace(/[\s\-\+]/g, '');
      return /^(51)?9\d{8}$/.test(clean);
    },
    placa(placaStr) {
      if (!placaStr || placaStr === '-') return true;
      const s = String(placaStr).trim().toUpperCase();
      return /^[A-Z0-9\-]{3,10}$/.test(s);
    },
    cantidad(gln) {
      const n = Number(gln);
      return Number.isFinite(n) && n > 0 && n <= 15000;
    },
    precio(p) {
      const n = Number(p);
      return Number.isFinite(n) && n > 0 && n <= 300;
    },
    nVale(n) {
      const val = parseInt(n, 10);
      return Number.isInteger(val) && val > 0 && val <= 99999999;
    },
    fecha(f) {
      if (!f || typeof f !== 'string') return false;
      return /^\d{4}-\d{2}-\d{2}$/.test(f);
    },
    pin(p) {
      if (!p) return false;
      const s = String(p).trim();
      return /^\d{4,8}$/.test(s);
    },
    archivo(file, maxBytes = 10 * 1024 * 1024) {
      if (!file) return { valido: false, error: "No se seleccionó archivo." };
      if (file.size > maxBytes) {
        return { valido: false, error: `El archivo supera el tamaño máximo permitido (${(maxBytes/1024/1024).toFixed(0)} MB).` };
      }
      const extValidas = ['.xlsx', '.xls', '.csv'];
      const nombre = (file.name || '').toLowerCase();
      const extValida = extValidas.some(ext => nombre.endsWith(ext));
      if (!extValida) {
        return { valido: false, error: "Extensión no permitida. Solo se aceptan archivos .xlsx, .xls o .csv." };
      }
      return { valido: true };
    }
  };

  // 4. Rate Limiter Anti-Brute-Force para PIN de Administrador
  const PIN_MAX_INTENTOS = 5;
  const PIN_TIEMPO_BLOQUEO_MS = 60 * 1000; // 1 minuto de bloqueo
  let _intentosFallidosPin = 0;
  let _bloqueadoHasta = 0;

  function registrarIntentoPin(exito) {
    const ahora = Date.now();
    if (exito) {
      _intentosFallidosPin = 0;
      _bloqueadoHasta = 0;
      return true;
    }
    _intentosFallidosPin++;
    if (_intentosFallidosPin >= PIN_MAX_INTENTOS) {
      _bloqueadoHasta = ahora + PIN_TIEMPO_BLOQUEO_MS;
      _intentosFallidosPin = 0;
    }
    return false;
  }

  function estaPinBloqueado() {
    const ahora = Date.now();
    if (ahora < _bloqueadoHasta) {
      const segRestantes = Math.ceil((_bloqueadoHasta - ahora) / 1000);
      return { bloqueado: true, segundos: segRestantes };
    }
    return { bloqueado: false, segundos: 0 };
  }

  // 5. Hash Criptográfico SHA-256 seguro
  async function hashSha256(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(texto).trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 6. Gestión de Sesión Segura de Administrador con TTL (15 minutos)
  const SESSION_KEY = 'sullcairi_admin_session';
  const SESSION_TTL_MS = 15 * 60 * 1000;

  const AdminSession = {
    iniciar() {
      const sessionData = {
        auth: true,
        expira: Date.now() + SESSION_TTL_MS
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    },
    estaActiva() {
      try {
        const item = sessionStorage.getItem(SESSION_KEY);
        if (!item) return false;
        const s = JSON.parse(item);
        if (s && s.auth && Date.now() < s.expira) {
          // Renovar TTL
          s.expira = Date.now() + SESSION_TTL_MS;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
          return true;
        }
      } catch (_) {}
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    },
    cerrar() {
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  // 7. Protección contra Bots (Honeypot Validation)
  function validarHoneypot(campoId = 'website_hp') {
    const el = document.getElementById(campoId);
    if (el && el.value && el.value.trim().length > 0) {
      console.warn('[BotDetect] Envío bloqueado por trampa honeypot.');
      return false; // Es un bot
    }
    return true;
  }

  // 8. Aplicar Políticas de Seguridad DOM y Anti-Clickjacking
  function aplicarSeguridadDOM() {
    forzarHTTPS();

    // Anti-Clickjacking: Evitar que el ERP sea embebido en iframes externos
    if (window.top !== window.self) {
      try {
        window.top.location = window.self.location;
      } catch (_) {
        document.body.innerHTML = '<div style="padding:40px;color:red;font-weight:bold;text-align:center">Error de Seguridad: Acceso restringido en iframes no autorizados.</div>';
      }
    }

    // Inyectar meta referrer seguro
    if (!document.querySelector('meta[name="referrer"]')) {
      const metaRef = document.createElement('meta');
      metaRef.name = 'referrer';
      metaRef.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(metaRef);
    }
  }

  // Inicializar al cargar el DOM
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', aplicarSeguridadDOM);
    } else {
      aplicarSeguridadDOM();
    }
  }

  return {
    sanitize: sanitizeHTML,
    isValid: Validators,
    hashPin: hashSha256,
    hashSha256,
    registrarIntentoPin,
    estaPinBloqueado,
    AdminSession,
    validarHoneypot,
    forzarHTTPS
  };

})();

// Alias globales
const esc = SullcairiSecurity.sanitize;
const sanitizeString = SullcairiSecurity.sanitize;
const hashSha256 = SullcairiSecurity.hashSha256;
