#!/usr/bin/env python3
"""
=============================================================================
SISTEMA DE GESTIÓN Y CONTROL DE VALES DE COMBUSTIBLE - SERVIDOR LOCAL REST
Servidor Endurecido con Seguridad Empresarial:
- Headers de Seguridad HTTP (CSP, HSTS, X-Frame, X-Content-Type, Referrer)
- Rate Limiting por IP para mitigar DoS y abusos
- Validación Estricta de Esquema e Inmutabilidad de Sede
- Mitigación de Path Traversal y Control Estricto de CORS
=============================================================================
"""

import json
import os
import sys
import time
import threading
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "datos.json")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")
MAX_PAYLOAD = 10 * 1024 * 1024  # 10 MB límite seguro contra DoS
FILE_LOCK = threading.Lock()

os.makedirs(BACKUP_DIR, exist_ok=True)

SEDE_ESTATICA = "jesus_de_lauricocha_huanuco"

# Rate Limiter en memoria por IP
RATE_LIMIT_LOCK = threading.Lock()
RATE_LIMIT_WINDOW_SEC = 60
RATE_LIMIT_MAX_REQ = 120  # Max 120 peticiones por minuto por IP
CLIENT_REQUESTS = {}

# Orígenes CORS permitidos
ALLOWED_ORIGIN_PATTERNS = (
    "http://localhost",
    "http://127.0.0.1",
    "https://ediczon2006.github.io"
)

DEFAULT_STATE = {
    "version": "2.3.0",
    "empresa": "ESTACIÓN DE SERVICIOS SULLCAIRI",
    "ruc": "20608945123",
    "direccion": SEDE_ESTATICA,
    "telefono": "962123456",
    "pais": "51",
    "precios": {
        "DIESEL B5-S50": 16.80,
        "GASOHOL PREMIUM": 19.50,
        "GASOHOL REGULAR": 17.20
    },
    "tanques": {
        "DIESEL B5-S50": {"capacidad": 3000, "stock": 2150, "alerta_naranja": 500, "alerta_roja": 250, "unidad": "Gln"},
        "GASOHOL PREMIUM": {"capacidad": 1500, "stock": 1100, "alerta_naranja": 500, "alerta_roja": 250, "unidad": "Gln"},
        "GASOHOL REGULAR": {"capacidad": 1500, "stock": 980, "alerta_naranja": 500, "alerta_roja": 250, "unidad": "Gln"}
    },
    "clientes": [
        "UGEL", "RED DE SALUD", "FISCALIA", "IVP", "AGRORURAL",
        "AGENCIA AGRARIA", "MUNICIPALIDAD JESUS", "CONSORCIO VIAL JESUS",
        "GRUPO MONTERRICO", "VENTA DIARIA"
    ],
    "personal": ["YANET", "CRESILDO", "YAMILEX", "OTROS"],
    "lugares": [SEDE_ESTATICA],
    "movimientos_tanque": [],
    "vales": []
}


def verificar_rate_limit(ip: str) -> bool:
    """Implementa sliding window rate-limiting por IP."""
    ahora = time.time()
    with RATE_LIMIT_LOCK:
        if ip not in CLIENT_REQUESTS:
            CLIENT_REQUESTS[ip] = []
        # Limpiar marcas de tiempo expiradas
        CLIENT_REQUESTS[ip] = [t for t in CLIENT_REQUESTS[ip] if ahora - t < RATE_LIMIT_WINDOW_SEC]
        if len(CLIENT_REQUESTS[ip]) >= RATE_LIMIT_MAX_REQ:
            return False
        CLIENT_REQUESTS[ip].append(ahora)
        return True


def leer_datos():
    with FILE_LOCK:
        if not os.path.exists(DATA_FILE):
            return json.loads(json.dumps(DEFAULT_STATE))
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                return json.loads(json.dumps(DEFAULT_STATE))
            merged = json.loads(json.dumps(DEFAULT_STATE))
            merged.update(data)
            # Blindar campos inmutables
            merged["direccion"] = SEDE_ESTATICA
            merged["lugares"] = [SEDE_ESTATICA]
            return merged
        except (json.JSONDecodeError, OSError) as err:
            print(f"[ERROR] No se pudo leer {DATA_FILE}: {err}")
            return json.loads(json.dumps(DEFAULT_STATE))


