// ============================================================
//  modules/credencial.js
//  Generación de credencial con foto, QR y datos del alumno
// ============================================================

function abrirCredencial() {
  var a = AppState.alumnoActual;
  if (!a) { toast('No hay alumno seleccionado', 'err'); return; }
  document.getElementById('credencialContenido').innerHTML = renderCredencial(a);
  abrirModal('modalCredencial');
  // Generar QR dentro del modal
  setTimeout(() => generarQREnEl('qr-cred-' + (a.codigo || 'X'), a.codigo || a.nombre), 100);
}

function renderCredencial(a) {
  var ciclo = obtenerCicloActual();
  var fotoHtml = a.foto
    ? `<img src="${a.foto}" alt="Foto" style="width:88px;height:105px;object-fit:cover;border-radius:6px;border:2px solid #c8a84b"/>`
    : `<div style="width:88px;height:105px;background:#2a1f50;border-radius:6px;border:2px dashed #c8a84b;display:flex;align-items:center;justify-content:center;font-size:2rem">👤</div>`;

  return `
  <div id="credencial-print-area" style="
    font-family:'DM Sans',sans-serif;
    background:linear-gradient(145deg,#1a0a2e 0%,#0d1a40 100%);
    border:2px solid #c8a84b;border-radius:12px;
    padding:0;overflow:hidden;width:340px;margin:0 auto;
    box-shadow:0 8px 32px rgba(0,0,0,.6);
  ">
    <!-- Header -->
    <div style="background:linear-gradient(90deg,#c8a84b,#f0d070,#c8a84b);
                padding:8px 16px;text-align:center">
      <div style="font-family:'Cinzel',serif;font-size:.65rem;font-weight:700;
                  color:#1a0a2e;letter-spacing:.12em;text-transform:uppercase">
        ✝ Parroquia — Sistema Catequesis
      </div>
    </div>

    <!-- Cuerpo -->
    <div style="padding:16px;display:flex;gap:14px;align-items:flex-start">
      <div style="flex-shrink:0">
        ${fotoHtml}
        <!-- QR -->
        <div id="qr-cred-${a.codigo || 'X'}" style="margin-top:8px;background:#fff;padding:4px;border-radius:4px;width:88px;height:88px;display:flex;align-items:center;justify-content:center"></div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Cinzel',serif;font-size:1rem;font-weight:700;
                    color:#f0d070;margin-bottom:8px;line-height:1.2">${a.nombre}</div>
        <div style="display:grid;gap:4px;font-size:.72rem">
          ${row('Curso',       a.curso)}
          ${row('Grupo',       a.codigoGrupo)}
          ${row('Catequista',  a.catequista)}
          ${row('Día / Hora',  [a.dia, a.hora].filter(Boolean).join(' · '))}
          ${row('Ciclo',       ciclo)}
          ${row('Código',      a.codigo)}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:rgba(200,168,75,.12);border-top:1px solid rgba(200,168,75,.3);
                padding:6px 16px;text-align:center;font-size:.62rem;color:rgba(240,215,112,.6)">
      Credencial válida únicamente para el ciclo ${ciclo} · ✝
    </div>
  </div>
  `;
}

function row(label, val) {
  if (!val) return '';
  return `
    <div style="display:flex;gap:6px">
      <span style="color:rgba(240,215,112,.6);min-width:70px">${label}</span>
      <span style="color:#ede8f5;font-weight:500">${val}</span>
    </div>
  `;
}

function generarQREnEl(elId, contenido) {
  if (!contenido) return;
  var el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';
  try {
    new QRCode(el, {
      text       : contenido,
      width      : 80,
      height     : 80,
      colorDark  : '#000000',
      colorLight : '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch(e) {
    console.warn('QR no generado:', e.message);
  }
}

function imprimirCredencial() {
  var area = document.getElementById('credencial-print-area');
  if (!area) return;
  var ventana = window.open('', '_blank', 'width=420,height=600');
  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Credencial</title>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>
        body { margin:20px; background:#fff; display:flex; justify-content:center; }
        @media print { body { margin:0; } }
      </style>
    </head>
    <body onload="window.print()">
      ${area.outerHTML}
    </body>
    </html>
  `);
  ventana.document.close();
}

function obtenerCicloActual() {
  var ahora = new Date();
  var anio  = ahora.getFullYear();
  var mes   = ahora.getMonth() + 1;
  return mes >= 9 ? anio + '-' + (anio + 1) : (anio - 1) + '-' + anio;
}
