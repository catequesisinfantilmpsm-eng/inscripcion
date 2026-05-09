// ============================================================
//  modules/admin.js
//  Panel administrativo: tabla, filtros, edición, exportación
// ============================================================

var _todosRegistros = [];
var _registrosFiltrados = [];

// ── Cargar todos los registros ────────────────────────────────
async function cargarAdmin() {
  showLoader('Cargando registros…');
  var resp = await API.get('todos');
  hideLoader();

  if (!resp.ok) { toast('Error al cargar: ' + resp.msg, 'err'); return; }

  _todosRegistros     = resp.datos || [];
  AppState.registros  = _todosRegistros;
  _registrosFiltrados = _todosRegistros;

  actualizarStatsAdmin();
  poblarFiltros();
  renderTabla(_todosRegistros);
  toast('✓ ' + _todosRegistros.length + ' registros cargados', 'ok');
}

// ── Stats admin ───────────────────────────────────────────────
function actualizarStatsAdmin() {
  var data = _todosRegistros;
  document.getElementById('as-total').textContent      = data.length;
  document.getElementById('as-pagados').textContent    = data.filter(r => r.pago === 'Pagado').length;
  document.getElementById('as-pendientes').textContent = data.filter(r => r.pago === 'Pendiente').length;
  document.getElementById('as-grupos').textContent     = [...new Set(data.map(r => r.codigoGrupo).filter(Boolean))].length;

  // Actualizar stats de inicio también
  document.getElementById('statTotal').textContent      = data.length;
  document.getElementById('statPagados').textContent    = data.filter(r => r.pago === 'Pagado').length;
  document.getElementById('statPendientes').textContent = data.filter(r => r.pago === 'Pendiente').length;
  document.getElementById('statGrupos').textContent     = [...new Set(data.map(r => r.codigoGrupo).filter(Boolean))].length;
}

// ── Poblar filtros con valores únicos ─────────────────────────
function poblarFiltros() {
  var grupos  = [...new Set(_todosRegistros.map(r => r.codigoGrupo).filter(Boolean))].sort();
  var selG    = document.getElementById('filtroGrupo');
  // Limpiar y repoblar
  while (selG.options.length > 1) selG.remove(1);
  grupos.forEach(g => { var o=document.createElement('option'); o.value=g; o.textContent=g; selG.appendChild(o); });
}

// ── Filtrar tabla ─────────────────────────────────────────────
function filtrarAdmin() {
  var busq   = document.getElementById('adminSearch').value.toLowerCase().trim();
  var grupo  = document.getElementById('filtroGrupo').value;
  var curso  = document.getElementById('filtroCurso').value;
  var pago   = document.getElementById('filtroPago').value;

  _registrosFiltrados = _todosRegistros.filter(r => {
    var matchBusq  = !busq  || r.nombre.toLowerCase().includes(busq) || r.codigo.toLowerCase().includes(busq) || (r.telefono||'').includes(busq);
    var matchGrupo = !grupo || r.codigoGrupo === grupo;
    var matchCurso = !curso || r.curso === curso;
    var matchPago  = !pago  || r.pago === pago;
    return matchBusq && matchGrupo && matchCurso && matchPago;
  });

  renderTabla(_registrosFiltrados);
}

// ── Renderizar tabla ──────────────────────────────────────────
function renderTabla(data) {
  var tbody = document.getElementById('tbodyAdmin');
  var cont  = document.getElementById('adminConteo');

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--c-text-dim)">Sin resultados</td></tr>';
    cont.textContent = '';
    return;
  }

  tbody.innerHTML = data.map((a, i) => `
    <tr>
      <td>
        ${a.foto
          ? `<img src="${a.foto}" class="avatar-sm" alt="Foto"/>`
          : `<div class="avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:1rem">👤</div>`
        }
      </td>
      <td>
        <div style="font-weight:500">${a.nombre}</div>
        <div style="font-size:.72rem;color:var(--c-text-dim)">${a.codigo}</div>
      </td>
      <td>${a.curso || '—'}</td>
      <td>${a.codigoGrupo || '—'}</td>
      <td style="font-size:.82rem">${a.catequista || '—'}</td>
      <td>
        <span class="badge ${badgePago(a.pago)}">${a.pago || '—'}</span>
      </td>
      <td>
        <div style="display:flex;gap:3px;flex-wrap:wrap">
          ${docBadge('Acta', a.actaNac)}
          ${docBadge('Baut', a.boletaBautizo)}
          ${docBadge('Conf', a.boletaConf)}
        </div>
      </td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" title="Credencial"
            onclick="AppState.alumnoActual=_todosRegistros[${_todosRegistros.indexOf(a)}];abrirCredencial()">🪪</button>
          <button class="btn btn-ghost btn-sm" title="Comprobante"
            onclick="AppState.alumnoActual=_todosRegistros[${_todosRegistros.indexOf(a)}];abrirComprobante()">🧾</button>
          <button class="btn btn-ghost btn-sm" title="Editar"
            onclick="abrirEditar(_todosRegistros[${_todosRegistros.indexOf(a)}])">✏️</button>
        </div>
      </td>
    </tr>
  `).join('');

  cont.textContent = 'Mostrando ' + data.length + ' de ' + _todosRegistros.length + ' registros';
}

