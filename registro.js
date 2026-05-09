// ============================================================
//  modules/registro.js
//  Lógica del formulario de inscripción: steps, foto, archivos
// ============================================================

// ── Cámara ───────────────────────────────────────────────────
var _stream = null;

document.getElementById('btnCamara').addEventListener('click', abrirCamara);
document.getElementById('btnCapturar').addEventListener('click', capturarFoto);
document.getElementById('btnQuitarFoto').addEventListener('click', quitarFoto);
document.getElementById('fotoGaleria').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var b64 = ev.target.result;
    AppState.fotoBase64 = b64.split(',')[1];
    AppState.archivos.foto = { base64: AppState.fotoBase64, nombre: file.name, mimeType: file.type };
    mostrarFotoPreview(b64);
  };
  reader.readAsDataURL(file);
});

// Calcular edad automática al cambiar fecha
document.getElementById('f-fechaNac').addEventListener('change', function() {
  document.getElementById('f-edad').value = calcularEdad(this.value);
});

async function abrirCamara() {
  try {
    var video = document.getElementById('camara-video');
    _stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    video.srcObject = _stream;
    video.style.display = 'block';
    document.getElementById('btnCapturar').style.display = 'block';
    document.getElementById('btnCamara').style.display = 'none';
  } catch(e) {
    toast('No se pudo acceder a la cámara: ' + e.message, 'err');
  }
}

function capturarFoto() {
  var video  = document.getElementById('camara-video');
  var canvas = document.getElementById('camara-canvas');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  AppState.fotoBase64 = dataUrl.split(',')[1];
  AppState.archivos.foto = { base64: AppState.fotoBase64, nombre: 'foto.jpg', mimeType: 'image/jpeg' };
  mostrarFotoPreview(dataUrl);
  detenerCamara();
}

function detenerCamara() {
  if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
  document.getElementById('camara-video').style.display = 'none';
  document.getElementById('btnCapturar').style.display = 'none';
  document.getElementById('btnCamara').style.display = 'block';
}

function mostrarFotoPreview(src) {
  var img = document.getElementById('fotoImg');
  img.src = src;
  img.style.display = 'block';
  document.getElementById('fotoPlaceholder').style.display = 'none';
  document.getElementById('btnQuitarFoto').style.display = 'block';
}

function quitarFoto() {
  AppState.fotoBase64 = null;
  delete AppState.archivos.foto;
  document.getElementById('fotoImg').style.display = 'none';
  document.getElementById('fotoImg').src = '';
  document.getElementById('fotoPlaceholder').style.display = 'block';
  document.getElementById('btnQuitarFoto').style.display = 'none';
}

// ── Upload zones ──────────────────────────────────────────────
function triggerUpload(campo) { /* los clicks van directo al input via CSS */ }

function onFileSelected(event, campo, zoneId) {
  var file = event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(ev) {
    var b64 = ev.target.result.split(',')[1];
    AppState.archivos[campo] = { base64: b64, nombre: file.name, mimeType: file.type };

    // Mostrar nombre del archivo en la zona
    var nameEl = document.getElementById(zoneId + '-name');
    if (nameEl) nameEl.textContent = '✓ ' + file.name;

    // Marcar zona visualmente
    var zone = document.getElementById(zoneId);
    if (zone) zone.style.borderColor = 'var(--c-success)';
  };
  reader.readAsDataURL(file);
}

// ── Steps del formulario ──────────────────────────────────────
function nextStep(current) {
  if (!validarStep(current)) return;
  mostrarStep(current + 1);
  if (current + 1 === 4) renderResumen();
}

function prevStep(current) {
  mostrarStep(current - 1);
}

