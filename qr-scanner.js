// ============================================================
//  modules/qr-scanner.js
//  Escáner QR con html5-qrcode + consulta a hoja DATOS
// ============================================================

var _qrScanner = null;
var _datosQR   = null;

// ── Iniciar escáner ───────────────────────────────────────────
function iniciarQR() {
  document.getElementById('btnIniciarQR').style.display = 'none';
  document.getElementById('btnDetenerQR').style.display = 'block';

  _qrScanner = new Html5Qrcode('qr-reader');

  var config = {
    fps       : 10,
    qrbox     : { width: 250, height: 250 },
    aspectRatio: 1.0
  };

  _qrScanner.start(
    { facingMode: 'environment' },
    config,
    onQRSuccess,
    function() {} // error silencioso (frames sin QR)
  ).catch(function(err) {
    toast('No se pudo acceder a la cámara: ' + err, 'err');
    document.getElementById('btnIniciarQR').style.display = 'block';
    document.getElementById('btnDetenerQR').style.display = 'none';
  });
}

// ── Detener escáner ───────────────────────────────────────────
function detenerQR() {
  if (_qrScanner) {
    _qrScanner.stop().catch(() => {});
    _qrScanner = null;
  }
  document.getElementById('btnIniciarQR').style.display = 'block';
  document.getElementById('btnDetenerQR').style.display = 'none';
}

// ── Callback: QR leído exitosamente ──────────────────────────
async function onQRSuccess(codigo) {
  detenerQR();
  await procesarCodigo(codigo.trim());
}

// ── Consulta manual por código ────────────────────────────────
async function consultarCodigoManual() {
  var input  = document.getElementById('qrManual');
  var codigo = input.value.trim();
  if (!codigo) { toast('Ingresa un código', 'err'); return; }
  await procesarCodigo(codigo);
}

// ── Procesar código (QR o manual) ────────────────────────────
async function procesarCodigo(codigo) {
  showLoader('Buscando alumno…');
  var resp = await API.post('consultarQR', { codigo });
  hideLoader();

  if (resp.ok && resp.datos) {
    _datosQR = resp.datos;
    mostrarResultadoQR(resp.datos);
    toast('✓ Alumno encontrado', 'ok');
  } else {
    toast(resp.msg || 'Código no encontrado', 'err');
    document.getElementById('qrResultBox').classList.remove('show');
  }
}

