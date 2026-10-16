/**
 * ============================================================================
 * CONTROLADOR PRINCIPAL - ESTACIÓN DE SERVICIOS JESÚS (js/app.js)
 * Versión 2.2 - Previsualizador completo de Excel y Soporte de Tanques Oficiales
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = (() => {
  let valeSeleccionadoWA = null;
  let valesParaImportar = [];
  let ordenColumna = { col: 'fecha', asc: false };
  let debounceBusqueda = null;

  function obtenerFechaHoyISO() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  function obtenerClaseCombustible(tipo) {
    if (!tipo) return 'pill-fuel--diesel';
    const t = String(tipo).toUpperCase();
    if (t.includes('PREMIUM')) return 'pill-fuel--premium';
    if (t.includes('REGULAR')) return 'pill-fuel--regular';
    return 'pill-fuel--diesel';
  }

  function filtrarValesDebounce() {
    clearTimeout(debounceBusqueda);
    debounceBusqueda = setTimeout(() => {
      renderizarTablaVales(Store.getState());
    }, 120);
  }

  function init() {
    Store.subscribe((state) => {
      renderizarTodo(state);
      // Mantener actualizado el número correlativo sugerido si no se está editando
      const nValeInput = document.getElementById('input-nvale');
      const editIdEl = document.getElementById('edit-id');
      const editId = editIdEl ? editIdEl.value : '';
      if (nValeInput && !editId && (!nValeInput.value || nValeInput.value === '401')) {
        nValeInput.value = Store.getSiguienteVale();
      }
    });
    Store.init();

    // Navegación de pestañas (compatibilidad SPA y multi-página)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab');
        if (tab && document.getElementById(`view-${tab}`)) {
          e.preventDefault();
          cambiarPestana(tab);
        }
      });
    });

    configurarDropzone();
    inicializarFormularioVale();

    // Si viene con parámetro ?edit=ID en la URL (ej. enlace desde otra página)
    const urlParams = new URLSearchParams(window.location.search);
    const idParaEditar = urlParams.get('edit');
    if (idParaEditar) {
      setTimeout(() => {
        editarVale(Number(idParaEditar));
      }, 150);
    }
  }

  function cambiarPestana(nombreTab) {
    const pane = document.getElementById(`view-${nombreTab}`);
    if (pane) {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view-pane').forEach(p => p.style.display = 'none');

      const tabBtn = document.querySelector(`.tab-btn[data-tab="${nombreTab}"]`);
      if (tabBtn) tabBtn.classList.add('active');
      pane.style.display = 'block';

      localStorage.setItem('grifo_active_tab', nombreTab);
    } else {
      const rutas = {
        'dashboard': 'index.html',
        'vales': 'vales.html',
        'cobranza': 'cobranza.html',
        'tanques': 'tanques.html',
        'importar': 'importar.html',
        'configuracion': 'configuracion.html'
      };
      if (rutas[nombreTab]) {
        window.location.href = rutas[nombreTab];
      }
    }
  }

  function renderizarTodo(state) {
    actualizarHeader(state);
    actualizarDatalistsYSelects(state);
    renderizarDashboard(state);
    renderizarTablaVales(state);
    renderizarCobranza(state);
    renderizarTanques(state);
    renderizarMovimientosDiarios(state);
    actualizarCamposConfiguracion(state);
  }

  function actualizarHeader(state) {
    const empEl = document.getElementById('header-empresa');
    if (empEl) empEl.textContent = state.empresa || "ESTACIÓN DE SERVICIOS SULLCAIRI";
    const rucEl = document.getElementById('header-ruc');
    if (rucEl) rucEl.textContent = state.ruc ? `RUC: ${state.ruc}` : "RUC: 20608945123";
    const dirEl = document.getElementById('header-dir');
    if (dirEl) dirEl.textContent = "jesus_de_lauricocha_huanuco";
  }

  function actualizarDatalistsYSelects(state) {
    // Select de Clientes (Directo, amplio y sin desbordes)
    const selectCli = document.getElementById('input-cliente');
    if (selectCli && Array.isArray(state.clientes)) {
      const valPrevio = selectCli.value;
      selectCli.innerHTML = '<option value="">-- Seleccionar Cliente / Entidad --</option>';
      state.clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        selectCli.appendChild(opt);
      });
      const optOtro = document.createElement('option');
      optOtro.value = "__NUEVO__";
      optOtro.textContent = "+ Escribir otro cliente / entidad...";
      selectCli.appendChild(optOtro);

      if (valPrevio && valPrevio !== "__NUEVO__") {
        selectCli.value = valPrevio;
      }
    }

    // Personal / Griferos
    const selectGrifero = document.getElementById('input-grifero');
    if (selectGrifero && Array.isArray(state.personal)) {
      const valPrevio = selectGrifero.value;
      selectGrifero.innerHTML = '';
      state.personal.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        selectGrifero.appendChild(opt);
      });
      if (valPrevio) selectGrifero.value = valPrevio;
    }
  }

  function alCambiarCliente(sel) {
    const customInput = document.getElementById('input-cliente-custom');
    if (!customInput) return;
    if (sel.value === '__NUEVO__') {
      customInput.style.display = 'block';
      customInput.setAttribute('required', 'required');
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      customInput.removeAttribute('required');
      customInput.value = '';
    }
  }

  // 1. DASHBOARD
  function renderizarDashboard(state) {
    const dashDiesel = document.getElementById('dash-diesel-gln');
    if (!dashDiesel) return;
    const m = Store.getMetricas();

    dashDiesel.textContent = `${m.dieselGln.toFixed(2)} Gln`;
    const dSol = document.getElementById('dash-diesel-sol');
    if (dSol) dSol.textContent = `S/ ${m.dieselSoles.toFixed(2)}`;

    const pGln = document.getElementById('dash-premium-gln');
    if (pGln) pGln.textContent = `${m.premiumGln.toFixed(2)} Gln`;
    const pSol = document.getElementById('dash-premium-sol');
    if (pSol) pSol.textContent = `S/ ${m.premiumSoles.toFixed(2)}`;

    const rGln = document.getElementById('dash-regular-gln');
    if (rGln) rGln.textContent = `${m.regularGln.toFixed(2)} Gln`;
    const rSol = document.getElementById('dash-regular-sol');
    if (rSol) rSol.textContent = `S/ ${m.regularSoles.toFixed(2)}`;

    const tSol = document.getElementById('dash-total-sol');
    if (tSol) tSol.textContent = `S/ ${m.totalSoles.toFixed(2)}`;
    const tGln = document.getElementById('dash-total-gln');
    if (tGln) tGln.textContent = `${m.totalGln.toFixed(2)} Gln despachados`;

    const pcSol = document.getElementById('dash-porcobrar-sol');
    if (pcSol) pcSol.textContent = `S/ ${m.pendienteSoles.toFixed(2)}`;
    const pcCount = document.getElementById('dash-porcobrar-count');
    if (pcCount) pcCount.textContent = `${m.cantPendientes} vales pendientes`;

    const anulEl = document.getElementById('dash-anulados-count');
    if (anulEl) anulEl.textContent = m.anulados;

    // Resumen por Griferos / Personal de Turno
    const tbodyGriferos = document.getElementById('tbody-griferos-resumen');
    if (tbodyGriferos) {
      tbodyGriferos.innerHTML = '';
      const listaPersonal = m.rankingPersonal || [];
      if (listaPersonal.length === 0) {
        tbodyGriferos.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:18px; color:#94a3b8;">Sin despachos registrados</td></tr>';
      } else {
        listaPersonal.forEach((p, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${idx + 1}. ${escapeHtml(p.personal)}</strong></td>
            <td class="num-cell">${p.vales}</td>
            <td class="num-cell">${p.galones.toFixed(2)} Gln</td>
            <td class="num-cell" style="font-weight:700; color:var(--brand-800);">S/ ${p.soles.toFixed(2)}</td>
          `;
          tbodyGriferos.appendChild(tr);
        });
      }
    }

    // Top Clientes
    const tbodyTop = document.getElementById('tbody-top-clientes');
    if (tbodyTop) {
      tbodyTop.innerHTML = '';
      const topClientes = m.rankingClientes.slice(0, 8);
      if (topClientes.length === 0) {
        tbodyTop.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:18px; color:#94a3b8;">Sin consumos registrados</td></tr>';
      } else {
        topClientes.forEach((c, idx) => {
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

  // 2. TABLA DE VALES
  function renderizarTablaVales(state) {
    const tbody = document.getElementById('tbody-vales');
    if (!tbody) return;

    let vales = [...state.vales];
    const prodEl = document.getElementById('filtro-producto');
    const estEl = document.getElementById('filtro-estado');
    const searchEl = document.getElementById('search-input');
    const filtroProd = prodEl ? prodEl.value : '';
    const filtroEst = estEl ? estEl.value : '';
    const q = normalizarBusqueda(searchEl ? searchEl.value : '');

    tbody.innerHTML = '';

    if (vales.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="15" style="text-align:center; padding: 45px 20px; color:#64748b;">
            <h4 style="font-size:1.05rem; color:#1e293b; margin-bottom:6px;">No hay vales registrados</h4>
            <p style="font-size:0.84rem; max-width:420px; margin:0 auto;">Utilice el formulario superior o haga clic en "Subir Excel" para cargar sus vales desde una hoja de cálculo.</p>
          </td>
        </tr>
      `;
      const badge = document.getElementById('badge-vales-count');
      if (badge) badge.textContent = "0 Vales";
      const tfoot = document.getElementById('tfoot-vales');
      if (tfoot) tfoot.style.display = 'none';
      return;
    }

    // Filtrar
    vales = vales.filter(v => {
      if (filtroProd && v.producto !== filtroProd) return false;
      if (filtroEst && v.estado !== filtroEst) return false;
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

      const fuelClass = obtenerClaseCombustible(v.producto);

      let badgeClass = 'pill-status--pending';
      let badgeLabel = 'EMITIDO';
      if (v.estado === 'FACTURADO') { badgeClass = 'pill-status--billed'; badgeLabel = 'FACTURADO'; }
      else if (v.estado === 'ANULADO') { badgeClass = 'pill-status--void'; badgeLabel = 'ANULADO'; }

      const telLimpio = normalizarTelefono(v.telefono);
      let waButton = `<span style="color:#94a3b8">-</span>`;
      if (telLimpio) {
        waButton = `
          <button type="button" class="btn btn--whatsapp btn--sm" style="padding:2px 7px; font-size:0.73rem;" onclick="App.abrirModalWhatsApp(${v.id})" title="Enviar WhatsApp a ${escapeHtml(v.telefono)}">
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
        <td><span class="pill-lugar">${escapeHtml(v.lugar || 'Sede Jesús')}</span></td>
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

    const badge = document.getElementById('badge-vales-count');
    if (badge) badge.textContent = `${vales.length} Vales`;
    const tfoot = document.getElementById('tfoot-vales');
    if (tfoot) {
      if (vales.length > 0) {
        tfoot.style.display = 'table-footer-group';
        const footGln = document.getElementById('foot-total-gln');
        const footSol = document.getElementById('foot-total-soles');
        if (footGln) footGln.textContent = `${sumGln.toFixed(2)} Gln`;
        if (footSol) footSol.textContent = `S/ ${sumSoles.toFixed(2)}`;
      } else {
        tfoot.style.display = 'none';
      }
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
    tbody.innerHTML = '';

    let lista = m.rankingClientes;

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
          <div style="font-size:0.72rem; color:#64748b;">Sede: ${escapeHtml(c.lugar || 'Sede Jesús')}</div>
        </td>
        <td>${c.telefono ? `<span class="pill-status" style="background:#e0f2fe; color:#0369a1;">${escapeHtml(c.telefono)}</span>` : '-'}</td>
        <td class="num-cell"><strong style="color:#d97706;">${c.valesPendientes}</strong> / ${c.valesTotales}</td>
        <td class="num-cell">${c.totalGln.toFixed(2)} Gln</td>
        <td class="num-cell" style="font-weight:800; font-size:0.92rem; color:${c.deudaSoles > 0 ? '#b91c1c' : '#15803d'};">
          S/ ${c.deudaSoles.toFixed(2)}
        </td>
        <td style="text-align:center; white-space:nowrap;">
          ${tel && c.deudaSoles > 0 ? `
            <button type="button" class="btn btn--whatsapp btn--sm" 
              data-cliente="${escapeHtml(c.cliente)}" 
              data-tel="${escapeHtml(tel)}" 
              data-deuda="${c.deudaSoles}" 
              data-vales="${c.valesPendientes}"
              onclick="App.enviarCobranzaCliente(this.getAttribute('data-cliente'), this.getAttribute('data-tel'), Number(this.getAttribute('data-deuda')), Number(this.getAttribute('data-vales')))">
              Cobrar por WhatsApp
            </button>
          ` : '<span style="color:#94a3b8; font-size:0.75rem;">Sin deuda</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 4. CONTROL DE TANQUES CON NIVELES DE ALERTA DE LA HOJA
  function renderizarTanques(state) {
    const container = document.getElementById('tanques-container');
    if (!container) return;

    container.innerHTML = '';
    let totalCapacidad = 0;
    let totalStock = 0;

    Object.entries(state.tanques).forEach(([combustible, t]) => {
      totalCapacidad += t.capacidad;
      totalStock += t.stock;

      const pct = Math.min(100, Math.round((t.stock / t.capacidad) * 100));

      // Niveles de alerta: Alerta naranja a 500 Gln, Alerta roja a 250 Gln
      let alertaBadge = '<span class="pill-status" style="background:#dcfce7; color:#15803d;">Nivel Normal</span>';
      let colorBar = '#059669';

      if (t.stock <= t.alerta_roja) {
        alertaBadge = '<span class="pill-status" style="background:#fee2e2; color:#b91c1c; font-weight:800;">ALERTA ROJA (≤250 Gln)</span>';
        colorBar = '#dc2626';
      } else if (t.stock <= t.alerta_naranja) {
        alertaBadge = '<span class="pill-status" style="background:#fef3c7; color:#b45309; font-weight:800;">ALERTA NARANJA (≤500 Gln)</span>';
        colorBar = '#d97706';
      }

      const div = document.createElement('div');
      div.className = 'kpi-box';
      div.innerHTML = `
        <div class="kpi-box__head">
          <span style="font-size:0.9rem; font-weight:800; color:var(--slate-900);">${escapeHtml(combustible)}</span>
          ${alertaBadge}
        </div>
        <div style="font-size:1.6rem; font-weight:800; font-family:'JetBrains Mono'; color:var(--slate-900); margin:4px 0;">
          ${t.stock.toLocaleString()} <span style="font-size:0.85rem; color:#64748b; font-weight:600;">/ ${t.capacidad.toLocaleString()} Gln</span>
        </div>
        <div style="height:14px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin:8px 0;">
          <div style="width:${pct}%; height:100%; background:${colorBar}; transition:width 0.6s ease;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.76rem; color:#64748b;">
          <span>Porcentaje: <strong>${pct}%</strong></span>
          <span>Alertas: <strong>500 Naranja / 250 Rojo</strong></span>
        </div>
        <button type="button" class="btn btn--outline btn--sm" style="margin-top:12px; width:100%;" 
          data-combustible="${escapeHtml(combustible)}"
          onclick="App.abrirModalModificarTanque(this.getAttribute('data-combustible'))">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:13px; height:13px; display:inline-block; vertical-align:middle; margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          Modificar Galones (Varillaje)
        </button>
      `;
      container.appendChild(div);
    });

    // Tarjeta de capacidad total acumulada (6000 Gln)
    const resumenDiv = document.createElement('div');
    resumenDiv.className = 'kpi-box';
    resumenDiv.style.borderColor = 'var(--brand-accent)';
    const pctTotal = Math.round((totalStock / totalCapacidad) * 100);

    resumenDiv.innerHTML = `
      <div class="kpi-box__head">
        <span style="font-size:0.9rem; font-weight:800; color:var(--brand-800);">TOTAL CAPACIDAD TANQUES</span>
        <span class="pill-status pill-status--billed">${pctTotal}% Lleno</span>
      </div>
      <div style="font-size:1.6rem; font-weight:800; font-family:'JetBrains Mono'; color:var(--brand-accent); margin:4px 0;">
        ${totalStock.toLocaleString()} <span style="font-size:0.85rem; color:#64748b; font-weight:600;">/ ${totalCapacidad.toLocaleString()} Gln Total</span>
      </div>
      <div style="height:14px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin:8px 0;">
        <div style="width:${pctTotal}%; height:100%; background:var(--brand-accent); transition:width 0.6s ease;"></div>
      </div>
      <div style="font-size:0.76rem; color:#64748b; margin-bottom:10px;">
        Capacidad sumada de tanques: <strong>Diesel (3,000) + Premium (1,500) + Regular (1,500) = 6,000 GL.</strong>
      </div>
      <button type="button" class="btn btn--accent btn--sm" style="width:100%;" onclick="App.abrirModalModificarTanque()">
        Ajustar Cualquier Tanque
      </button>
    `;
    container.appendChild(resumenDiv);
  }

  // 5. PANEL DE REGISTRO DIARIO DE COMBUSTIBLE (DÍA, FECHA, AÑO, CANTIDAD Y TIPO)
  function renderizarMovimientosDiarios(state) {
    const tbody = document.getElementById('tbody-movimientos-diarios');
    if (!tbody) return;

    const filtroTipo = document.getElementById('filtro-mov-tipo') ? document.getElementById('filtro-mov-tipo').value : '';
    let movs = Array.isArray(state.movimientos_tanque) ? [...state.movimientos_tanque] : [];

    tbody.innerHTML = '';

    if (filtroTipo) {
      movs = movs.filter(m => m.tipo === filtroTipo);
    }

    if (movs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:35px 20px; color:#64748b;">
            <div style="font-weight:700; color:#1e293b; margin-bottom:4px;">No hay movimientos registrados en el panel</div>
            <div style="font-size:0.82rem;">Al despachar vales o modificar la cantidad de galones en tanques, los movimientos se registrarán automáticamente aquí con su día, fecha y año.</div>
          </td>
        </tr>
      `;
      return;
    }

    movs.forEach((m, idx) => {
      const fuelClass = obtenerClaseCombustible(m.tipo);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:#64748b; font-size:0.75rem;">${idx + 1}</td>
        <td><strong style="color:var(--slate-800);">${escapeHtml(m.dia || '-')}</strong></td>
        <td><span style="font-family:'JetBrains Mono'; font-weight:700; font-size:0.86rem; color:var(--brand-800);">${escapeHtml(m.fecha || '-')}</span></td>
        <td><span style="font-family:'JetBrains Mono'; font-size:0.84rem; color:var(--slate-600);">${escapeHtml(String(m.anio || '2026'))}</span></td>
        <td><span class="pill-fuel ${fuelClass}">${escapeHtml(m.tipo)}</span></td>
        <td class="num-cell" style="font-weight:800; color:var(--brand-accent); font-size:0.92rem;">
          ${Number(m.cantidad || 0).toFixed(2)} Gln
        </td>
        <td>${escapeHtml(m.operacion || 'Ajuste de Combustible')}</td>
        <td>${escapeHtml(m.cliente || '-')}</td>
        <td class="num-cell" style="font-weight:700; color:var(--slate-900);">
          ${m.stock_resultante !== undefined ? Number(m.stock_resultante).toFixed(2) + ' Gln' : '-'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 6. GESTIÓN DEL MODAL DE MODIFICACIÓN DE TANQUES (VARILLAJE)
  function abrirModalModificarTanque(tipoCombustible) {
    const modal = document.getElementById('modal-ajuste-tanque');
    if (!modal) {
      window.location.href = 'tanques.html';
      return;
    }

    const selectTipo = document.getElementById('ajuste-tipo-combustible');
    if (tipoCombustible && selectTipo) {
      selectTipo.value = tipoCombustible;
    }

    const fEl = document.getElementById('ajuste-fecha');
    if (fEl) fEl.value = obtenerFechaHoyISO();
    const dEl = document.getElementById('ajuste-detalle');
    if (dEl) dEl.value = '';

    actualizarInfoTanqueEnModal();
    modal.classList.add('active');
  }

  function cerrarModalModificarTanque() {
    const modal = document.getElementById('modal-ajuste-tanque');
    if (modal) modal.classList.remove('active');
  }

  function actualizarInfoTanqueEnModal() {
    const state = Store.getState();
    const tipoEl = document.getElementById('ajuste-tipo-combustible');
    if (!tipoEl) return;
    const tipo = tipoEl.value;
    const t = state.tanques[tipo];
    if (t) {
      const actEl = document.getElementById('ajuste-stock-actual');
      if (actEl) actEl.textContent = `${Number(t.stock).toFixed(2)} Gln`;
      const maxEl = document.getElementById('ajuste-capacidad-max');
      if (maxEl) maxEl.textContent = `${Number(t.capacidad).toLocaleString()} Gln`;
      const numEl = document.getElementById('ajuste-nueva-cantidad');
      if (numEl) numEl.value = Number(t.stock).toFixed(2);
    }
  }

  async function guardarAjusteTanque(e) {
    e.preventDefault();
    const tipo = document.getElementById('ajuste-tipo-combustible').value;
    const nuevaCantidad = parseFloat(document.getElementById('ajuste-nueva-cantidad').value);
    const fecha = document.getElementById('ajuste-fecha').value;
    const motivoBase = document.getElementById('ajuste-motivo').value;
    const detalle = document.getElementById('ajuste-detalle').value.trim();

    if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
      alert("Por favor ingrese una cantidad válida en galones.");
      return;
    }

    // Verificación de Seguridad con PIN
    const autorizado = await solicitarPinAdmin(`Ajuste de Varillaje / Stock en Tanque (${tipo})`);
    if (!autorizado) return;

    const state = Store.getState();
    const t = state.tanques[tipo];
    if (t && nuevaCantidad > t.capacidad) {
      if (!confirm(`La cantidad ingresada (${nuevaCantidad} Gln) supera la capacidad máxima del tanque (${t.capacidad} Gln). ¿Desea continuar de todos modos?`)) {
        return;
      }
    }

    const motivoCompleto = detalle ? `${motivoBase} - ${detalle}` : motivoBase;

    await Store.modificarStockTanque(tipo, nuevaCantidad, motivoCompleto, fecha);
    cerrarModalModificarTanque();
    mostrarToast(`Stock de ${tipo} actualizado a ${nuevaCantidad.toFixed(2)} Gln`);
    cambiarPestana('tanques');
  }

  function exportarMovimientosExcel() {
    const state = Store.getState();
    const movs = state.movimientos_tanque;
    if (!movs || movs.length === 0) {
      alert("No hay registros en el panel diario para exportar.");
      return;
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const filename = `Registro_Diario_Combustible_${fechaHoy}.xlsx`;

    const filas = movs.map((m, i) => ({
      "ITEM": i + 1,
      "DÍA": m.dia || "",
      "FECHA (DD/MM)": m.fecha || "",
      "AÑO": m.anio || 2026,
      "TIPO DE COMBUSTIBLE": m.tipo || "",
      "CANTIDAD (GLN)": Number(m.cantidad || 0).toFixed(2),
      "OPERACIÓN / DETALLE": m.operacion || "",
      "CLIENTE / REFERENCIA": m.cliente || "",
      "STOCK RESULTANTE (GLN)": m.stock_resultante !== undefined ? Number(m.stock_resultante).toFixed(2) : ""
    }));

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Panel_Diario");
      ws['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 8 },
        { wch: 20 }, { wch: 16 }, { wch: 32 }, { wch: 25 }, { wch: 22 }
      ];
      XLSX.writeFile(wb, filename);
    } else {
      Exporter.exportarCSV(filas, filename.replace('.xlsx', '.csv'));
    }
  }

  function actualizarCamposConfiguracion(state) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('cfg-empresa', state.empresa);
    set('cfg-ruc', state.ruc);
    set('cfg-direccion', state.direccion);
    set('cfg-telefono', state.telefono);
    if (state.precios) {
      set('cfg-p-diesel', state.precios["DIESEL B5-S50"]);
      set('cfg-p-premium', state.precios["GASOHOL PREMIUM"]);
      set('cfg-p-regular', state.precios["GASOHOL REGULAR"]);
    }
  }

  // 5. IMPORTADOR DE EXCEL CON VISUALIZADOR COMPLETO
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
    const modal = document.getElementById('modal-importar-excel');
    if (!modal) {
      window.location.href = 'importar.html';
      return;
    }
    valesParaImportar = [];
    const statusBox = document.getElementById('import-status-box');
    if (statusBox) statusBox.style.display = 'none';
    const previewWrap = document.getElementById('import-preview-wrapper');
    if (previewWrap) previewWrap.style.display = 'none';
    const btnConfirmar = document.getElementById('btn-confirmar-importar');
    if (btnConfirmar) btnConfirmar.disabled = true;
    const input = document.getElementById('input-archivo-excel');
    if (input) input.value = '';
    modal.classList.add('active');
  }

  function cerrarModalImportarExcel() {
    const modal = document.getElementById('modal-importar-excel');
    if (modal) modal.classList.remove('active');
  }

  function procesarArchivoSubido(file) {
    const statusBox = document.getElementById('import-status-box');
    const previewWrap = document.getElementById('import-preview-wrapper');
    const previewBody = document.getElementById('import-preview-body');
    const btnConfirmar = document.getElementById('btn-confirmar-importar');

    statusBox.style.display = 'block';
    statusBox.innerHTML = '<div style="color:#64748b;">Leyendo y analizando archivo Excel...</div>';
    previewWrap.style.display = 'none';
    btnConfirmar.disabled = true;

    Exporter.procesarArchivoExcel(file, (res) => {
      if (!res.ok) {
        statusBox.innerHTML = `<div style="color:#b91c1c; font-weight:700;">Error: ${escapeHtml(res.error)}</div>`;
        return;
      }

      valesParaImportar = res.valesValidos;

      if (valesParaImportar.length === 0) {
        statusBox.innerHTML = '<div style="color:#b91c1c; font-weight:700;">No se encontraron filas con N° de Vale válido en el archivo.</div>';
        return;
      }

      btnConfirmar.disabled = false;
      statusBox.innerHTML = `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:6px; color:#15803d; font-size:0.85rem;">
          <strong>Archivo procesado con éxito:</strong>
          <div>Se extrajeron <strong>${valesParaImportar.length} vales</strong> correctamente estructurados.</div>
          ${res.errores.length > 0 ? `<div style="color:#d97706; margin-top:4px;">Aviso: ${res.errores.length} filas incompletas fueron omitidas.</div>` : ''}
        </div>
      `;

      // Renderizar tabla de previsualización completa
      previewBody.innerHTML = '';
      valesParaImportar.forEach((v, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${formatearFecha(v.fecha)}</td>
          <td><strong>#${v.n_vale}</strong></td>
          <td><strong>${escapeHtml(v.cliente)}</strong></td>
          <td>${escapeHtml(v.lugar)}</td>
          <td>${escapeHtml(v.placa)}</td>
          <td>${escapeHtml(v.producto)}</td>
          <td class="num-cell">${Number(v.cantidad).toFixed(2)} Gln</td>
          <td class="num-cell">S/ ${Number(v.total).toFixed(2)}</td>
          <td>${escapeHtml(v.grifero)}</td>
          <td><span class="pill-status pill-status--${v.estado === 'FACTURADO' ? 'billed' : (v.estado === 'ANULADO' ? 'void' : 'pending')}">${v.estado}</span></td>
        `;
        previewBody.appendChild(tr);
      });

      previewWrap.style.display = 'block';
    });
  }

  async function ejecutarImportacion() {
    if (valesParaImportar.length === 0) return;
    const btn = document.getElementById('btn-confirmar-importar');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Guardando en Base de Datos...';
    }
    const modoReemplazar = document.getElementById('check-reemplazar-import').checked;

    const totalInsertados = await Store.importarValesMasivos(valesParaImportar, modoReemplazar);
    cerrarModalImportarExcel();
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirmar e Importar Datos';
    }
    mostrarToast(`Se importaron y guardaron ${totalInsertados} registros en la base de datos.`);
    cambiarPestana('vales');
  }

  // 6. FORMULARIO DE VALES
  function inicializarFormularioVale() {
    const fechaEl = document.getElementById('input-fecha');
    if (!fechaEl) return;
    fechaEl.value = obtenerFechaHoyISO();
    actualizarPrecioSegunCombustible();
    const nValeInput = document.getElementById('input-nvale');
    const editIdEl = document.getElementById('edit-id');
    const editId = editIdEl ? editIdEl.value : '';
    if (nValeInput && !editId) {
      nValeInput.value = Store.getSiguienteVale();
    }
  }

  function actualizarPrecioSegunCombustible() {
    const prodEl = document.getElementById('input-producto');
    if (!prodEl) return;
    const state = Store.getState();
    const prod = prodEl.value;
    const precioInput = document.getElementById('input-precio');
    if (precioInput && state.precios && state.precios[prod] !== undefined) {
      precioInput.value = Number(state.precios[prod]).toFixed(2);
    }
    calcularTotalEnVivo();
  }

  function calcularTotalEnVivo() {
    const totalEl = document.getElementById('input-total');
    if (!totalEl) return;
    const cantEl = document.getElementById('input-cantidad');
    const precEl = document.getElementById('input-precio');
    const cant = parseFloat(cantEl ? cantEl.value : 0) || 0;
    const prec = parseFloat(precEl ? precEl.value : 0) || 0;
    const total = Math.round(cant * prec * 100) / 100;
    totalEl.value = `S/ ${total.toFixed(2)}`;
  }

  function gestionarEstadoAnulado() {
    const estEl = document.getElementById('input-estado');
    if (!estEl) return;
    const est = estEl.value;
    const cInput = document.getElementById('input-cliente');
    const pInput = document.getElementById('input-placa');
    if (cInput && pInput) {
      if (est === 'ANULADO') {
        cInput.removeAttribute('required');
        pInput.removeAttribute('required');
      } else {
        cInput.setAttribute('required', 'required');
        pInput.setAttribute('required', 'required');
      }
    }
  }

  async function guardarVale(e) {
    e.preventDefault();

    const editIdEl = document.getElementById('edit-id');
    const editId = editIdEl ? editIdEl.value : '';
    const fecha = document.getElementById('input-fecha') ? document.getElementById('input-fecha').value : '';
    const nValeEl = document.getElementById('input-nvale');
    const n_vale = nValeEl ? parseInt(nValeEl.value, 10) : 0;
    const turno = document.getElementById('input-turno') ? document.getElementById('input-turno').value : 'T1 (Mañana)';
    let cliente = document.getElementById('input-cliente') ? document.getElementById('input-cliente').value.trim() : '';
    if (cliente === '__NUEVO__') {
      const customEl = document.getElementById('input-cliente-custom');
      cliente = customEl ? customEl.value.trim() : "";
    }
    if (!cliente) cliente = "-";

    const lugar = "jesus_de_lauricocha_huanuco";
    const telefono = document.getElementById('input-telefono') ? document.getElementById('input-telefono').value.trim() : '';
    const placa = document.getElementById('input-placa') ? (document.getElementById('input-placa').value.trim().toUpperCase() || "-") : "-";
    const conductor = document.getElementById('input-conductor') ? (document.getElementById('input-conductor').value.trim() || "-") : "-";
    const producto = document.getElementById('input-producto') ? document.getElementById('input-producto').value : 'DIESEL B5-S50';
    const cantidad = document.getElementById('input-cantidad') ? (parseFloat(document.getElementById('input-cantidad').value) || 0) : 0;
    const precio = document.getElementById('input-precio') ? (parseFloat(document.getElementById('input-precio').value) || 0) : 0;
    const total = Math.round(cantidad * precio * 100) / 100;
    const grifero = document.getElementById('input-grifero') ? (document.getElementById('input-grifero').value.trim() || "YANET") : "YANET";
    const estado = document.getElementById('input-estado') ? document.getElementById('input-estado').value : 'PENDIENTE';
    const observacion = document.getElementById('input-obs') ? document.getElementById('input-obs').value.trim() : '';
    const autoWA = document.getElementById('check-auto-wa') ? document.getElementById('check-auto-wa').checked : false;

    // Validación Estricta de Campos (Seguridad y Consistencia)
    if (isNaN(n_vale) || n_vale <= 0 || n_vale > 99999999) {
      alert("Por favor ingrese un N° de Vale válido (número entero positivo).");
      if (nValeEl) nValeEl.focus();
      return;
    }

    if (cantidad <= 0 || cantidad > 20000) {
      alert("La cantidad debe ser mayor a 0 y menor a 20,000 galones.");
      if (document.getElementById('input-cantidad')) document.getElementById('input-cantidad').focus();
      return;
    }

    if (precio <= 0 || precio > 500) {
      alert("El precio unitario debe ser mayor a 0 y menor a S/ 500.");
      if (document.getElementById('input-precio')) document.getElementById('input-precio').focus();
      return;
    }

    const state = Store.getState();
    const existeDuplicado = state.vales.some(v => Number(v.n_vale) === n_vale && String(v.id) !== String(editId));
    if (existeDuplicado) {
      alert(`El N° de Vale #${n_vale} ya se encuentra registrado.`);
      if (nValeEl) nValeEl.focus();
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
      mostrarToast(`Vale #${n_vale} registrado con éxito`);
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
    const v = state.vales.find(item => Number(item.id) === Number(id));
    if (!v) return;

    // Si estamos en una página sin formulario de edición (ej. Dashboard o Cobranza), redirigir
    const editIdEl = document.getElementById('edit-id');
    if (!editIdEl) {
      window.location.href = `vales.html?edit=${id}`;
      return;
    }

    editIdEl.value = v.id;
    const titleEl = document.getElementById('form-vale-title');
    if (titleEl) titleEl.textContent = `Modificando Vale N° ${v.n_vale}`;
    const btnGuardar = document.getElementById('btn-guardar-vale');
    if (btnGuardar) btnGuardar.textContent = "Guardar Cambios";

    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
    setVal('input-fecha', v.fecha);
    setVal('input-nvale', v.n_vale);
    setVal('input-turno', v.turno);
    
    const selCli = document.getElementById('input-cliente');
    const custom = document.getElementById('input-cliente-custom');
    if (selCli) {
      if (state.clientes.includes(v.cliente)) {
        selCli.value = v.cliente;
        if (custom) custom.style.display = 'none';
      } else {
        selCli.value = '__NUEVO__';
        if (custom) {
          custom.style.display = 'block';
          custom.value = v.cliente === '-' ? '' : v.cliente;
        }
      }
    }

    setVal('input-lugar', "jesus_de_lauricocha_huanuco");
    setVal('input-telefono', v.telefono || "");
    setVal('input-placa', v.placa === '-' ? '' : v.placa);
    setVal('input-conductor', v.conductor === '-' ? '' : v.conductor);
    setVal('input-producto', v.producto);
    setVal('input-cantidad', v.cantidad);
    setVal('input-precio', v.precio);
    setVal('input-total', `S/ ${Number(v.total).toFixed(2)}`);
    setVal('input-grifero', v.grifero);
    setVal('input-estado', v.estado);
    setVal('input-obs', v.observacion || "");

    gestionarEstadoAnulado();
    cambiarPestana('vales');
    const formPanel = document.getElementById('form-vale-panel');
    if (formPanel) {
      formPanel.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function limpiarFormulario() {
    const editIdEl = document.getElementById('edit-id');
    if (!editIdEl) return;
    editIdEl.value = "";
    const titleEl = document.getElementById('form-vale-title');
    if (titleEl) titleEl.textContent = "Registrar Nuevo Vale de Combustible";
    const btnGuardar = document.getElementById('btn-guardar-vale');
    if (btnGuardar) btnGuardar.textContent = "Guardar Vale";
    
    const selCli = document.getElementById('input-cliente');
    if (selCli) selCli.value = "";
    const custom = document.getElementById('input-cliente-custom');
    if (custom) {
      custom.style.display = 'none';
      custom.value = "";
      custom.removeAttribute('required');
    }

    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
    setVal('input-lugar', "jesus_de_lauricocha_huanuco");
    setVal('input-telefono', "");
    setVal('input-placa', "");
    setVal('input-conductor', "");
    setVal('input-cantidad', "");
    setVal('input-total', "S/ 0.00");
    setVal('input-obs', "");
    setVal('input-estado', "PENDIENTE");
    gestionarEstadoAnulado();
    inicializarFormularioVale();
  }

  // Verificación de PIN Administrativo
  async function solicitarPinAdmin(accionNombre) {
    const pin = prompt(`[SEGURIDAD] Ingrese PIN de Administrador para:\n${accionNombre}\n(PIN por defecto: 1234)`, "");
    if (!pin) return false;
    const valido = await Store.verificarPinAdmin(pin.trim());
    if (!valido) {
      alert("PIN de Administrador incorrecto. Operación cancelada.");
      return false;
    }
    return true;
  }

  async function cambiarPinSeguridad() {
    const actual = prompt("Ingrese su PIN actual:", "");
    if (!actual) return;
    const nuevo = prompt("Ingrese nuevo PIN (mínimo 4 dígitos):", "");
    if (!nuevo) return;
    try {
      await Store.cambiarPinAdmin(actual, nuevo);
      mostrarToast("PIN de Administrador actualizado con éxito.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function anularVale(id) {
    const state = Store.getState();
    const v = state.vales.find(item => String(item.id) === String(id));
    if (!v) return;

    const motivo = prompt(`Motivo de anulación para el Vale #${v.n_vale}:`, "Error de despacho / Vale roto");
    if (motivo !== null) {
      await Store.anularVale(id, motivo);
      mostrarToast(`Vale #${v.n_vale} anulado`);
    }
  }

  async function eliminarVale(id) {
    const state = Store.getState();
    const v = state.vales.find(item => String(item.id) === String(id));
    if (!v) return;

    const autorizado = await solicitarPinAdmin(`Eliminar definitivamente el Vale #${v.n_vale}`);
    if (!autorizado) return;

    if (confirm(`¿Confirma eliminar definitivamente el Vale #${v.n_vale}? Esta acción no se puede deshacer.`)) {
      await Store.eliminarVale(id);
      mostrarToast("Vale eliminado");
    }
  }

  // 7. WHATSAPP
  function normalizarTelefono(t) {
    if (!t) return "";
    let clean = String(t).replace(/[^0-9]/g, '');
    if (clean.length === 9) clean = "51" + clean;
    return (clean.length >= 8 && clean.length <= 15) ? clean : "";
  }

  function generarMensajeDespacho(v) {
    const state = Store.getState();
    return (
      `*${state.empresa} - CONSTANCIA DE VALE*\n\n` +
      `Estimado(a) *${v.cliente}* (Sede: ${v.lugar || 'Sede Jesús'}), confirmamos el despacho registrado:\n\n` +
      `*Vale:* #${v.n_vale}\n` +
      `*Fecha:* ${formatearFecha(v.fecha)} (${v.turno})\n` +
      `*Vehículo / Placa:* ${v.placa}\n` +
      `*Conductor:* ${v.conductor}\n` +
      `*Combustible:* ${v.producto}\n` +
      `*Cantidad:* ${Number(v.cantidad).toFixed(2)} Galones\n` +
      `*Precio Unitario:* S/ ${Number(v.precio).toFixed(2)}\n` +
      `*Total a Pagar:* S/ ${Number(v.total).toFixed(2)}\n` +
      `*Personal Despachador:* ${v.grifero}\n` +
      `*Estado:* ${v.estado}\n\n` +
      `Agradecemos su preferencia.`
    );
  }

  function abrirModalWhatsApp(id) {
    const state = Store.getState();
    const v = state.vales.find(item => String(item.id) === String(id));
    if (!v) return;

    const tel = normalizarTelefono(v.telefono);
    if (!tel) {
      alert("Este vale no cuenta con un número de teléfono válido.");
      return;
    }

    valeSeleccionadoWA = v;
    document.getElementById('modal-wa-dest').value = `${v.telefono} (${v.cliente} - ${v.lugar || 'Sede Jesús'})`;
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
        `Estimado(a) *${v.cliente}* (${v.lugar || 'Sede Jesús'}),\n` +
        `Le recordamos que mantiene pendiente de liquidación el Vale N° #${v.n_vale} por un importe de *S/ ${Number(v.total).toFixed(2)}* ` +
        `(${v.cantidad} Gln de ${v.producto}, Placa: ${v.placa}).\n\n` +
        `Agradeceremos coordinar la cancelación correspondiente. Saludos cordiales.`
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
      `por un importe total acumulado de *S/ ${Number(totalDeuda).toFixed(2)}*.\n\n` +
      `Agradeceremos coordinar la liquidación. Saludos cordiales.`
    );
    abrirEnlaceWASeguro(tel, msg);
  }

  function abrirEnlaceWASeguro(tel, msg) {
    const url = `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function cerrarModalWA() {
    document.getElementById('modal-wa').classList.remove('active');
    valeSeleccionadoWA = null;
  }

  // 8. CONFIGURACIÓN
  async function guardarConfiguracionEmpresa(e) {
    e.preventDefault();
    const autorizado = await solicitarPinAdmin("Modificar Configuración y Tarifas");
    if (!autorizado) return;

    const emp = document.getElementById('cfg-empresa').value.trim();
    const ruc = document.getElementById('cfg-ruc').value.trim();
    const tel = document.getElementById('cfg-telefono').value.trim();
    const dir = "jesus_de_lauricocha_huanuco";
    const precios = {
      "DIESEL B5-S50": parseFloat(document.getElementById('cfg-p-diesel').value) || 16.80,
      "GASOHOL PREMIUM": parseFloat(document.getElementById('cfg-p-premium').value) || 19.50,
      "GASOHOL REGULAR": parseFloat(document.getElementById('cfg-p-regular').value) || 17.20
    };
    await Store.actualizarConfiguracion(emp, ruc, dir, precios, tel);
    actualizarPrecioSegunCombustible();
    mostrarToast("Tarifas oficiales guardadas");
  }

  async function cargarDemostracion() {
    const autorizado = await solicitarPinAdmin("Restaurar Datos Oficiales");
    if (!autorizado) return;
    if (confirm("¿Desea restaurar los datos con los tanques, clientes y personal oficiales?")) {
      await Store.init();
      mostrarToast("Datos restaurados correctamente");
      cambiarPestana('vales');
    }
  }

  async function limpiarTodo() {
    const autorizado = await solicitarPinAdmin("VACIAR Y LIMPIAR BASE DE DATOS");
    if (!autorizado) return;

    if (confirm("¿Confirma vaciar definitivamente todos los registros de vales de la base de datos?")) {
      await Store.limpiarBaseDatos();
      mostrarToast("Base de datos limpia y vaciada");
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
    const msgEl = document.getElementById('toast-msg');
    if (msgEl) msgEl.textContent = msg;
    if (t) {
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }
  }

  return {
    init,
    cambiarPestana,
    ordenarPor,
    alCambiarCliente,
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
    renderizarMovimientosDiarios,
    abrirModalModificarTanque,
    cerrarModalModificarTanque,
    actualizarInfoTanqueEnModal,
    guardarAjusteTanque,
    exportarMovimientosExcel,
    filtrarValesDebounce,
    renderizarTablaVales,
    guardarConfiguracionEmpresa,
    cargarDemostracion,
    limpiarTodo,
    cambiarPinSeguridad
  };
})();
