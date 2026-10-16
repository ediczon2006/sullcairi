-- ====================================================================
-- ESTACIÓN DE SERVICIOS SULLCAIRI - ESQUEMA SUPABASE CLOUD ENTERPRISE
-- Proyecto: gtfmhtrvsbfcftstbadj
-- Sede Fija Oficial Inmutable: jesus_de_lauricocha_huanuco
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA DE VALES DE COMBUSTIBLE CON VALIDACIÓN ESTRICTA
CREATE TABLE IF NOT EXISTS public.vales (
  id BIGINT PRIMARY KEY,
  fecha DATE NOT NULL,
  n_vale INTEGER NOT NULL,
  turno VARCHAR(50) DEFAULT 'T1 (Mañana)',
  cliente TEXT NOT NULL,
  lugar VARCHAR(120) NOT NULL DEFAULT 'jesus_de_lauricocha_huanuco',
  telefono VARCHAR(30),
  placa VARCHAR(20) DEFAULT '-',
  conductor VARCHAR(120) DEFAULT '-',
  producto VARCHAR(60) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0 AND cantidad <= 15000),
  precio NUMERIC(10,2) NOT NULL CHECK (precio > 0 AND precio <= 500),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0 AND total = round((cantidad * precio)::numeric, 2)),
  grifero VARCHAR(60) DEFAULT 'YANET',
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'FACTURADO', 'ANULADO')),
  observacion TEXT,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW()),
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW()),
  CONSTRAINT chk_lugar_sullcairi CHECK (lugar = 'jesus_de_lauricocha_huanuco')
);

-- 2. TABLA DE TANQUES DE COMBUSTIBLE (6,000 GL TOTAL)
CREATE TABLE IF NOT EXISTS public.tanques (
  producto VARCHAR(60) PRIMARY KEY,
  capacidad NUMERIC(10,2) NOT NULL CHECK (capacidad > 0),
  stock NUMERIC(10,2) NOT NULL CHECK (stock >= 0 AND stock <= capacidad),
  alerta_naranja NUMERIC(10,2) NOT NULL DEFAULT 500,
  alerta_roja NUMERIC(10,2) NOT NULL DEFAULT 250,
  unidad VARCHAR(10) NOT NULL DEFAULT 'Gln',
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW())
);

-- 3. TABLA DE AUDITORÍA Y PANEL DE MOVIMIENTOS DIARIOS
CREATE TABLE IF NOT EXISTS public.movimientos_tanque (
  id TEXT PRIMARY KEY,
  fecha_completa TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW()),
  dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 31),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  producto VARCHAR(60) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  saldo NUMERIC(10,2) NOT NULL CHECK (saldo >= 0),
  motivo TEXT,
  responsable VARCHAR(60) DEFAULT 'YANET'
);

-- 4. TABLA DE CONFIGURACIÓN Y TARIFARIO
CREATE TABLE IF NOT EXISTS public.configuracion (
  id TEXT PRIMARY KEY DEFAULT 'sullcairi_config',
  estacion_nombre TEXT NOT NULL DEFAULT 'ESTACIÓN DE SERVICIOS SULLCAIRI',
  ruc VARCHAR(20) NOT NULL DEFAULT '20608945123',
  telefono VARCHAR(30) NOT NULL DEFAULT '962123456',
  sede VARCHAR(120) NOT NULL DEFAULT 'jesus_de_lauricocha_huanuco',
  precio_diesel NUMERIC(10,2) NOT NULL DEFAULT 16.80 CHECK (precio_diesel > 0),
  precio_premium NUMERIC(10,2) NOT NULL DEFAULT 19.50 CHECK (precio_premium > 0),
  precio_regular NUMERIC(10,2) NOT NULL DEFAULT 17.20 CHECK (precio_regular > 0),
  pin_hash TEXT NOT NULL DEFAULT '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Lima', NOW()),
  CONSTRAINT chk_sede_sullcairi CHECK (sede = 'jesus_de_lauricocha_huanuco')
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.vales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_tanque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
DROP POLICY IF EXISTS "RLS Vales Select" ON public.vales;
DROP POLICY IF EXISTS "RLS Vales Insert" ON public.vales;
DROP POLICY IF EXISTS "RLS Vales Update" ON public.vales;
DROP POLICY IF EXISTS "RLS Vales Delete" ON public.vales;

