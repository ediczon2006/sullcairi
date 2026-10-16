-- ====================================================================
-- ESTACIÓN DE SERVICIOS SULLCAIRI - ESQUEMA SUPABASE CLOUD (ESTILO LEYTRIX)
-- Proyecto: gtfmhtrvsbfcftstbadj
-- Sede Fija Oficial: jesus_de_lauricocha_huanuco
-- ====================================================================

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

-- 2. TABLA DE TANQUES DE COMBUSTIBLE (6,000 GL TOTAL)
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

-- Datos iniciales oficiales de tanques (6,000 GL)
INSERT INTO public.tanques (producto, capacidad, stock, alerta_naranja, alerta_roja, unidad)
VALUES 
  ('DIESEL B5-S50', 3000, 2150, 500, 250, 'Gln'),
  ('GASOHOL PREMIUM', 1500, 1100, 500, 250, 'Gln'),
  ('GASOHOL REGULAR', 1500, 980, 500, 250, 'Gln')
ON CONFLICT (producto) DO NOTHING;
