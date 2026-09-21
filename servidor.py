#!/usr/bin/env python3
"""
=============================================================================
SISTEMA DE GESTIÓN Y CONTROL DE VALES DE COMBUSTIBLE - SERVIDOR LOCAL REST
=============================================================================
"""

import json
import os
import sys
import threading
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "datos.json")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")
MAX_PAYLOAD = 32 * 1024 * 1024
FILE_LOCK = threading.Lock()

os.makedirs(BACKUP_DIR, exist_ok=True)

DEFAULT_STATE = {
    "version": "2.2.0",
    "empresa": "ESTACIÓN DE SERVICIOS SULLCAIRI",
    "ruc": "20608945123",
    "direccion": "jesus_de_lauricocha_huanuco",
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
    "lugares": ["jesus_de_lauricocha_huanuco"],
    "movimientos_tanque": [],
    "vales": []
}

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
        archivos = sorted([os.path.join(BACKUP_DIR, a) for a in os.listdir(BACKUP_DIR) if a.endswith(".json")])
        while len(archivos) > 30:
            os.remove(archivos.pop(0))
        return os.path.basename(backup_path)
    except Exception as err:
        print(f"[AVISO] Error al crear backup: {err}")
        return None


class GrifoRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, fmt, *args):
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
                "version": datos.get("version", "2.1.0"),
                "total_vales": len(datos.get("vales", [])),
                "tamano_bytes": tamano,
                "empresa": datos.get("empresa", "")
            })
            return
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
            if length <= 0 or length > MAX_PAYLOAD:
                self.responder_json(400, {"ok": False, "error": "Cuerpo inválido o vacío"})
                return
            body_bytes = self.rfile.read(length)
            datos = json.loads(body_bytes.decode("utf-8"))
            if not isinstance(datos, dict):
                raise ValueError("El JSON debe ser un objeto/diccionario")
            
            # Validación de esquema mínimo para evitar corrupción o borrado accidental
            if "vales" not in datos or not isinstance(datos["vales"], list):
                raise ValueError("El esquema debe contener la lista 'vales'")
            if "tanques" in datos and not isinstance(datos["tanques"], dict):
                raise ValueError("El campo 'tanques' debe ser un objeto")

            # Garantizar que la sede sea siempre estática
            datos["direccion"] = "jesus_de_lauricocha_huanuco"
            datos["lugares"] = ["jesus_de_lauricocha_huanuco"]

            escribir_datos(datos)
            self.responder_json(200, {"ok": True, "mensaje": "Guardado exitosamente", "total_vales": len(datos["vales"])})
        except Exception as err:
            self.responder_json(400, {"ok": False, "error": str(err)})


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
    print(f"  ESTACIÓN DE SERVICIOS JESÚS - SERVIDOR ACTIVO EN: {url}")
    print(f"  Archivo de datos: {DATA_FILE}")
    print("=" * 70 + "\n")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")


if __name__ == "__main__":
    main()