def escribir_datos(datos):
    with FILE_LOCK:
        tmp = DATA_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DATA_FILE)


def crear_backup():
    if not os.path.exists(DATA_FILE):
        return None
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"backup_{timestamp}.json")
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f_src:
            content = f_src.read()
        with open(backup_path, "w", encoding="utf-8") as f_dst:
            f_dst.write(content)
        # Rotación ordenada por mtime real
        archivos = [os.path.join(BACKUP_DIR, a) for a in os.listdir(BACKUP_DIR) if a.endswith(".json")]
        archivos.sort(key=lambda x: os.path.getmtime(x))
        while len(archivos) > 30:
            os.remove(archivos.pop(0))
        return os.path.basename(backup_path)
    except Exception as err:
        print(f"[AVISO] Error al crear backup: {err}")
        return None


def validar_y_sanitizar_payload(datos: dict) -> dict:
    """Valida tipos, rangos y previene manipulación de campos críticos."""
    if not isinstance(datos, dict):
        raise ValueError("El cuerpo debe ser un objeto JSON válido.")

    if "vales" not in datos or not isinstance(datos["vales"], list):
        raise ValueError("El campo 'vales' es obligatorio y debe ser una lista.")

    if len(datos["vales"]) > 50000:
        raise ValueError("Límite de registros de vales excedido (máx. 50,000).")

    # Sanitizar y validar cada vale
    for i, v in enumerate(datos["vales"]):
        if not isinstance(v, dict):
            raise ValueError(f"El registro de vale en el índice {i} no es válido.")
        
        # Validar numérico positivo para n_vale
        try:
            n_val = int(v.get("n_vale", 0))
            if n_val <= 0 or n_val > 99999999:
                raise ValueError()
            v["n_vale"] = n_val
        except Exception:
            raise ValueError(f"Fila {i + 1}: N° Vale debe ser un entero positivo válido.")

        # Validar rangos numéricos de cantidad y precio
        try:
            cant = float(v.get("cantidad", 0))
            if cant < 0 or cant > 20000:
                raise ValueError()
            v["cantidad"] = round(cant, 2)
        except Exception:
            raise ValueError(f"Fila {i + 1}: Cantidad de combustible fuera de rango (0 - 20,000 Gln).")

        try:
            prec = float(v.get("precio", 0))
            if prec < 0 or prec > 500:
                raise ValueError()
            v["precio"] = round(prec, 2)
        except Exception:
            raise ValueError(f"Fila {i + 1}: Precio unitario fuera de rango (0 - 500 S/).")

        # Bloqueo estricto de manipulación de campo total
        v["total"] = round(v["cantidad"] * v["precio"], 2)

        # Inmutabilidad de sede en cada registro
        v["lugar"] = SEDE_ESTATICA

        # Normalizar fecha_recojo
        if not v.get("fecha_recojo"):
            v["fecha_recojo"] = v.get("fecha", datetime.now().strftime("%Y-%m-%d"))

    # Validar tanques si vienen en el payload
    if "tanques" in datos:
        if not isinstance(datos["tanques"], dict):
            raise ValueError("El campo 'tanques' debe ser un diccionario.")
        for k, t in datos["tanques"].items():
            if isinstance(t, dict) and "stock" in t:
                try:
                    t["stock"] = max(0.0, float(t["stock"]))
                except Exception:
                    t["stock"] = 0.0

    # Forzar inmutabilidad de sede a nivel raíz
    datos["direccion"] = SEDE_ESTATICA
    datos["lugares"] = [SEDE_ESTATICA]

    return datos


class GrifoRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, fmt, *args):
        sys.stdout.write(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]}\n")

    def _aplicar_security_headers(self):
        """Aplica conjunto integral de cabeceras de seguridad."""
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        self.send_header("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://gtfmhtrvsbfcftstbadj.supabase.co wss://gtfmhtrvsbfcftstbadj.supabase.co data: blob:; "
            "img-src 'self' data: https: blob:; "
            "object-src 'none'; frame-ancestors 'none'; base-uri 'self';"
        )
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")

    def _aplicar_cors(self):
        """Aplica CORS restringido y verificado."""
        origin = self.headers.get("Origin", "")
        if any(origin.startswith(pat) for pat in ALLOWED_ORIGIN_PATTERNS):
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", "null")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Access-Control-Max-Age", "86400")

    def responder_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self._aplicar_security_headers()
        self._aplicar_cors()
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self._aplicar_cors()
        self._aplicar_security_headers()
        self.end_headers()

    def translate_path(self, path):
        """Previene vulnerabilidades de Path Traversal asegurando que el archivo resida en BASE_DIR."""
        resolved = super().translate_path(path)
        try:
            rel = os.path.relpath(resolved, BASE_DIR)
            if rel.startswith("..") or os.path.isabs(rel):
                return os.path.join(BASE_DIR, "index.html")
        except Exception:
            return os.path.join(BASE_DIR, "index.html")
        return resolved

    def do_GET(self):
        client_ip = self.client_address[0]
        if not verificar_rate_limit(client_ip):
            self.responder_json(429, {"ok": False, "error": "Demasiadas peticiones. Intente más tarde (Rate Limit)."})
            return

        path_clean = self.path.split("?")[0].rstrip("/")
        if path_clean in ("/api/datos", "api/datos"):
            self.responder_json(200, leer_datos())
            return
        if path_clean in ("/api/estado", "api/estado"):
            datos = leer_datos()
            tamano = os.path.getsize(DATA_FILE) if os.path.exists(DATA_FILE) else 0
            self.responder_json(200, {
                "ok": True,
                "version": datos.get("version", "2.3.0"),
                "total_vales": len(datos.get("vales", [])),
                "tamano_bytes": tamano,
                "empresa": datos.get("empresa", "")
            })
            return
        super().do_GET()

    def do_POST(self):
        client_ip = self.client_address[0]
        if not verificar_rate_limit(client_ip):
            self.responder_json(429, {"ok": False, "error": "Demasiadas peticiones. Intente más tarde (Rate Limit)."})
            return

        path_clean = self.path.split("?")[0].rstrip("/")
        if path_clean in ("/api/backup", "api/backup"):
            nombre = crear_backup()
            self.responder_json(200, {"ok": True, "backup": nombre})
            return

        if path_clean not in ("/api/datos", "api/datos"):
            self.responder_json(404, {"ok": False, "error": "Endpoint no encontrado"})
            return

        try:
            content_length_str = self.headers.get("Content-Length")
            if not content_length_str:
                self.responder_json(411, {"ok": False, "error": "Content-Length requerido"})
                return

            length = int(content_length_str)
            if length <= 0 or length > MAX_PAYLOAD:
                self.responder_json(413, {"ok": False, "error": f"Carga útil excede límite seguro de {MAX_PAYLOAD // (1024*1024)}MB"})
                return

            body_bytes = self.rfile.read(length)
            datos_raw = json.loads(body_bytes.decode("utf-8"))

            # Validación y Sanitización Completa
            datos_validados = validar_y_sanitizar_payload(datos_raw)

            escribir_datos(datos_validados)
            self.responder_json(200, {
                "ok": True,
                "mensaje": "Datos validados y persistidos con éxito",
                "total_vales": len(datos_validados["vales"])
            })
        except ValueError as val_err:
            self.responder_json(422, {"ok": False, "error": f"Validación de datos fallida: {val_err}"})
        except Exception as err:
            self.responder_json(400, {"ok": False, "error": f"Error de procesamiento: {err}"})


def main():
    puerto = 8000
    if len(sys.argv) > 1:
        try:
            puerto = int(sys.argv[1])
        except ValueError:
            print("El puerto debe ser numérico.")
            return
    url = f"http://localhost:{puerto}"
    servidor = ThreadingHTTPServer(("127.0.0.1", puerto), GrifoRequestHandler)
    print("\n" + "=" * 70)
    print(f"  ESTACIÓN DE SERVICIOS SULLCAIRI - SERVIDOR ENDURECIDO")
    print(f"  URL Local: {url}")
    print(f"  Base de Datos: {DATA_FILE}")
    print(f"  Seguridad: Rate Limiting Activo, CORS Restringido, Headers CSP/HSTS")
    print("=" * 70 + "\n")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido limpiamente.")


if __name__ == "__main__":
    main()