// ── Mostrar resultado del QR ──────────────────────────────────
function mostrarResultadoQR(datos) {
  var box = document.getElementById('qrResultBox');
  var html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:.83rem">
      <div><b style="color:var(--c-text)">Nombre</b><br>${datos.nombre}</div>
      <div><b style="color:var(--c-text)">Código</b><br>${datos.codigo}</div>
      <div><b style="color:var(--c-text)">Curso</b><br>${datos.curso}</div>
      <div><b style="color:var(--c-text)">Grupo</b><br>${datos.codigoGrupo || '—'}</div>
      <div><b style="color:var(--c-text)">Catequista</b><br>${datos.catequista || '—'}</div>
      <div><b style="color:var(--c-text)">Madre</b><br>${datos.madre || '—'}</div>
      <div><b style="color:var(--c-text)">Teléfono</b><br>${datos.telefono || '—'}</div>
      <div><b style="color:var(--c-text)">Pago previo</b><br>
        <span class="badge ${datos.pago==='Pagado'?'badge-ok':datos.pago==='Pendiente'?'badge-warn':'badge-dim'}">
          ${datos.pago || '—'}
        </span>
      </div>
    </div>
  `;
  document.getElementById('qrResultDatos').innerHTML = html;
  box.classList.add('show');
}

// ── Renovar desde QR ─────────────────────────────────────────
function renovarDesdeQR() {
  if (!_datosQR) return;
  AppState.alumnoActual = _datosQR;
  goPage('registro');
  nuevoRegistro(); // resetear primero
  precargarFormulario(_datosQR);
  toast('📋 Datos cargados — actualiza lo necesario y guarda', 'info');
  // Cambiar acción de guardado a renovar
  document.getElementById('btnGuardar').onclick = guardarRenovacion;
}

// ── Guardar renovación ────────────────────────────────────────
async function guardarRenovacion() {
  var btn = document.getElementById('btnGuardar');
  btn.disabled = true;

  try {
    var datos = leerFormulario();
    datos.codigo = AppState.codigoRenovacion || (_datosQR && _datosQR.codigo) || '';

    showLoader('Subiendo archivos…');
    var links = await API.subirTodosLosArchivos(AppState.archivos, datos.codigo);

    showLoader('Guardando renovación…');
    var payload = Object.assign({}, datos, {
      foto            : links.foto            || datos.foto            || (_datosQR && _datosQR.foto)            || '',
      actaNac         : links.actaNac         || datos.actaNac         || (_datosQR && _datosQR.actaNac)         || '',
      boletaBautizo   : links.boletaBautizo   || datos.boletaBautizo   || (_datosQR && _datosQR.boletaBautizo)   || '',
      boletaConf      : links.boletaConf      || datos.boletaConf      || (_datosQR && _datosQR.boletaConf)      || '',
      comprobantePago : links.comprobantePago || datos.comprobantePago || (_datosQR && _datosQR.comprobantePago) || ''
    });

    var resp = await API.post('renovar', payload);
    hideLoader();

    if (resp.ok) {
      AppState.alumnoActual = Object.assign({}, payload, { codigo: resp.folio });
      toast('✓ Renovación guardada — Folio: ' + resp.folio, 'ok');
      document.getElementById('formRegistro').style.display = 'none';
      document.getElementById('registroExito').style.display = 'block';
      document.getElementById('folioGenerado').textContent = resp.folio;
      // Restaurar función original
      document.getElementById('btnGuardar').onclick = guardarRegistro;
    } else {
      toast('Error: ' + resp.msg, 'err');
      btn.disabled = false;
    }
  } catch(e) {
    hideLoader();
    toast('Error: ' + e.message, 'err');
    btn.disabled = false;
  }
}

// ── Ver credencial desde QR ───────────────────────────────────
function verCredencialDesdeQR() {
  if (!_datosQR) return;
  AppState.alumnoActual = _datosQR;
  abrirCredencial();
}

// ── Buscar alumno (página buscar) ─────────────────────────────
async function buscarAlumno() {
  var termino = document.getElementById('buscarInput').value.trim();
  if (termino.length < 3) {
    toast('Escribe al menos 3 caracteres', 'err');
    return;
  }
  showLoader('Buscando…');
  var resp = await API.get('buscar', { q: termino });
  hideLoader();

  var container = document.getElementById('buscarResultados');

  if (!resp.ok || !resp.datos || resp.datos.length === 0) {
    container.innerHTML = '<p style="color:var(--c-text-dim)">No se encontraron resultados para "' + termino + '".</p>';
    return;
  }

  var html = `<p style="color:var(--c-text-dim);margin-bottom:12px">${resp.total} resultado(s)</p>`;
  resp.datos.forEach(function(a) {
    html += `
      <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:var(--radius-sm);
                  padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:14px">
        ${a.foto
          ? `<img src="${a.foto}" style="width:40px;height:48px;border-radius:4px;object-fit:cover;flex-shrink:0"/>`
          : `<div style="width:40px;height:48px;border-radius:4px;background:var(--c-border);flex-shrink:0;display:flex;align-items:center;justify-content:center">👤</div>`
        }
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;color:var(--c-text)">${a.nombre}</div>
          <div style="font-size:.78rem;color:var(--c-text-dim)">${a.curso} · ${a.codigoGrupo || 'Sin grupo'} · ${a.codigo}</div>
          <div style="font-size:.78rem;color:var(--c-text-dim)">${a.telefono}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="AppState.alumnoActual=window._busqData[${resp.datos.indexOf(a)}];abrirCredencial()">🪪</button>
          <button class="btn btn-ghost btn-sm" onclick="AppState.alumnoActual=window._busqData[${resp.datos.indexOf(a)}];abrirComprobante()">🧾</button>
        </div>
      </div>
    `;
  });

  window._busqData = resp.datos; // referencia para los botones
  container.innerHTML = html;
}

// Buscar al presionar Enter
document.getElementById('buscarInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') buscarAlumno();
});
