#!/usr/bin/env python3
"""
=============================================================================
SISTEMA DE GESTIÓN Y CONTROL DE VALES DE COMBUSTIBLE - SERVIDOR LOCAL REST
=============================================================================
Arquitectura:
- Servidor HTTP multi-hilo nativo de alto rendimiento (sin dependencias externas).
- Persistencia atómica segura mediante reemplazo de archivo (.tmp -> .json).
- Rotación automática de respaldos en la carpeta /backups.
- API REST con endpoints para sincronización, copias de seguridad y estado.
- Compatibilidad multiplataforma (Windows / Linux / macOS).
"""

import json
import os
import sys
import time
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "datos.json")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")
MAX_PAYLOAD = 32 * 1024 * 1024  # 32 MB max

os.makedirs(BACKUP_DIR, exist_ok=True)

DEMO_VALES = [
    { "id": 101, "fecha": "2026-08-17", "n_vale": 377, "turno": "T1 (Mañana)", "cliente": "Transportes Andina S.A.C.", "lugar": "Sede Lima", "telefono": "987654321", "placa": "A1B-823", "conductor": "Carlos Rojas", "producto": "PREMIUM", "cantidad": 8.0, "precio": 19.50, "total": 156.00, "grifero": "Juan P.", "estado": "FACTURADO", "observacion": "F001-00452" },
    { "id": 102, "fecha": "2026-08-17", "n_vale": 378, "turno": "T1 (Mañana)", "cliente": "Constructora del Sur", "lugar": "Cantera Sur", "telefono": "951234567", "placa": "C4F-912", "conductor": "Manuel Vega", "producto": "PREMIUM", "cantidad": 3.0, "precio": 19.50, "total": 58.50, "grifero": "Juan P.", "estado": "FACTURADO", "observacion": "F001-00455" },
    { "id": 103, "fecha": "2026-08-18", "n_vale": 379, "turno": "T2 (Tarde)", "cliente": "-", "lugar": "General", "telefono": "", "placa": "-", "conductor": "-", "producto": "PREMIUM", "cantidad": 0.0, "precio": 0.0, "total": 0.0, "grifero": "Pedro M.", "estado": "ANULADO", "observacion": "VALE ROTO" },
    { "id": 104, "fecha": "2026-08-19", "n_vale": 380, "turno": "T1 (Mañana)", "cliente": "Distribuidora Lima", "lugar": "Almacén Central", "telefono": "940112233", "placa": "T6U-711", "conductor": "Jorge Quispe", "producto": "DIESEL B5", "cantidad": 10.0, "precio": 16.80, "total": 168.00, "grifero": "Luis G.", "estado": "FACTURADO", "observacion": "F001-00460" },
    { "id": 105, "fecha": "2026-08-19", "n_vale": 381, "turno": "T2 (Tarde)", "cliente": "Transportes Andina S.A.C.", "lugar": "Sede Lima", "telefono": "987654321", "placa": "A1B-823", "conductor": "Carlos Rojas", "producto": "PREMIUM", "cantidad": 4.0, "precio": 19.50, "total": 78.00, "grifero": "Pedro M.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 106, "fecha": "2026-08-17", "n_vale": 382, "turno": "T3 (Noche)", "cliente": "Minera Horizonte", "lugar": "Campamento Norte", "telefono": "998877665", "placa": "V7X-551", "conductor": "Alonso Ruiz", "producto": "PREMIUM", "cantidad": 1.0, "precio": 19.50, "total": 19.50, "grifero": "Mario S.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 107, "fecha": "2026-08-20", "n_vale": 383, "turno": "T1 (Mañana)", "cliente": "Constructora del Sur", "lugar": "Cantera Sur", "telefono": "951234567", "placa": "C4F-912", "conductor": "Manuel Vega", "producto": "PREMIUM", "cantidad": 4.0, "precio": 19.50, "total": 78.00, "grifero": "Juan P.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 108, "fecha": "2026-08-21", "n_vale": 384, "turno": "T1 (Mañana)", "cliente": "Distribuidora Lima", "lugar": "Almacén Central", "telefono": "940112233", "placa": "T6U-711", "conductor": "Jorge Quispe", "producto": "PREMIUM", "cantidad": 7.0, "precio": 19.50, "total": 136.50, "grifero": "Luis G.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 109, "fecha": "2026-08-21", "n_vale": 385, "turno": "T2 (Tarde)", "cliente": "Agropecuaria San José", "lugar": "Fundo Cañete", "telefono": "977441122", "placa": "B8K-102", "conductor": "Raúl Castro", "producto": "PREMIUM", "cantidad": 8.0, "precio": 19.50, "total": 156.00, "grifero": "Pedro M.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 110, "fecha": "2026-08-22", "n_vale": 386, "turno": "T1 (Mañana)", "cliente": "-", "lugar": "General", "telefono": "", "placa": "-", "conductor": "-", "producto": "PREMIUM", "cantidad": 0.0, "precio": 0.0, "total": 0.0, "grifero": "Juan P.", "estado": "ANULADO", "observacion": "VALE EXTRAVIADO" },
    { "id": 111, "fecha": "2026-08-25", "n_vale": 387, "turno": "T1 (Mañana)", "cliente": "Distribuidora Lima", "lugar": "Almacén Central", "telefono": "940112233", "placa": "T6U-711", "conductor": "Jorge Quispe", "producto": "DIESEL B5", "cantidad": 11.0, "precio": 16.80, "total": 184.80, "grifero": "Luis G.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 112, "fecha": "2026-08-25", "n_vale": 388, "turno": "T2 (Tarde)", "cliente": "Transportes Andina S.A.C.", "lugar": "Sede Lima", "telefono": "987654321", "placa": "A1B-823", "conductor": "Carlos Rojas", "producto": "PREMIUM", "cantidad": 4.0, "precio": 19.50, "total": 78.00, "grifero": "Pedro M.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 113, "fecha": "2026-08-26", "n_vale": 389, "turno": "T1 (Mañana)", "cliente": "Constructora del Sur", "lugar": "Cantera Sur", "telefono": "951234567", "placa": "C4F-912", "conductor": "Manuel Vega", "producto": "PREMIUM", "cantidad": 4.0, "precio": 19.50, "total": 78.00, "grifero": "Juan P.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 114, "fecha": "2026-08-27", "n_vale": 390, "turno": "T1 (Mañana)", "cliente": "Agropecuaria San José", "lugar": "Fundo Cañete", "telefono": "977441122", "placa": "B8K-102", "conductor": "Raúl Castro", "producto": "PREMIUM", "cantidad": 8.0, "precio": 19.50, "total": 156.00, "grifero": "Luis G.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 115, "fecha": "2026-08-31", "n_vale": 391, "turno": "T2 (Tarde)", "cliente": "Transportes Andina S.A.C.", "lugar": "Sede Lima", "telefono": "987654321", "placa": "B3M-442", "conductor": "Felipe Díaz", "producto": "PREMIUM", "cantidad": 7.0, "precio": 19.50, "total": 136.50, "grifero": "Pedro M.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 116, "fecha": "2026-08-31", "n_vale": 392, "turno": "T3 (Noche)", "cliente": "-", "lugar": "General", "telefono": "", "placa": "-", "conductor": "-", "producto": "PREMIUM", "cantidad": 0.0, "precio": 0.0, "total": 0.0, "grifero": "Mario S.", "estado": "ANULADO", "observacion": "CORRELATIVO SALTADO" },
    { "id": 117, "fecha": "2026-08-31", "n_vale": 393, "turno": "T3 (Noche)", "cliente": "-", "lugar": "General", "telefono": "", "placa": "-", "conductor": "-", "producto": "PREMIUM", "cantidad": 0.0, "precio": 0.0, "total": 0.0, "grifero": "Mario S.", "estado": "ANULADO", "observacion": "ERROR DE IMPRESIÓN" },
    { "id": 118, "fecha": "2026-09-01", "n_vale": 394, "turno": "T1 (Mañana)", "cliente": "Distribuidora Lima", "lugar": "Almacén Central", "telefono": "940112233", "placa": "T6U-711", "conductor": "Jorge Quispe", "producto": "DIESEL B5", "cantidad": 6.0, "precio": 16.80, "total": 100.80, "grifero": "Luis G.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 119, "fecha": "2026-09-02", "n_vale": 395, "turno": "T2 (Tarde)", "cliente": "Minera Horizonte", "lugar": "Campamento Norte", "telefono": "998877665", "placa": "V7X-551", "conductor": "Alonso Ruiz", "producto": "PREMIUM", "cantidad": 12.0, "precio": 19.50, "total": 234.00, "grifero": "Pedro M.", "estado": "PENDIENTE", "observacion": "" },
    { "id": 120, "fecha": "2026-09-02", "n_vale": 396, "turno": "T3 (Noche)", "cliente": "-", "lugar": "General", "telefono": "", "placa": "-", "conductor": "-", "producto": "PREMIUM", "cantidad": 0.0, "precio": 0.0, "total": 0.0, "grifero": "Mario S.", "estado": "ANULADO", "observacion": "PLACA INCORRECTA" }
]

# Estructura empresarial por defecto
DEFAULT_STATE = {
    "version": "2.0.0",
    "empresa": "ESTACIÓN DE SERVICIOS Y COMBUSTIBLES S.A.C.",
    "ruc": "20601234567",
    "direccion": "Av. Panamericana Sur Km 140 - Cañete, Lima",
    "telefono": "01-480-1234",
    "pais": "51",
    "precios": {
        "DIESEL B5": 16.80,
        "PREMIUM": 19.50,
        "REGULAR": 17.20,
        "GLP": 8.50
    },
    "tanques": {
        "DIESEL B5": {"capacidad": 8000, "stock": 4250, "unidad": "Gln"},
        "PREMIUM": {"capacidad": 5000, "stock": 2840, "unidad": "Gln"},
        "REGULAR": {"capacidad": 6000, "stock": 3100, "unidad": "Gln"},
        "GLP": {"capacidad": 4000, "stock": 1950, "unidad": "Gln"}
    },
    "vales": DEMO_VALES
}

def leer_datos():
    """Lee datos.json de forma segura; si no existe, inicializa con el estado por defecto."""
    if not os.path.exists(DATA_FILE):
        escribir_datos(DEFAULT_STATE)
        return json.loads(json.dumps(DEFAULT_STATE))
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return json.loads(json.dumps(DEFAULT_STATE))
        merged = json.loads(json.dumps(DEFAULT_STATE))
        merged.update(data)
        return merged
    except (json.JSONDecodeError, OSError) as err:
        print(f"[ERROR] No se pudo leer {DATA_FILE}: {err}")
        return json.loads(json.dumps(DEFAULT_STATE))

def escribir_datos(datos):
    """Guarda atómicamente en un temporal y luego reemplaza."""
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_FILE)

def crear_backup():
    """Crea una copia de respaldo fechada en /backups."""
    if not os.path.exists(DATA_FILE):
        return None
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"backup_{timestamp}.json")
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f_src:
            content = f_src.read()
        with open(backup_path, "w", encoding="utf-8") as f_dst:
            f_dst.write(content)
        # Mantener solo los últimos 30 backups
        archivos = sorted([os.path.join(BACKUP_DIR, a) for a in os.listdir(BACKUP_DIR) if a.endswith(".json")])
        while len(archivos) > 30:
            os.remove(archivos.pop(0))
        return os.path.basename(backup_path)
    except Exception as err:
        print(f"[AVISO] Error al crear backup: {err}")
        return None


class GrifoRequestHandler(SimpleHTTPRequestHandler):
    """Manejador HTTP profesional con soporte para API REST y archivos estáticos."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, fmt, *args):
        # Log formateado y conciso con marca de tiempo
        sys.stdout.write(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]}\n")

    def responder_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path_clean = self.path.split("?")[0].rstrip("/")

        if path_clean in ("/api/datos", "api/datos"):
            self.responder_json(200, leer_datos())
            return

        if path_clean in ("/api/estado", "api/estado"):
            datos = leer_datos()
            tamano = os.path.getsize(DATA_FILE) if os.path.exists(DATA_FILE) else 0
            self.responder_json(200, {
                "ok": True,
                "version": datos.get("version", "2.0.0"),
                "total_vales": len(datos.get("vales", [])),
                "tamano_bytes": tamano,
                "empresa": datos.get("empresa", "")
            })
            return

        if path_clean in ("/api/backups", "api/backups"):
            archivos = [
                {
                    "nombre": a,
                    "fecha": datetime.fromtimestamp(os.path.getmtime(os.path.join(BACKUP_DIR, a))).strftime("%Y-%m-%d %H:%M:%S"),
                    "tamano": os.path.getsize(os.path.join(BACKUP_DIR, a))
                }
                for a in sorted(os.listdir(BACKUP_DIR), reverse=True) if a.endswith(".json")
            ]
            self.responder_json(200, {"ok": True, "backups": archivos})
            return

        # Servir archivos estáticos (HTML, CSS, JS)
        super().do_GET()

    def do_POST(self):
        path_clean = self.path.split("?")[0].rstrip("/")

        if path_clean in ("/api/backup", "api/backup"):
            nombre = crear_backup()
            self.responder_json(200, {"ok": True, "backup": nombre})
            return

        if path_clean not in ("/api/datos", "api/datos"):
            self.send_error(404, "Endpoint no encontrado")
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0

        if length <= 0 or length > MAX_PAYLOAD:
            self.responder_json(400, {"ok": False, "error": "Cuerpo de solicitud inválido o demasiado grande"})
            return

        try:
            body_bytes = self.rfile.read(length)
            datos = json.loads(body_bytes.decode("utf-8"))
            if not isinstance(datos, dict):
                raise ValueError("Payload debe ser un objeto JSON")
        except Exception as err:
            self.responder_json(400, {"ok": False, "error": f"JSON inválido: {str(err)}"})
            return

        try:
            escribir_datos(datos)
            self.responder_json(200, {"ok": True, "mensaje": "Datos guardados correctamente"})
        except Exception as err:
            self.responder_json(500, {"ok": False, "error": str(err)})


def get_ip_local():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    puerto = 8000
    if len(sys.argv) > 1:
        try:
            puerto = int(sys.argv[1])
        except ValueError:
            print("El puerto debe ser numérico. Ejemplo: python servidor.py 8080")
            return

    host = "0.0.0.0"
    ip_local = get_ip_local()
    servidor = ThreadingHTTPServer((host, puerto), GrifoRequestHandler)

    # Asegurar que datos.json exista al iniciar
    leer_datos()

    print("\n" + "=" * 70)
    print("  ⛽ SISTEMA EMPRESARIAL DE CONTROL DE VALES - ESTACIÓN DE SERVICIOS")
    print(f"  🌐 En tu PC:          http://localhost:{puerto}")
    if ip_local != "127.0.0.1":
        print(f"  📱 En red local (WiFi): http://{ip_local}:{puerto}")
    print(f"  📁 Base de datos:     {DATA_FILE}")
    print(f"  💾 Copias de respaldo:{BACKUP_DIR}")
    print("=" * 70 + "\n")

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Servidor detenido por el usuario.")


if __name__ == "__main__":
    main()