-- Políticas RLS Vales: Blindadas contra manipulación de campos
CREATE POLICY "RLS Vales Select" ON public.vales 
  FOR SELECT USING (lugar = 'jesus_de_lauricocha_huanuco');

CREATE POLICY "RLS Vales Insert" ON public.vales 
  FOR INSERT WITH CHECK (
    lugar = 'jesus_de_lauricocha_huanuco' AND
    cantidad > 0 AND
    precio > 0 AND
    total = round((cantidad * precio)::numeric, 2)
  );

CREATE POLICY "RLS Vales Update" ON public.vales 
  FOR UPDATE USING (lugar = 'jesus_de_lauricocha_huanuco')
  WITH CHECK (
    lugar = 'jesus_de_lauricocha_huanuco' AND
    cantidad > 0 AND
    precio > 0 AND
    total = round((cantidad * precio)::numeric, 2)
  );

CREATE POLICY "RLS Vales Delete" ON public.vales 
  FOR DELETE USING (lugar = 'jesus_de_lauricocha_huanuco');

-- Políticas RLS Tanques
DROP POLICY IF EXISTS "RLS Tanques Select" ON public.tanques;
DROP POLICY IF EXISTS "RLS Tanques Insert" ON public.tanques;
DROP POLICY IF EXISTS "RLS Tanques Update" ON public.tanques;

CREATE POLICY "RLS Tanques Select" ON public.tanques FOR SELECT USING (true);
CREATE POLICY "RLS Tanques Insert" ON public.tanques FOR INSERT WITH CHECK (stock >= 0 AND stock <= capacidad);
CREATE POLICY "RLS Tanques Update" ON public.tanques FOR UPDATE USING (true) WITH CHECK (stock >= 0 AND stock <= capacidad);

-- Políticas RLS Movimientos
DROP POLICY IF EXISTS "RLS Movimientos Select" ON public.movimientos_tanque;
DROP POLICY IF EXISTS "RLS Movimientos Insert" ON public.movimientos_tanque;

CREATE POLICY "RLS Movimientos Select" ON public.movimientos_tanque FOR SELECT USING (true);
CREATE POLICY "RLS Movimientos Insert" ON public.movimientos_tanque FOR INSERT WITH CHECK (saldo >= 0);

-- Políticas RLS Configuración
DROP POLICY IF EXISTS "RLS Config Select" ON public.configuracion;
DROP POLICY IF EXISTS "RLS Config Update" ON public.configuracion;
DROP POLICY IF EXISTS "RLS Config Insert" ON public.configuracion;

CREATE POLICY "RLS Config Select" ON public.configuracion FOR SELECT USING (sede = 'jesus_de_lauricocha_huanuco');
CREATE POLICY "RLS Config Insert" ON public.configuracion FOR INSERT WITH CHECK (sede = 'jesus_de_lauricocha_huanuco');
CREATE POLICY "RLS Config Update" ON public.configuracion FOR UPDATE USING (sede = 'jesus_de_lauricocha_huanuco') WITH CHECK (sede = 'jesus_de_lauricocha_huanuco');

-- Publicación Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vales, public.tanques, public.movimientos_tanque, public.configuracion;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Datos Semilla Tanques (6,000 GL)
INSERT INTO public.tanques (producto, capacidad, stock, alerta_naranja, alerta_roja, unidad)
VALUES 
  ('DIESEL B5-S50', 3000, 2150, 500, 250, 'Gln'),
  ('GASOHOL PREMIUM', 1500, 1100, 500, 250, 'Gln'),
  ('GASOHOL REGULAR', 1500, 980, 500, 250, 'Gln')
ON CONFLICT (producto) DO NOTHING;

-- Datos Semilla Configuración
INSERT INTO public.configuracion (id, estacion_nombre, ruc, telefono, sede, precio_diesel, precio_premium, precio_regular)
VALUES ('sullcairi_config', 'ESTACIÓN DE SERVICIOS SULLCAIRI', '20608945123', '962123456', 'jesus_de_lauricocha_huanuco', 16.80, 19.50, 17.20)
ON CONFLICT (id) DO NOTHING;