function mostrarStep(n) {
  AppState.currentStep = n;
  document.querySelectorAll('.form-step').forEach((el, i) => {
    el.style.display = (i + 1 === n) ? 'block' : 'none';
  });
  // Actualizar indicadores
  document.querySelectorAll('.step').forEach((el, i) => {
    var num = i + 1;
    el.classList.remove('active', 'done');
    if (num < n) el.classList.add('done');
    if (num === n) el.classList.add('active');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarStep(n) {
  if (n === 1) {
    var nombre  = document.getElementById('f-nombre').value.trim();
    var fechaNac = document.getElementById('f-fechaNac').value;
    var sexo    = document.getElementById('f-sexo').value;
    if (!nombre) { toast('El nombre es requerido', 'err'); return false; }
    if (!fechaNac) { toast('La fecha de nacimiento es requerida', 'err'); return false; }
    if (!sexo) { toast('Selecciona el sexo', 'err'); return false; }
  }
  if (n === 2) {
    var madre   = document.getElementById('f-madre').value.trim();
    var tel     = document.getElementById('f-tel').value.trim();
    var curso   = document.getElementById('f-curso').value;
    if (!madre)  { toast('Nombre de madre de familia requerido', 'err'); return false; }
    if (!tel)    { toast('Teléfono requerido', 'err'); return false; }
    if (!curso)  { toast('Selecciona el curso', 'err'); return false; }
  }
  return true;
}

// ── Resumen ───────────────────────────────────────────────────
function renderResumen() {
  var d = leerFormulario();
  var archivos = AppState.archivos;
  var html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px">
      <div><b style="color:var(--c-text)">Nombre</b><br>${d.nombre}</div>
      <div><b style="color:var(--c-text)">Fecha nac.</b><br>${formatFecha(d.fechaNacimiento)}</div>
      <div><b style="color:var(--c-text)">Edad</b><br>${d.edad} años</div>
      <div><b style="color:var(--c-text)">Sexo</b><br>${d.sexo}</div>
      <div><b style="color:var(--c-text)">Curso</b><br>${d.curso}</div>
      <div><b style="color:var(--c-text)">Grupo</b><br>${d.codigoGrupo || '—'}</div>
      <div><b style="color:var(--c-text)">Madre</b><br>${d.madre}</div>
      <div><b style="color:var(--c-text)">Teléfono</b><br>${d.telefono}</div>
      <div><b style="color:var(--c-text)">Catequista</b><br>${d.catequista || '—'}</div>
      <div><b style="color:var(--c-text)">Pago</b><br>${d.pago || '—'}</div>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      ${archivos.foto            ? '<span class="badge badge-ok">✓ Foto</span>' : '<span class="badge badge-warn">Sin foto</span>'}
      ${archivos.actaNac         ? '<span class="badge badge-ok">✓ Acta</span>' : '<span class="badge badge-dim">Sin acta</span>'}
      ${archivos.boletaBautizo   ? '<span class="badge badge-ok">✓ Bautizo</span>' : '<span class="badge badge-dim">Sin bautizo</span>'}
      ${archivos.boletaConf      ? '<span class="badge badge-ok">✓ Confirmación</span>' : '<span class="badge badge-dim">Sin confirmación</span>'}
      ${archivos.comprobantePago ? '<span class="badge badge-ok">✓ Comprobante</span>' : '<span class="badge badge-dim">Sin comprobante</span>'}
    </div>
  `;
  document.getElementById('resumenContenido').innerHTML = html;
}

// ── Leer todos los campos del formulario ──────────────────────
function leerFormulario() {
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  var fechaNac = val('f-fechaNac');
  return {
    nombre          : val('f-nombre'),
    fechaNacimiento : fechaNac,
    edad            : calcularEdad(fechaNac),
    sexo            : val('f-sexo'),
    talla           : val('f-talla'),
    madre           : val('f-madre'),
    telefono        : val('f-tel'),
    curso           : val('f-curso'),
    codigoGrupo     : val('f-codGrupo'),
    catequista      : val('f-cat1'),
    catequista2     : val('f-cat2'),
    dia             : val('f-dia'),
    hora            : val('f-hora'),
    santoGrupo      : val('f-santo'),
    ubicadoEn       : val('f-ubicadoEn'),
    ubicacion       : val('f-ubicacion'),
    pago            : val('f-pago')
  };
}

// ── Guardar registro completo ─────────────────────────────────
async function guardarRegistro() {
  var btn = document.getElementById('btnGuardar');
  btn.disabled = true;

  try {
    var datos = leerFormulario();

    // 1. Subir archivos a Drive
    showLoader('Subiendo archivos a Drive…');
    var links = await API.subirTodosLosArchivos(AppState.archivos, 'TEMP');

    // 2. Guardar registro en Sheets
    showLoader('Guardando inscripción…');
    var payload = Object.assign({}, datos, {
      foto            : links.foto            || '',
      actaNac         : links.actaNac         || '',
      boletaBautizo   : links.boletaBautizo   || '',
      boletaConf      : links.boletaConf      || '',
      comprobantePago : links.comprobantePago || ''
    });

    var resp = await API.post('nuevo', payload);
    hideLoader();

    if (resp.ok) {
      AppState.alumnoActual = Object.assign({}, payload, { codigo: resp.folio, edad: resp.edad });
      toast('✓ Inscripción guardada — Folio: ' + resp.folio, 'ok');

      // Mostrar pantalla de éxito
      document.getElementById('formRegistro').style.display = 'none';
      document.getElementById('registroExito').style.display = 'block';
      document.getElementById('folioGenerado').textContent = resp.folio;

      // Limpiar state para evitar reenvíos
      AppState.archivos = {};
    } else {
      toast('Error al guardar: ' + resp.msg, 'err');
      btn.disabled = false;
    }
  } catch(e) {
    hideLoader();
    toast('Error inesperado: ' + e.message, 'err');
    btn.disabled = false;
  }
}

// ── Nuevo registro (resetear) ─────────────────────────────────
function nuevoRegistro() {
  document.getElementById('formRegistro').reset();
  document.getElementById('formRegistro').style.display = 'block';
  document.getElementById('registroExito').style.display = 'none';
  AppState.archivos = {};
  AppState.fotoBase64 = null;
  quitarFoto();
  mostrarStep(1);
  // Limpiar zonas de upload
  ['uz-acta','uz-bautizo','uz-conf','uz-pago'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.borderColor = '';
    var nm = document.getElementById(id + '-name');
    if (nm) nm.textContent = '';
  });
}

// ── Precargar datos (para renovación desde QR) ───────────────
function precargarFormulario(datos) {
  function set(id, val) { var el=document.getElementById(id); if(el && val) el.value = val; }
  set('f-nombre',   datos.nombre);
  set('f-fechaNac', datos.fechaNacimiento);
  set('f-sexo',     datos.sexo);
  set('f-talla',    datos.talla);
  set('f-madre',    datos.madre);
  set('f-tel',      datos.telefono);
  set('f-curso',    datos.curso);
  set('f-codGrupo', datos.codigoGrupo);
  set('f-cat1',     datos.catequista);
  set('f-cat2',     datos.catequista2);
  set('f-dia',      datos.dia);
  set('f-hora',     datos.hora);
  set('f-santo',    datos.santoGrupo);
  set('f-ubicadoEn',datos.ubicadoEn);
  set('f-ubicacion',datos.ubicacion);
  set('f-pago',     datos.pago);

  // Calcular edad
  if (datos.fechaNacimiento) {
    document.getElementById('f-edad').value = calcularEdad(datos.fechaNacimiento);
  }
  // Mostrar foto si existe
  if (datos.foto) {
    mostrarFotoPreview(datos.foto);
  }
  // Si hay código de renovación, guardarlo
  if (datos.codigo) {
    AppState.codigoRenovacion = datos.codigo;
  }
}
