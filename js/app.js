/**
 * ============================================================================
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN (js/app.js)
 * Versión 2.1 - Filtro por Lugares/Sedes e Importador de Excel
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = (() => {
  let valeSeleccionadoWA = null;
  let valesParaImportar = [];
  let ordenColumna = { col: 'fecha', asc: false };

  function init() {
    Store.subscribe(renderizarTodo);
    Store.init();

    // Navegación de pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        cambiarPestana(btn.getAttribute('data-tab'));
      });
    });

    // Configurar Dropzone para importar Excel
    configurarDropzone();

    // Inicializar formulario
    inicializarFormularioVale();
  }

  function cambiarPestana(nombreTab) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-pane').forEach(p => p.style.display = 'none');

    const tabBtn = document.querySelector(`.tab-btn[data-tab="${nombreTab}"]`);
    const pane = document.getElementById(`view-${nombreTab}`);

    if (tabBtn) tabBtn.classList.add('active');
    if (pane) pane.style.display = 'block';

    localStorage.setItem('grifo_active_tab', nombreTab);
  }

  function renderizarTodo(state) {
    actualizarHeader(state);
    actualizarDatalistLugares();
    renderizarDashboard(state);
    renderizarTablaVales(state);
    renderizarCobranza(state);
    renderizarTanques(state);
    actualizarCamposConfiguracion(state);
  }

  function actualizarHeader(state) {
    document.getElementById('header-empresa').textContent = state.empresa || "ESTACIÓN DE SERVICIOS";
    document.getElementById('header-ruc').textContent = state.ruc ? `RUC: ${state.ruc}` : "RUC: No configurado";
    document.getElementById('header-dir').textContent = state.direccion || "";
  }

  function actualizarDatalistLugares() {
    const lugares = Store.getLugaresDisponibles();
    const datalist = document.getElementById('datalist-lugares');
    if (datalist) {
      datalist.innerHTML = '';
      lugares.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        datalist.appendChild(opt);
      });
    }

    // Actualizar también el select de filtros por lugar
    const filtroLugar = document.getElementById('filtro-lugar');
    if (filtroLugar) {
      const valorPrevio = filtroLugar.value;
      filtroLugar.innerHTML = '<option value="">Todos los Lugares / Sedes</option>';
      lugares.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.textContent = l;
        filtroLugar.appendChild(opt);
      });
      filtroLugar.value = valorPrevio;
    }

    // Filtro en cuentas por cobrar
    const filtroLugarCob = document.getElementById('filtro-lugar-cobranza');
    if (filtroLugarCob) {
      const valorPrevio = filtroLugarCob.value;
      filtroLugarCob.innerHTML = '<option value="">Todos los Lugares / Sedes</option>';
      lugares.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.textContent = l;
        filtroLugarCob.appendChild(opt);
      });
      filtroLugarCob.value = valorPrevio;
    }
  }

  // 1. DASHBOARD EJECUTIVO
  function renderizarDashboard(state) {
    const m = Store.getMetricas();

    document.getElementById('dash-diesel-gln').textContent = `${m.dieselGln.toFixed(2)} Gln`;
    document.getElementById('dash-diesel-sol').textContent = `S/ ${m.dieselSoles.toFixed(2)}`;

    document.getElementById('dash-premium-gln').textContent = `${m.premiumGln.toFixed(2)} Gln`;
    document.getElementById('dash-premium-sol').textContent = `S/ ${m.premiumSoles.toFixed(2)}`;

    document.getElementById('dash-regular-gln').textContent = `${m.regularGln.toFixed(2)} Gln`;
    document.getElementById('dash-regular-sol').textContent = `S/ ${m.regularSoles.toFixed(2)}`;

    document.getElementById('dash-glp-gln').textContent = `${m.glpGln.toFixed(2)} Gln`;
    document.getElementById('dash-glp-sol').textContent = `S/ ${m.glpSoles.toFixed(2)}`;

    document.getElementById('dash-total-sol').textContent = `S/ ${m.totalSoles.toFixed(2)}`;
    document.getElementById('dash-total-gln').textContent = `${m.totalGln.toFixed(2)} Gln despachados`;

    document.getElementById('dash-porcobrar-sol').textContent = `S/ ${m.pendienteSoles.toFixed(2)}`;
    document.getElementById('dash-porcobrar-count').textContent = `${m.cantPendientes} vales pendientes`;

    document.getElementById('dash-anulados-count').textContent = m.anulados;

    // Resumen por Lugares / Sedes
    const tbodyLugares = document.getElementById('tbody-lugares-resumen');
    if (tbodyLugares) {
      tbodyLugares.innerHTML = '';
      if (m.rankingLugares.length === 0) {
        tbodyLugares.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:18px; color:#94a3b8;">Sin datos registrados</td></tr>';
      } else {
        m.rankingLugares.forEach((lug, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${idx + 1}. ${escapeHtml(lug.lugar)}</strong></td>
            <td class="num-cell">${lug.vales}</td>
            <td class="num-cell">${lug.galones.toFixed(2)} Gln</td>
            <td class="num-cell" style="font-weight:700; color:var(--brand-800);">S/ ${lug.soles.toFixed(2)}</td>
          `;
          tbodyLugares.appendChild(tr);
        });
      }
    }

    // Top Clientes
    const tbodyTop = document.getElementById('tbody-top-clientes');
    if (tbodyTop) {
      tbodyTop.innerHTML = '';
      const top5 = m.rankingClientes.slice(0, 5);
      if (top5.length === 0) {
        tbodyTop.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:18px; color:#94a3b8;">Sin consumos registrados</td></tr>';
      } else {
        top5.forEach((c, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <strong>${idx + 1}. ${escapeHtml(c.cliente)}</strong>
              <div style="font-size:0.7rem; color:#64748b;">${escapeHtml(c.lugar)}</div>
            </td>
            <td class="num-cell">${c.valesTotales}</td>
            <td class="num-cell">${c.totalGln.toFixed(2)} Gln</td>
            <td class="num-cell" style="font-weight:700; color:var(--brand-800);">S/ ${c.totalSoles.toFixed(2)}</td>
          `;
          tbodyTop.appendChild(tr);
        });
      }
    }
  }

  // 2. TABLA DE VALES CON ORDENAMIENTO Y FILTROS
  function renderizarTablaVales(state) {
    const tbody = document.getElementById('tbody-vales');
    if (!tbody) return;

    let vales = [...state.vales];
    const filtroProd = document.getElementById('filtro-producto').value;
    const filtroEst = document.getElementById('filtro-estado').value;
    const filtroLug = document.getElementById('filtro-lugar') ? document.getElementById('filtro-lugar').value : '';
    const q = normalizarBusqueda(document.getElementById('search-input').value);

    tbody.innerHTML = '';

    if (vales.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="15" style="text-align:center; padding: 45px 20px; color:#64748b;">
            <h4 style="font-size:1.05rem; color:#1e293b; margin-bottom:6px;">No hay vales registrados</h4>
            <p style="font-size:0.84rem; max-width:420px; margin:0 auto;">Utilice el formulario superior para añadir registros o use "Subir Excel" para cargar su archivo masivo.</p>
          </td>
        </tr>
      `;
      document.getElementById('badge-vales-count').textContent = "0 Vales";
      document.getElementById('tfoot-vales').style.display = 'none';
      return;
    }

    // Filtrar
    vales = vales.filter(v => {
      if (filtroProd && v.producto !== filtroProd) return false;
      if (filtroEst && v.estado !== filtroEst) return false;
      if (filtroLug && (v.lugar || 'Principal') !== filtroLug) return false;
      if (q) {
        const rowText = normalizarBusqueda(`${v.cliente} ${v.lugar} ${v.placa} ${v.n_vale} ${v.conductor} ${v.telefono} ${v.grifero}`);
        if (!rowText.includes(q)) return false;
      }
      return true;
    });

    // Ordenar
    vales.sort((a, b) => {
      let valA = a[ordenColumna.col];
      let valB = b[ordenColumna.col];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return ordenColumna.asc ? -1 : 1;
      if (valA > valB) return ordenColumna.asc ? 1 : -1;
      return 0;
    });

    let sumGln = 0;
    let sumSoles = 0;

    vales.forEach((v, index) => {
      const isAnulado = v.estado === 'ANULADO';

      if (!isAnulado) {
        sumGln += Number(v.cantidad) || 0;
        sumSoles += Number(v.total) || 0;
      }

      let fuelClass = 'pill-fuel--diesel';
      if (v.producto === 'PREMIUM') fuelClass = 'pill-fuel--premium';
      else if (v.producto === 'REGULAR') fuelClass = 'pill-fuel--regular';
      else if (v.producto === 'GLP') fuelClass = 'pill-fuel--glp';

      let badgeClass = 'pill-status--pending';
      let badgeLabel = 'EMITIDO';
      if (v.estado === 'FACTURADO') { badgeClass = 'pill-status--billed'; badgeLabel = 'FACTURADO'; }
      else if (v.estado === 'ANULADO') { badgeClass = 'pill-status--void'; badgeLabel = 'ANULADO'; }

      const telLimpio = normalizarTelefono(v.telefono);
      let waButton = `<span style="color:#94a3b8">-</span>`;
      if (telLimpio) {
        waButton = `
          <button type="button" class="btn btn--whatsapp btn--sm" style="padding:2px 7px; font-size:0.73rem;" onclick="App.abrirModalWhatsApp(${v.id})" title="WhatsApp: ${escapeHtml(v.telefono)}">
            WA: ${escapeHtml(v.telefono)}
          </button>
        `;
      }

      const tr = document.createElement('tr');
      if (isAnulado) tr.className = 'row--void';

      tr.innerHTML = `
        <td style="color:#64748b; font-size:0.74rem;">${index + 1}</td>
        <td>${formatearFecha(v.fecha)}</td>
        <td><strong style="font-family:'JetBrains Mono'; font-size:0.88rem;">#${escapeHtml(v.n_vale)}</strong></td>
        <td><strong>${escapeHtml(v.cliente)}</strong></td>
        <td><span class="pill-lugar">${escapeHtml(v.lugar || 'Principal')}</span></td>
        <td>${waButton}</td>
        <td>${v.placa !== '-' ? `<span class="plate-mono">${escapeHtml(v.placa)}</span>` : '-'}</td>
        <td>${escapeHtml(v.conductor)}</td>
        <td><span class="pill-fuel ${fuelClass}">${escapeHtml(v.producto)}</span></td>
        <td class="num-cell">${isAnulado ? '0.00' : Number(v.cantidad).toFixed(2)}</td>
        <td class="num-cell">${isAnulado ? '0.00' : 'S/ ' + Number(v.precio).toFixed(2)}</td>
        <td class="num-cell" style="font-weight:700; color:${isAnulado ? '#991b1b' : 'var(--slate-900)'};">
          ${isAnulado ? '0.00' : 'S/ ' + Number(v.total).toFixed(2)}
        </td>
        <td style="font-size:0.76rem;">${escapeHtml(v.grifero)} <small style="color:#64748b;">(${escapeHtml(v.turno)})</small></td>
        <td><span class="pill-status ${badgeClass}">${badgeLabel}</span></td>
        <td class="actions-col" style="text-align:center; white-space:nowrap;">
          <button type="button" class="btn btn--outline btn--icon" onclick="App.editarVale(${v.id})" title="Editar">✏️</button>
          ${!isAnulado ? `<button type="button" class="btn btn--outline btn--icon" style="color:#dc2626;" onclick="App.anularVale(${v.id})" title="Anular">🚫</button>` : ''}
          <button type="button" class="btn btn--outline btn--icon" style="color:#64748b;" onclick="App.eliminarVale(${v.id})" title="Eliminar">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('badge-vales-count').textContent = `${vales.length} Vales`;
    const tfoot = document.getElementById('tfoot-vales');
    if (vales.length > 0) {
      tfoot.style.display = 'table-footer-group';
      document.getElementById('foot-total-gln').textContent = `${sumGln.toFixed(2)} Gln`;
      document.getElementById('foot-total-soles').textContent = `S/ ${sumSoles.toFixed(2)}`;
    } else {
      tfoot.style.display = 'none';
    }
  }

  function ordenarPor(columna) {
    if (ordenColumna.col === columna) {
      ordenColumna.asc = !ordenColumna.asc;
    } else {
      ordenColumna.col = columna;
      ordenColumna.asc = true;
    }
    renderizarTablaVales(Store.getState());
  }

  // 3. CUENTAS POR COBRAR
  function renderizarCobranza(state) {
    const tbody = document.getElementById('tbody-clientes-cobranza');
    if (!tbody) return;

    const m = Store.getMetricas();
    const filtroLug = document.getElementById('filtro-lugar-cobranza') ? document.getElementById('filtro-lugar-cobranza').value : '';

    tbody.innerHTML = '';

    let lista = m.rankingClientes;
    if (filtroLug) {
      lista = lista.filter(c => (c.lugar || 'Principal') === filtroLug);
    }

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No hay clientes en este criterio.</td></tr>';
      return;
    }

    lista.forEach((c, idx) => {
      const tr = document.createElement('tr');
      const tel = normalizarTelefono(c.telefono);

      tr.innerHTML = `
        <td style="color:#64748b;">${idx + 1}</td>
        <td>
          <strong>${escapeHtml(c.cliente)}</strong>
          <div style="font-size:0.72rem; color:#64748b;">Sede: ${escapeHtml(c.lugar || 'Principal')}</div>
        </td>
        <td>${c.telefono ? `<span class="pill-status" style="background:#e0f2fe; color:#0369a1;">${escapeHtml(c.telefono)}</span>` : '-'}</td>
        <td class="num-cell"><strong style="color:#d97706;">${c.valesPendientes}</strong> / ${c.valesTotales}</td>
        <td class="num-cell">${c.totalGln.toFixed(2)} Gln</td>
        <td class="num-cell" style="font-weight:800; font-size:0.92rem; color:${c.deudaSoles > 0 ? '#b91c1c' : '#15803d'};">
          S/ ${c.deudaSoles.toFixed(2)}
        </td>
        <td style="text-align:center; white-space:nowrap;">
          ${tel && c.deudaSoles > 0 ? `
            <button type="button" class="btn btn--whatsapp btn--sm" onclick="App.enviarCobranzaCliente('${escapeHtml(c.cliente)}', '${tel}', ${c.deudaSoles}, ${c.valesPendientes})">
              Cobrar por WhatsApp
            </button>
          ` : '<span style="color:#94a3b8; font-size:0.75rem;">Sin deuda</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 4. TANQUES
  function renderizarTanques(state) {
    const container = document.getElementById('tanques-container');
    if (!container) return;

    container.innerHTML = '';
    Object.entries(state.tanques).forEach(([combustible, t]) => {
      const pct = Math.min(100, Math.round((t.stock / t.capacidad) * 100));
      let colorBar = '#059669';
      if (pct < 25) colorBar = '#dc2626';
      else if (pct < 50) colorBar = '#d97706';

      const div = document.createElement('div');
      div.className = 'kpi-box';
      div.innerHTML = `
        <div class="kpi-box__head">
          <span style="font-size:0.85rem; font-weight:800; color:var(--slate-800);">${escapeHtml(combustible)}</span>
          <span class="pill-status" style="background:#f1f5f9; color:#334155;">${pct}% Capacidad</span>
        </div>
        <div style="height:14px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin:10px 0;">
          <div style="width:${pct}%; height:100%; background:${colorBar}; transition:width 0.5s;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#64748b;">
          <span>Stock: <strong>${t.stock.toLocaleString()} Gln</strong></span>
          <span>Máx: <strong>${t.capacidad.toLocaleString()} Gln</strong></span>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function actualizarCamposConfiguracion(state) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('cfg-empresa', state.empresa);
    set('cfg-ruc', state.ruc);
    set('cfg-direccion', state.direccion);
    set('cfg-telefono', state.telefono);
    if (state.precios) {
      set('cfg-p-diesel', state.precios["DIESEL B5"]);
      set('cfg-p-premium', state.precios["PREMIUM"]);
      set('cfg-p-regular', state.precios["REGULAR"]);
      set('cfg-p-glp', state.precios["GLP"]);
    }
  }

  // 5. IMPORTADOR DE EXCEL (SUBIR EXCEL)
  function configurarDropzone() {
    const dropzone = document.getElementById('dropzone-excel');
    const input = document.getElementById('input-archivo-excel');

    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        procesarArchivoSubido(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        procesarArchivoSubido(e.target.files[0]);
      }
    });
  }

  function abrirModalImportarExcel() {
    valesParaImportar = [];
    document.getElementById('import-status-box').style.display = 'none';
    document.getElementById('btn-confirmar-importar').disabled = true;
    document.getElementById('input-archivo-excel').value = '';
    document.getElementById('modal-importar-excel').classList.add('active');
  }

  function cerrarModalImportarExcel() {
    document.getElementById('modal-importar-excel').classList.remove('active');
  }

  function procesarArchivoSubido(file) {
    const statusBox = document.getElementById('import-status-box');
    const btnConfirmar = document.getElementById('btn-confirmar-importar');

    statusBox.style.display = 'block';
    statusBox.innerHTML = '<div style="color:#64748b;">Analizando estructura del archivo...</div>';

    Exporter.procesarArchivoExcel(file, (res) => {
      if (!res.ok) {
        statusBox.innerHTML = `<div style="color:#b91c1c; font-weight:700;">Error: ${escapeHtml(res.error)}</div>`;
        btnConfirmar.disabled = true;
        return;
      }

      valesParaImportar = res.valesValidos;
      btnConfirmar.disabled = (valesParaImportar.length === 0);

      statusBox.innerHTML = `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:6px; color:#15803d; font-size:0.85rem;">
          <strong>Archivo analizado correctamente:</strong>
          <div>Se encontraron <strong>${valesParaImportar.length} vales válidos</strong> listos para ser importados.</div>
          ${res.errores.length > 0 ? `<div style="color:#d97706; margin-top:4px;">Aviso: ${res.errores.length} filas con error fueron omitidas.</div>` : ''}
        </div>
      `;
    });
  }

  async function ejecutarImportacion() {
    if (valesParaImportar.length === 0) return;
    const modoReemplazar = document.getElementById('check-reemplazar-import').checked;

    await Store.importarValesMasivos(valesParaImportar, modoReemplazar);
    cerrarModalImportarExcel();
    mostrarToast(`Se importaron ${valesParaImportar.length} vales con éxito`);
    cambiarPestana('vales');
  }

  // 6. GESTIÓN DEL FORMULARIO
  function inicializarFormularioVale() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    document.getElementById('input-fecha').value = `${anio}-${mes}-${dia}`;
    actualizarPrecioSegunCombustible();
    document.getElementById('input-nvale').value = Store.getSiguienteVale();
  }

  function actualizarPrecioSegunCombustible() {
    const state = Store.getState();
    const prod = document.getElementById('input-producto').value;
    const precioInput = document.getElementById('input-precio');
    if (state.precios && state.precios[prod] !== undefined) {
      precioInput.value = Number(state.precios[prod]).toFixed(2);
    }
    calcularTotalEnVivo();
  }

  function calcularTotalEnVivo() {
    const cant = parseFloat(document.getElementById('input-cantidad').value) || 0;
    const prec = parseFloat(document.getElementById('input-precio').value) || 0;
    const total = Math.round(cant * prec * 100) / 100;
    document.getElementById('input-total').value = `S/ ${total.toFixed(2)}`;
  }

  function gestionarEstadoAnulado() {
    const est = document.getElementById('input-estado').value;
    const cInput = document.getElementById('input-cliente');
    const pInput = document.getElementById('input-placa');
    if (est === 'ANULADO') {
      cInput.removeAttribute('required');
      pInput.removeAttribute('required');
    } else {
      cInput.setAttribute('required', 'required');
      pInput.setAttribute('required', 'required');
    }
  }

  async function guardarVale(e) {
    e.preventDefault();

    const editId = document.getElementById('edit-id').value;
    const fecha = document.getElementById('input-fecha').value;
    const n_vale = parseInt(document.getElementById('input-nvale').value);
    const turno = document.getElementById('input-turno').value;
    const cliente = document.getElementById('input-cliente').value.trim() || "-";
    const lugar = document.getElementById('input-lugar').value.trim() || "Principal";
    const telefono = document.getElementById('input-telefono').value.trim();
    const placa = document.getElementById('input-placa').value.trim().toUpperCase() || "-";
    const conductor = document.getElementById('input-conductor').value.trim() || "-";
    const producto = document.getElementById('input-producto').value;
    const cantidad = parseFloat(document.getElementById('input-cantidad').value) || 0;
    const precio = parseFloat(document.getElementById('input-precio').value) || 0;
    const total = Math.round(cantidad * precio * 100) / 100;
    const grifero = document.getElementById('input-grifero').value.trim() || "Isla 01";
    const estado = document.getElementById('input-estado').value;
    const observacion = document.getElementById('input-obs').value.trim();
    const autoWA = document.getElementById('check-auto-wa').checked;

    const state = Store.getState();
    const existeDuplicado = state.vales.some(v => v.n_vale === n_vale && String(v.id) !== String(editId));
    if (existeDuplicado) {
      alert(`El N° de Vale #${n_vale} ya se encuentra registrado.`);
      document.getElementById('input-nvale').focus();
      return;
    }

    const valeData = {
      id: editId ? Number(editId) : Date.now(),
      fecha, n_vale, turno, cliente, lugar, telefono, placa, conductor,
      producto, cantidad, precio, total, grifero, estado, observacion
    };

    if (editId) {
      await Store.actualizarVale(Number(editId), valeData);
      mostrarToast(`Vale #${n_vale} actualizado`);
    } else {
      await Store.agregarVale(valeData);
      mostrarToast(`Vale #${n_vale} registrado`);
    }

    limpiarFormulario();

    if (autoWA && telefono && estado !== 'ANULADO') {
      const telLimpio = normalizarTelefono(telefono);
      if (telLimpio) {
        const texto = generarMensajeDespacho(valeData);
        abrirEnlaceWASeguro(telLimpio, texto);
      }
    }
  }

  function editarVale(id) {
    const state = Store.getState();
    const v = state.vales.find(item => item.id === id);
    if (!v) return;

    document.getElementById('edit-id').value = v.id;
    document.getElementById('form-vale-title').textContent = `Modificando Vale N° ${v.n_vale}`;
    document.getElementById('btn-guardar-vale').textContent = "Guardar Cambios";

    document.getElementById('input-fecha').value = v.fecha;
    document.getElementById('input-nvale').value = v.n_vale;
    document.getElementById('input-turno').value = v.turno;
    document.getElementById('input-cliente').value = v.cliente === '-' ? '' : v.cliente;
    document.getElementById('input-lugar').value = v.lugar || '';
    document.getElementById('input-telefono').value = v.telefono || "";
    document.getElementById('input-placa').value = v.placa === '-' ? '' : v.placa;
    document.getElementById('input-conductor').value = v.conductor === '-' ? '' : v.conductor;
    document.getElementById('input-producto').value = v.producto;
    document.getElementById('input-cantidad').value = v.cantidad;
    document.getElementById('input-precio').value = v.precio;
    document.getElementById('input-total').value = `S/ ${Number(v.total).toFixed(2)}`;
    document.getElementById('input-grifero').value = v.grifero;
    document.getElementById('input-estado').value = v.estado;
    document.getElementById('input-obs').value = v.observacion || "";

    gestionarEstadoAnulado();
    cambiarPestana('vales');
    window.scrollTo({ top: 180, behavior: 'smooth' });
  }

  function limpiarFormulario() {
    document.getElementById('edit-id').value = "";
    document.getElementById('form-vale-title').textContent = "Registrar Nuevo Vale de Combustible";
    document.getElementById('btn-guardar-vale').textContent = "Registrar Vale";
    document.getElementById('input-cliente').value = "";
    document.getElementById('input-lugar').value = "";
    document.getElementById('input-telefono').value = "";
    document.getElementById('input-placa').value = "";
    document.getElementById('input-conductor').value = "";
    document.getElementById('input-cantidad').value = "";
    document.getElementById('input-total').value = "S/ 0.00";
    document.getElementById('input-obs').value = "";
    document.getElementById('input-estado').value = "PENDIENTE";
    gestionarEstadoAnulado();
    inicializarFormularioVale();
  }

  async function anularVale(id) {
    const state = Store.getState();
    const v = state.vales.find(item => item.id === id);
    if (!v) return;

    const motivo = prompt(`Motivo de anulación para el Vale #${v.n_vale}:`, "Error de despacho / Vale roto");
    if (motivo !== null) {
      await Store.anularVale(id, motivo);
      mostrarToast(`Vale #${v.n_vale} anulado`);
    }
  }

  async function eliminarVale(id) {
    const state = Store.getState();
    const v = state.vales.find(item => item.id === id);
    if (!v) return;

    if (confirm(`¿Confirma eliminar el Vale #${v.n_vale}?`)) {
      await Store.eliminarVale(id);
      mostrarToast("Vale eliminado");
    }
  }

  // WHATSAPP
  function normalizarTelefono(t) {
    if (!t) return "";
    let clean = String(t).replace(/[^0-9]/g, '');
    if (clean.length === 9) clean = "51" + clean;
    return (clean.length >= 8 && clean.length <= 15) ? clean : "";
  }

  function generarMensajeDespacho(v) {
    const state = Store.getState();
    return (
      `*${state.empresa} - CONSTANCIA DE DESPACHO*\n\n` +
      `Estimado(a) *${v.cliente}* (Sede: ${v.lugar || 'Principal'}), confirmamos el vale registrado:\n\n` +
      `*Vale:* #${v.n_vale}\n` +
      `*Fecha:* ${formatearFecha(v.fecha)} (${v.turno})\n` +
      `*Placa:* ${v.placa}\n` +
      `*Conductor:* ${v.conductor}\n` +
      `*Combustible:* ${v.producto}\n` +
      `*Cantidad:* ${Number(v.cantidad).toFixed(2)} Galones\n` +
      `*P.U.:* S/ ${Number(v.precio).toFixed(2)}\n` +
      `*Total:* S/ ${Number(v.total).toFixed(2)}\n` +
      `*Estado:* ${v.estado}\n\n` +
      `Agradecemos su preferencia.`
    );
  }

  function abrirModalWhatsApp(id) {
    const state = Store.getState();
    const v = state.vales.find(item => item.id === id);
    if (!v) return;

    const tel = normalizarTelefono(v.telefono);
    if (!tel) {
      alert("Este vale no cuenta con un número válido.");
      return;
    }

    valeSeleccionadoWA = v;
    document.getElementById('modal-wa-dest').value = `${v.telefono} (${v.cliente} - ${v.lugar || 'Principal'})`;
    document.getElementById('modal-wa-tipo').value = (v.estado === 'PENDIENTE') ? 'cobro' : 'despacho';
    actualizarPreviewWA();
    document.getElementById('modal-wa').classList.add('active');
  }

  function actualizarPreviewWA() {
    if (!valeSeleccionadoWA) return;
    const tipo = document.getElementById('modal-wa-tipo').value;
    const state = Store.getState();
    const v = valeSeleccionadoWA;

    let txt = "";
    if (tipo === 'cobro') {
      txt = (
        `*ESTADO DE CUENTA - ${state.empresa}*\n\n` +
        `Estimado(a) *${v.cliente}* (${v.lugar || 'Sede Principal'}),\n` +
        `Le recordamos que mantiene pendiente el Vale N° #${v.n_vale} por el importe de *S/ ${Number(v.total).toFixed(2)}* ` +
        `(${v.cantidad} Gln de ${v.producto}, Placa: ${v.placa}).\n\n` +
        `Agradeceremos coordinar la cancelación. Saludos cordiales.`
      );
    } else {
      txt = generarMensajeDespacho(v);
    }
    document.getElementById('modal-wa-preview').textContent = txt;
  }

  function enviarWhatsAppDesdeModal() {
    if (!valeSeleccionadoWA) return;
    const tel = normalizarTelefono(valeSeleccionadoWA.telefono);
    const txt = document.getElementById('modal-wa-preview').textContent;
    abrirEnlaceWASeguro(tel, txt);
    cerrarModalWA();
  }

  function enviarCobranzaCliente(cliente, tel, totalDeuda, cantVales) {
    const state = Store.getState();
    const msg = (
      `*ESTADO DE CUENTA - ${state.empresa}*\n\n` +
      `Estimado(a) *${cliente}*,\n` +
      `Le informamos que cuenta con *${cantVales} vales pendientes de pago* ` +
      `por un total de *S/ ${totalDeuda.toFixed(2)}*.\n\n` +
      `Agradeceremos coordinar la liquidación correspondiente. Saludos cordiales.`
    );
    abrirEnlaceWASeguro(tel, msg);
  }

  function abrirEnlaceWASeguro(tel, msg) {
    const url = `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) win.opener = null;
  }

  function cerrarModalWA() {
    document.getElementById('modal-wa').classList.remove('active');
    valeSeleccionadoWA = null;
  }

  // CONFIGURACIÓN Y CONTROLES
  async function guardarConfiguracionEmpresa(e) {
    e.preventDefault();
    const emp = document.getElementById('cfg-empresa').value.trim();
    const ruc = document.getElementById('cfg-ruc').value.trim();
    const dir = document.getElementById('cfg-direccion').value.trim();
    const precios = {
      "DIESEL B5": parseFloat(document.getElementById('cfg-p-diesel').value) || 16.80,
      "PREMIUM": parseFloat(document.getElementById('cfg-p-premium').value) || 19.50,
      "REGULAR": parseFloat(document.getElementById('cfg-p-regular').value) || 17.20,
      "GLP": parseFloat(document.getElementById('cfg-p-glp').value) || 8.50
    };
    await Store.actualizarConfiguracion(emp, ruc, dir, precios);
    actualizarPrecioSegunCombustible();
    mostrarToast("Configuración guardada correctamente");
  }

  async function cargarDemostracion() {
    if (confirm("¿Desea cargar los datos de demostración?")) {
      await Store.cargarDatosDemo();
      mostrarToast("Datos cargados correctamente");
      cambiarPestana('vales');
    }
  }

  async function limpiarTodo() {
    if (confirm("¿Desea vaciar los registros de la base de datos?")) {
      await Store.limpiarBaseDatos();
      mostrarToast("Sistema limpio y vacío");
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatearFecha(f) {
    if (!f) return "-";
    const parts = f.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return f;
  }

  function normalizarBusqueda(txt) {
    return String(txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function mostrarToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  return {
    init,
    cambiarPestana,
    ordenarPor,
    guardarVale,
    editarVale,
    anularVale,
    eliminarVale,
    limpiarFormulario,
    actualizarPrecioSegunCombustible,
    calcularTotalEnVivo,
    gestionarEstadoAnulado,
    abrirModalImportarExcel,
    cerrarModalImportarExcel,
    ejecutarImportacion,
    abrirModalWhatsApp,
    actualizarPreviewWA,
    enviarWhatsAppDesdeModal,
    enviarCobranzaCliente,
    cerrarModalWA,
    guardarConfiguracionEmpresa,
    cargarDemostracion,
    limpiarTodo
  };
})();
