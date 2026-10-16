# Estación de Servicios Sullcairi — Sistema ERP de Combustibles & Vales
### Sede Oficial: Jesús de Lauricocha • Huánuco | RUC: 20608945123 | Tel: 962 123 456

Sistema ERP web multi-página de alto rendimiento, diseñado con la arquitectura independiente de **Leytrix**, con persistencia local **IndexedDB** (100% offline-first) y sincronización bidireccional automática en la nube con **Supabase Cloud**.

---

## 🚀 Acceso en Línea (GitHub Pages)

Puedes abrir el sistema desde cualquier celular, tablet o computadora sin instalar nada:
👉 **[Abrir Estación Sullcairi en GitHub Pages](https://ediczon2006.github.io/sullcairi/)**

Al compartir el enlace con cualquier persona:
1. Funciona de inmediato en su propio navegador y dispositivo.
2. Los datos se almacenan en su dispositivo localmente y se sincronizan en tiempo real con Supabase Cloud.

---

## ☁️ Configuración de Supabase Cloud (1 Clic)

El sistema ya viene configurado con el proyecto de Supabase:
- **URL:** `https://gtfmhtrvsbfcftstbadj.supabase.co`
- **Publishable Key:** `sb_publishable_jLqnXfwQ2Zksb_fvuympjQ_v2OR8F8x`
- **Proyecto:** `gtfmhtrvsbfcftstbadj`

### Para activar las tablas en Supabase:
1. Ingresa a tu panel en [Supabase SQL Editor](https://supabase.com/dashboard/project/gtfmhtrvsbfcftstbadj/sql/new).
2. Copia todo el contenido del archivo [`supabase_setup.sql`](supabase_setup.sql) (o usa el botón **"📋 Copiar Código SQL"** dentro del modal de la nube en cualquier página del sistema).
3. Pégalo en el editor y haz clic en **Run**.
4. ¡Listo! Todas las tablas, políticas de seguridad RLS y canales Realtime quedarán activos.

---

## 🗂️ Estructura Multi-Página Independiente

Cada página es autónoma, posee su propia lógica y barra lateral responsiva:

| Página | Descripción |
|---|---|
| [`index.html`](index.html) | **Panel General:** KPIs globales, nivel cilíndrico de los 3 tanques, top entidades con deuda y últimos vales. |
| [`vales.html`](vales.html) | **Registro de Vales:** Buscador predictivo, filtros por combustible, turno y grifero, comprobante WhatsApp, edición y anulación segura con PIN. |
| [`agregar.html`](agregar.html) | **Emitir Vale:** Despacho rápido interactivo con correlativo automático, cálculo bidireccional Galones/Soles y presets. |
| [`cobranza.html`](cobranza.html) | **Cuentas por Cobrar:** Consolidado de deuda por institución (UGEL, Salud, Fiscalía, etc.), recordatorio WhatsApp con desglose y liquidación con PIN. |
| [`tanques.html`](tanques.html) | **Tanques & Varillaje:** Monitoreo de 6,000 GL de almacenamiento, alertas por colorimetría y calibración por varillaje físico con PIN. |
| [`diario.html`](diario.html) | **Registro Diario:** Auditoría cronológica por Día, Fecha, Año, Turno y Grifero con exportación a Excel (.csv). |
| [`importexport.html`](importexport.html) | **Importar / Exportar:** Carga masiva de archivos Excel (.xlsx/.csv) con SheetJS, previsualización, plantilla modelo y respaldos JSON. |
| [`configuracion.html`](configuracion.html) | **Tarifas & Ajustes:** Precios oficiales por galón, datos de la estación, cambio de PIN de administrador (SHA-256) y reinicio de fábrica. |

---

## 🛢️ Tanques y Combustibles de la Estación

Capacidad total: **6,000 Galones** distribuidos en 3 tanques subterráneos:
- **Diesel B5-S50:** 3,000 GL (Stock inicial: 2,150 GL | Alerta naranja: 500 GL | Alerta roja: 250 GL | Tarifa ref.: S/. 16.80)
- **Gasohol Premium:** 1,500 GL (Stock inicial: 1,100 GL | Alerta naranja: 500 GL | Alerta roja: 250 GL | Tarifa ref.: S/. 19.50)
- **Gasohol Regular:** 1,500 GL (Stock inicial: 980 GL | Alerta naranja: 500 GL | Alerta roja: 250 GL | Tarifa ref.: S/. 17.20)

---

## 🔒 Seguridad y Buenas Prácticas Implementadas

- **Protección XSS y Sanitización:** Codificación de entidades HTML y validación estricta de cadenas y valores numéricos en `js/security.js`.
- **PIN de Administrador Cifrado con SHA-256:** Las operaciones de alto riesgo (anulación de vales, varillaje físico, liquidación total y cambio de configuración) requieren el PIN de administrador (por defecto: `1234`).
- **Control de Inyección:** Parametrización y saneamiento de objetos antes de almacenamiento en IndexedDB y Supabase.
- **Row-Level Security (RLS):** Scripts DDL configurados para el acceso y sincronización multi-dispositivo seguro.
- **100% Offline-First:** Si se corta la conexión a internet en la estación, el sistema sigue operando normalmente y sincroniza en fondo al restablecerse la red.
