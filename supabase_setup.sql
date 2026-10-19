-- ====================================================================
-- ESTACIÓN DE SERVICIOS SULLCAIRI — ESQUEMA SUPABASE CLOUD
-- Proyecto: gtfmhtrvsbfcftstbadj
-- Sede Fija Oficial: jesus_de_lauricocha_huanuco
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. LIMPIEZA DE TABLAS PREVIAS (Evita errores de columnas antiguas como 'saldo', 'stock_resultante')
DROP TABLE IF EXISTS public.movimientos_tanque CASCADE;
DROP TABLE IF EXISTS public.configuracion CASCADE;
DROP TABLE IF EXISTS public.vales CASCADE;
DROP TABLE IF EXISTS public.tanques CASCADE;

-- 2. TABLA DE VALES DE COMBUSTIBLE
CREATE TABLE public.vales (
  id BIGINT PRIMARY KEY,
  fecha DATE NOT NULL,
  fecha_recojo DATE,
  n_vale INTEGER NOT NULL,
  turno VARCHAR(50) DEFAULT 'T1 (Mañana)',
  cliente TEXT NOT NULL,
  lugar VARCHAR(120) NOT NULL DEFAULT 'jesus_de_lauricocha_huanuco',
  telefono VARCHAR(30),
  placa VARCHAR(20) DEFAULT '-',
  conductor VARCHAR(120) DEFAULT '-',
  producto VARCHAR(60) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
  precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  grifero VARCHAR(60) DEFAULT 'YANET',
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'FACTURADO', 'ANULADO')),
  observacion TEXT,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW()),
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

ALTER TABLE public.vales ADD COLUMN IF NOT EXISTS fecha_recojo DATE;

-- 3. TABLA DE TANQUES DE COMBUSTIBLE (6,000 GL TOTAL)
CREATE TABLE public.tanques (
  producto VARCHAR(60) PRIMARY KEY,
  capacidad NUMERIC(10,2) NOT NULL CHECK (capacidad > 0),
  stock NUMERIC(10,2) NOT NULL CHECK (stock >= 0),
  alerta_naranja NUMERIC(10,2) NOT NULL DEFAULT 500,
  alerta_roja NUMERIC(10,2) NOT NULL DEFAULT 250,
  unidad VARCHAR(10) NOT NULL DEFAULT 'Gln',
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

-- 4. TABLA DE MOVIMIENTOS Y AUDITORÍA DE TANQUES
CREATE TABLE public.movimientos_tanque (
  id TEXT PRIMARY KEY,
  fecha_completa TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW()),
  dia INTEGER NOT NULL DEFAULT 1,
  mes INTEGER NOT NULL DEFAULT 1,
  ano INTEGER NOT NULL DEFAULT 2026,
  producto VARCHAR(60) NOT NULL DEFAULT 'DIESEL B5-S50',
  tipo VARCHAR(60) NOT NULL DEFAULT 'DESPACHO',
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(10,2) NOT NULL DEFAULT 0,
  motivo TEXT,
  responsable VARCHAR(60) DEFAULT 'YANET'
);

-- 5. TABLA DE CONFIGURACIÓN
CREATE TABLE public.configuracion (
  id TEXT PRIMARY KEY DEFAULT 'sullcairi_config',
  estacion_nombre TEXT NOT NULL DEFAULT 'ESTACIÓN DE SERVICIOS SULLCAIRI',
  ruc VARCHAR(20) NOT NULL DEFAULT '20608945123',
  telefono VARCHAR(30) NOT NULL DEFAULT '962123456',
  sede VARCHAR(120) NOT NULL DEFAULT 'jesus_de_lauricocha_huanuco',
  precio_diesel NUMERIC(10,2) NOT NULL DEFAULT 16.80,
  precio_premium NUMERIC(10,2) NOT NULL DEFAULT 19.50,
  precio_regular NUMERIC(10,2) NOT NULL DEFAULT 17.20,
  pin_hash TEXT NOT NULL DEFAULT 'f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf',
  usuarios JSONB DEFAULT '[{"usuario":"ADMIN","nombre":"Administrador de Estación","rol":"ADMIN","pin_hash":"f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf","activo":true},{"usuario":"YANET","nombre":"Yanet Quispe","rol":"OPERADOR","pin_hash":"551e64290af89b026ed20617797ffe2b7cdcbcd401d894d105308089c86b3bf8","activo":true},{"usuario":"CRESILDO","nombre":"Cresildo Alvarado","rol":"OPERADOR","pin_hash":"45ee58c792f5a8b094a5126d33af19b0501b59782f92a0b1cdcc4834bb31f48c","activo":true},{"usuario":"YAMILEX","nombre":"Yamilex Soto","rol":"OPERADOR","pin_hash":"3f9e0144391381255366e5b359bd59a6ba7a6c53afd8eda48f6ea311a7b6b155","activo":true}]'::jsonb,
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.vales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_tanque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE ACCESO SEGURO
CREATE POLICY "vales_politica_acceso" ON public.vales 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "tanques_politica_acceso" ON public.tanques 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "movimientos_politica_acceso" ON public.movimientos_tanque 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "configuracion_politica_acceso" ON public.configuracion 
  FOR ALL USING (true) WITH CHECK (true);

-- 8. SEMILLAS OFICIALES DE TANQUES
INSERT INTO public.tanques (producto, capacidad, stock, alerta_naranja, alerta_roja, unidad)
VALUES 
  ('DIESEL B5-S50', 3000, 2150, 500, 250, 'Gln'),
  ('GASOHOL PREMIUM', 1500, 1100, 500, 250, 'Gln'),
  ('GASOHOL REGULAR', 1500, 980, 500, 250, 'Gln')
ON CONFLICT (producto) DO NOTHING;

-- 9. SEMILLA DE CONFIGURACIÓN
INSERT INTO public.configuracion (id, estacion_nombre, ruc, telefono, sede, precio_diesel, precio_premium, precio_regular, pin_hash)
VALUES ('sullcairi_config', 'ESTACIÓN DE SERVICIOS SULLCAIRI', '20608945123', '962123456', 'jesus_de_lauricocha_huanuco', 16.80, 19.50, 17.20, 'f5bb261d9412a5ccd608fc6a4c4b8a8ff01ec6e8e90e73e09cfa15a7d22be8bf')
ON CONFLICT (id) DO NOTHING;

-- 10. ACTIVAR REALTIME REPLICATION
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vales, public.tanques, public.movimientos_tanque, public.configuracion;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
