// ============================================================
//  modules/api.js
//  Capa de comunicación con el backend (Apps Script Web App)
//  Todas las llamadas pasan por aquí — un solo punto de control
// ============================================================

var API = (function() {

  // ── GET request ──────────────────────────────────────────
  async function get(action, params) {
    params = params || {};
    var qs = new URLSearchParams(Object.assign({ action }, params)).toString();
    var url = API_URL + (API_URL.includes('?') ? '&' : '?') + qs;

    try {
      var resp = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return await resp.json();
    } catch (err) {
      console.error('API GET error:', err);
      return { ok: false, msg: err.message };
    }
  }

  // ── POST request ─────────────────────────────────────────
  async function post(action, payload) {
    payload = payload || {};
    payload.action = action;

    try {
      var resp = await fetch(API_URL, {
        method   : 'POST',
        redirect : 'follow',
        headers  : { 'Content-Type': 'application/json' },
        body     : JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return await resp.json();
    } catch (err) {
      console.error('API POST error:', err);
      return { ok: false, msg: err.message };
    }
  }

  // ── Subir un archivo (base64) ─────────────────────────────
  async function subirArchivo(base64, nombre, mimeType, carpeta, folio) {
    return post('subirArchivo', { base64, nombre, mimeType, carpeta, folio });
  }

  // ── Subir múltiples archivos del formulario ───────────────
  async function subirTodosLosArchivos(archivos, folio) {
    var links = {};
    var entradas = Object.entries(archivos);

    for (var [campo, archivo] of entradas) {
      if (!archivo) continue;
      try {
        showLoader('Subiendo ' + archivo.nombre + '…');
        var resp = await subirArchivo(
          archivo.base64,
          archivo.nombre,
          archivo.mimeType,
          mapCarpeta(campo),
          folio
        );
        if (resp.ok) {
          links[campo] = resp.directUrl || resp.enlace;
        } else {
          console.warn('No se subió ' + campo + ':', resp.msg);
        }
      } catch(e) {
        console.warn('Error subiendo ' + campo + ':', e.message);
      }
    }

    return links;
  }

  // ── Mapeo campo → nombre de carpeta en Drive ─────────────
  function mapCarpeta(campo) {
    var map = {
      foto            : 'Fotos',
      actaNac         : 'ActasNacimiento',
      boletaBautizo   : 'BoletasBautizo',
      boletaConf      : 'BoletasConfirmacion',
      comprobantePago : 'ComprobantesPago'
    };
    return map[campo] || 'Otros';
  }

  return { get, post, subirArchivo, subirTodosLosArchivos };
})();