function badgePago(pago) {
  if (pago === 'Pagado')   return 'badge-ok';
  if (pago === 'Pendiente') return 'badge-warn';
  if (pago === 'Beca')      return 'badge-dim';
  return 'badge-error';
}

function docBadge(label, val) {
  var cls = val ? 'badge-ok' : 'badge-error';
  return `<span class="badge ${cls}" style="font-size:.6rem">${label}</span>`;
}

// ── Editar registro ───────────────────────────────────────────
function abrirEditar(alumno) {
  AppState.alumnoActual = alumno;
  var html = `
    <div class="form-grid" style="font-size:.85rem">
      ${editField('Nombre',     'edit-nombre',     alumno.nombre)}
      ${editField('Curso',      'edit-curso',      alumno.curso)}
      ${editField('Catequista', 'edit-cat',        alumno.catequista)}
      ${editField('Grupo',      'edit-grupo',      alumno.codigoGrupo)}
      ${editField('Madre',      'edit-madre',      alumno.madre)}
      ${editField('Teléfono',   'edit-tel',        alumno.telefono)}
      ${editSelect('Pago',      'edit-pago',       alumno.pago, ['Pagado','Pendiente','Beca',''])}
      ${editField('Ubicación',  'edit-ubicacion',  alumno.ubicacion)}
    </div>
    <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="cerrarModal('modalEditar')">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarEdicion('${alumno.codigo}')">💾 Guardar</button>
    </div>
  `;
  document.getElementById('editarContenido').innerHTML = html;
  abrirModal('modalEditar');
}

function editField(label, id, val) {
  return `
    <div class="field">
      <label>${label}</label>
      <input type="text" id="${id}" value="${val||''}" class="admin-search" style="border-radius:var(--radius-sm)"/>
    </div>
  `;
}

function editSelect(label, id, val, opts) {
  var options = opts.map(o => `<option value="${o}" ${o===val?'selected':''}>${o||'— Sin definir —'}</option>`).join('');
  return `
    <div class="field">
      <label>${label}</label>
      <select id="${id}" class="admin-search" style="border-radius:var(--radius-sm)">${options}</select>
    </div>
  `;
}

async function guardarEdicion(codigo) {
  function gv(id) { var e=document.getElementById(id); return e ? e.value.trim() : ''; }
  var payload = {
    codigo     : codigo,
    nombre     : gv('edit-nombre'),
    curso      : gv('edit-curso'),
    catequista : gv('edit-cat'),
    codigoGrupo: gv('edit-grupo'),
    madre      : gv('edit-madre'),
    telefono   : gv('edit-tel'),
    pago       : gv('edit-pago'),
    ubicacion  : gv('edit-ubicacion')
  };
  showLoader('Guardando cambios…');
  var resp = await API.post('editarRegistro', payload);
  hideLoader();
  if (resp.ok) {
    toast('✓ Cambios guardados', 'ok');
    cerrarModal('modalEditar');
    cargarAdmin();
  } else {
    toast('Error: ' + resp.msg, 'err');
  }
}

// ── Exportar a PDF estilo tabla ───────────────────────────────
function exportarPDF() {
  var data = _registrosFiltrados.length > 0 ? _registrosFiltrados : _todosRegistros;
  if (data.length === 0) { toast('No hay datos para exportar', 'err'); return; }

  var ciclo = obtenerCicloActual ? obtenerCicloActual() : new Date().getFullYear();
  var hoy   = new Date().toLocaleDateString('es-MX');

  var filas = data.map(a => `
    <tr>
      <td>${a.codigo||''}</td>
      <td>${a.nombre||''}</td>
      <td>${a.curso||''}</td>
      <td>${a.codigoGrupo||''}</td>
      <td>${a.catequista||''}</td>
      <td>${a.madre||''}</td>
      <td>${a.telefono||''}</td>
      <td>${a.edad||''}</td>
      <td>${a.dia||''} ${a.hora||''}</td>
      <td style="color:${a.pago==='Pagado'?'#166534':a.pago==='Pendiente'?'#92400e':'#374151'};font-weight:600">${a.pago||'—'}</td>
    </tr>
  `).join('');

  var ventana = window.open('', '_blank');
  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Listado Catequesis ${ciclo}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:9px;padding:10px;background:#fff;color:#111}
        h1{font-size:13px;margin-bottom:2px}
        p{font-size:8px;color:#666;margin-bottom:8px}
        table{width:100%;border-collapse:collapse}
        th{background:#1a0a2e;color:#f0d070;padding:5px 6px;text-align:left;font-size:8px;white-space:nowrap}
        td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}
        tr:nth-child(even) td{background:#f9f9f9}
        @page{size:letter landscape;margin:10mm}
        @media print{body{padding:0}}
      </style>
    </head>
    <body onload="window.print()">
      <h1>✝ Parroquia — Listado de Catequesis</h1>
      <p>Ciclo ${ciclo} · Generado el ${hoy} · ${data.length} registros</p>
      <table>
        <thead>
          <tr>
            <th>Código</th><th>Nombre</th><th>Curso</th><th>Grupo</th>
            <th>Catequista</th><th>Madre</th><th>Teléfono</th>
            <th>Edad</th><th>Día/Hora</th><th>Pago</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </body>
    </html>
  `);
  ventana.document.close();
}
