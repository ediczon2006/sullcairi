# Sistema ERP de Gestión de Combustibles y Control de Vales
### Estación de Servicios y Combustibles S.A.C. (Grifo Sullcairi)

Sistema web integral de alta disponibilidad para la gestión, despacho, control de vales de crédito, cuentas por cobrar, cubicación de tanques y liquidación de clientes para estaciones de servicios.

---

## 🚀 Acceso Rápido y Modos de Uso

### 1. Enlace Web Público (En línea)
Puedes abrir y compartir el sistema directamente desde cualquier navegador (PC, Tablet o Celular) sin instalar nada:
👉 **[Abrir Sistema en GitHub Pages](https://ediczon2006.github.io/grifo_sullcairi/)**

### 2. Archivo Único Portable (`grifo_sullcairi_completo.html`)
- Un archivo HTML 100% autónomo con todos los estilos, scripts y base de datos embebidos.
- Se puede enviar por WhatsApp, Telegram o correo electrónico a cualquier persona.
- Basta con hacer doble clic para abrirlo en cualquier navegador sin conexión a internet ni servidor.

### 3. Servidor Local REST con Persistencia (`servidor.py`)
Para uso operativo en oficina o caja con guardado automático en disco (`datos.json`) y copias de seguridad:

```bash
# Iniciar servidor local en el puerto 8000
python servidor.py

# O especificar otro puerto:
python servidor.py 8080
```

El servidor mostrará en consola:
- **En tu computadora:** `http://localhost:8000`
- **En red local (WiFi para celulares o laptops de oficina):** `http://192.168.x.x:8000`

---

## 📋 Módulos Principales

### 1. Panel de Control (Dashboard)
- **KPIs en tiempo real:** Galones y soles despachados por combustible (Diesel B5 S-50, Gasohol Premium, Regular y GLP).
- **Control de Cartera:** Monto total facturado vs. pendiente de cobro.
- **Top 5 Clientes:** Ranking de mayor consumo en volumen y facturación.
- **Consumo por Sedes / Lugares:** Métricas agrupadas geográficamente (Lima, Cantera Sur, Almacén Central, Fundo Cañete, etc.).

### 2. Registro y Control de Vales
- Formulario de despacho rápido con cálculo de importes en tiempo real según tarifario.
- Validación de correlatividad y prevención de duplicados de vales.
- Buscador predictivo multidimensional (cliente, placa, chofer, número de vale, grifero).
- Filtros instantáneos por combustible, estado (Emitido, Facturado, Anulado) y sede/lugar.
- Acciones rápidas: Edición, anulación justificada y eliminación.
- Generación de constancia de despacho para WhatsApp con un solo clic.

### 3. Cuentas por Cobrar (Liquidación de Clientes)
- Consolidado por cliente con conteo de vales pendientes vs. históricos.
- Saldo deudor totalizado por empresa.
- **Botón directo de cobranza por WhatsApp:** Abre la conversación con un mensaje detallado del estado de cuenta y monto adeudado listo para enviar.

### 4. Medición de Tanques de Almacenamiento
- Monitoreo de niveles de stock actual vs. capacidad máxima por tanque.
- Indicadores visuales de nivel crítico con alertas por colorimetría (verde, ámbar, rojo).

### 5. Configuración y Tarifario
- Datos fiscales de la empresa (Razón Social, RUC, Dirección fiscal, Teléfono de contacto).
- Precios oficiales por galón de cada combustible.

---

## 📊 Integración con Microsoft Excel (.xlsx)

1. **Descargar Reporte Excel:** Exporta todos los registros de vales con formato ejecutivo profesional de celdas y columnas.
2. **Subir / Importar Excel:** Zona Drag-and-Drop para importar hojas de cálculo masivas, con detección inteligente de columnas y opción de anexar o reemplazar.
3. **Descargar Plantilla Oficial:** Genera una plantilla lista para que griferos o clientes llenen sus vales.
4. **Generador Automatizado (`crear_excel_grifo.py`):** Script en Python con `openpyxl` que genera el libro de trabajo corporativo con fórmulas automáticas (`SUMIFS`, `COUNTIF`), estilos premium y pestañas de auditoría.

```bash
python crear_excel_grifo.py
```

---

## 🗂️ Estructura del Proyecto

```
grifo_sullcairi/
│
├── index.html                   # Aplicación principal del sistema
├── grifo_sullcairi_completo.html# Versión portable 100% independiente en un solo archivo
├── servidor.py                  # Servidor HTTP / REST multihilo en Python 3
├── datos.json                   # Base de datos local persistente
├── crear_excel_grifo.py         # Generador de plantilla y libro Excel
├── build_standalone.py          # Constructor del bundle HTML independiente
│
├── css/
│   └── theme.css                # Sistema de diseño, temas corporativos y tipografía
│
├── js/
│   ├── store.js                 # Store centralizado, cálculo de métricas y persistencia
│   ├── app.js                   # Controlador de vistas, tablas, WhatsApp y modales
│   └── export.js                # Motor de importación y exportación SheetJS / Excel
│
└── backups/                     # Copias de seguridad automáticas rotativas
```

---

## 🔒 Seguridad y Respaldos

- **Respaldos locales:** Cada guardado en `servidor.py` genera copias rotativas fechadas en `/backups` (se conservan las últimas 30 versiones).
- **Descarga de JSON de respaldo:** Opción en la interfaz para descargar la base de datos completa como archivo `.json`.
- **Compatibilidad offline:** Si no se dispone de conexión ni servidor, el sistema funciona de manera autónoma almacenando el estado en el navegador (`LocalStorage`).
