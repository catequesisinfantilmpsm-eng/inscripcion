// ============================================================
//  app.js — Núcleo de la aplicación Catequesis
//  Navegación, inicialización, estado global
// ============================================================

// ── URL del Web App de Apps Script ──────────────────────────
// ⚠️  REEMPLAZAR con la URL real al desplegar el Apps Script
var API_URL = 'https://script.google.com/macros/s/AKfycbymBzgNzZR00do50MyUiaEYw1Q_gh9KfUEZo5yg4CsXVUVVydibIGOQf9r8-Pbky7A/exec';

// ── Estado global ────────────────────────────────────────────
var AppState = {
  catalogos  : null,   // catálogos cargados una sola vez
  registros  : [],     // cache de todos los registros (admin)
  alumnoActual: null,  // último alumno consultado/registrado
  fotoBase64 : null,   // foto del alumno en base64
  archivos   : {},     // { actaNac, boletaBautizo, boletaConf, comprobantePago }
  currentStep: 1
};

// ════════════════════════════════════════════════════════════
//  NAVEGACIÓN
// ════════════════════════════════════════════════════════════
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn,.btab').forEach(b => {
    b.classList.toggle('active', b.dataset.page === id);
  });
  var el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');

  // Acciones especiales al entrar a una página
  if (id === 'admin' && AppState.registros.length === 0) cargarAdmin();
  if (id === 'inicio') cargarStats();
}

// Delegar clic en nav
document.querySelectorAll('.nav-btn, .btab').forEach(btn => {
  btn.addEventListener('click', () => goPage(btn.dataset.page));
});

// ════════════════════════════════════════════════════════════
//  LOADER
// ════════════════════════════════════════════════════════════
function showLoader(msg) {
  document.getElementById('loader-msg').textContent = msg || 'Procesando…';
  document.getElementById('loader').classList.add('show');
}
function hideLoader() {
  document.getElementById('loader').classList.remove('show');
}

// ════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════
function toast(msg, tipo) {
  tipo = tipo || 'info'; // 'ok' | 'err' | 'info'
  var el = document.createElement('div');
  el.className = 'toast toast-' + tipo;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ════════════════════════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════════════════════════
function abrirModal(id) { document.getElementById(id).classList.add('show'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('show'); }

// Click fuera cierra modal
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
});

// ════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ════════════════════════════════════════════════════════════
async function init() {
  try {
    // Cargar catálogos (con cache en sessionStorage)
    var cached = sessionStorage.getItem('catalogos_cat');
    if (cached) {
      AppState.catalogos = JSON.parse(cached);
    } else {
      showLoader('Cargando catálogos…');
      var resp = await API.get('catalogos');
      if (resp.ok) {
        AppState.catalogos = resp;
        sessionStorage.setItem('catalogos_cat', JSON.stringify(resp));
      }
      hideLoader();
    }
    llenarSelects();
    cargarStats();
  } catch (e) {
    hideLoader();
    console.warn('No se pudieron cargar catálogos:', e.message);
  }
}

// ════════════════════════════════════════════════════════════
//  LLENAR SELECTS CON CATÁLOGOS
// ════════════════════════════════════════════════════════════
function llenarSelects() {
  var c = AppState.catalogos;
  if (!c) return;

  function fill(id, arr) {
    var sel = document.getElementById(id);
    if (!sel) return;
    arr.forEach(function(v) {
      var opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      sel.appendChild(opt);
    });
  }

  fill('f-sexo', c.sexos || []);
  fill('f-talla', c.tallas || []);
  fill('f-curso', c.cursos || []);
  fill('f-dia', c.dias || []);
  fill('f-pago', c.pagos || []);

  // Filtros del admin
  var fGrupo = document.getElementById('filtroGrupo');
  var fCurso = document.getElementById('filtroCurso');
  if (c.cursos) c.cursos.forEach(function(v) {
    var opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    fCurso.appendChild(opt);
  });
}

// ════════════════════════════════════════════════════════════
//  STATS INICIO
// ════════════════════════════════════════════════════════════
async function cargarStats() {
  try {
    var resp = await API.get('todos');
    if (!resp.ok) return;
    var data = resp.datos || [];
    AppState.registros = data;

    var total     = data.length;
    var pagados   = data.filter(r => r.pago === 'Pagado').length;
    var pendientes= data.filter(r => r.pago === 'Pendiente').length;
    var grupos    = [...new Set(data.map(r => r.codigoGrupo).filter(Boolean))].length;

    function setEl(id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    }
    setEl('statTotal', total);       setEl('as-total', total);
    setEl('statPagados', pagados);   setEl('as-pagados', pagados);
    setEl('statPendientes', pendientes); setEl('as-pendientes', pendientes);
    setEl('statGrupos', grupos);     setEl('as-grupos', grupos);
  } catch(e) {
    console.warn('Stats:', e.message);
  }
}

// ════════════════════════════════════════════════════════════
//  HELPERS GENERALES
// ════════════════════════════════════════════════════════════
function calcularEdad(fechaStr) {
  if (!fechaStr) return '';
  var hoy = new Date(), nac = new Date(fechaStr);
  if (isNaN(nac)) return '';
  var edad = hoy.getFullYear() - nac.getFullYear();
  var m    = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function formatFecha(str) {
  if (!str) return '';
  var d = new Date(str + 'T00:00:00');
  if (isNaN(d)) return str;
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    var r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

// ════════════════════════════════════════════════════════════
//  START
// ════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', init);
