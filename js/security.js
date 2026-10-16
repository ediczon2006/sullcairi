// ====================================================================
//  ESTACIÓN DE SERVICIOS SULLCAIRI - CAPA DE SEGURIDAD DEFENSIVA (SECURITY.JS)
//  Estándar: OWASP Top 10 Client-Side Hardening
//  Sede Fija Oficial: jesus_de_lauricocha_huanuco
// ====================================================================

const SullcairiSecurity = (() => {

  // 1. Sanitización estricta contra Cross-Site Scripting (XSS)
  function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/`/g, '&#96;');
  }

  // 2. Validadores de formato estricto (Entradas de Combustible y Seguridad)
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
      return Number.isFinite(n) && n > 0 && n <= 20000;
    },
    precio(p) {
      const n = Number(p);
      return Number.isFinite(n) && n > 0 && n <= 500;
    },
    nVale(n) {
      const val = parseInt(n, 10);
      return Number.isInteger(val) && val > 0 && val <= 99999999;
    },
    pin(p) {
      if (!p) return false;
      const s = String(p).trim();
      return s.length >= 4 && s.length <= 16;
    }
  };

  // 3. Rate Limiting en el Cliente (Prevención de Spam y Flooding)
  const _actionTimestamps = new Map();
  function checkRateLimit(actionKey, maxCalls = 8, windowMs = 10000) {
    const now = Date.now();
    const timestamps = (_actionTimestamps.get(actionKey) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= maxCalls) {
      return false; // Bloqueado temporalmente
    }
    timestamps.push(now);
    _actionTimestamps.set(actionKey, timestamps);
    return true;
  }

  // 4. Hash Criptográfico SHA-256 para PIN de Administrador
  async function hashPin(pinTexto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(pinTexto).trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 5. Inyección de Cabeceras y Metaetiquetas de Seguridad en el DOM
  function aplicarSecurityHeaders() {
    // Prevenir Clickjacking mediante iframes no autorizados
    if (window.top !== window.self) {
      try {
        window.top.location = window.self.location;
      } catch (_) {}
    }

    // Inyectar meta referrer seguro si no existe
    if (!document.querySelector('meta[name="referrer"]')) {
      const metaRef = document.createElement('meta');
      metaRef.name = 'referrer';
      metaRef.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(metaRef);
    }
  }

  // Ejecución preventiva al cargar
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', aplicarSecurityHeaders);
    } else {
      aplicarSecurityHeaders();
    }
  }

  return {
    sanitize: sanitizeHTML,
    isValid: Validators,
    rateLimit: checkRateLimit,
    hashPin
  };

})();

// Alias global para compatibilidad de plantillas
const esc = SullcairiSecurity.sanitize;
