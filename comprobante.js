// ============================================================
//  modules/comprobante.js
//  Comprobante de pago tamaño carta — 2 copias (iglesia / familia)
// ============================================================

function abrirComprobante() {
  var a = AppState.alumnoActual;
  if (!a) { toast('No hay alumno seleccionado', 'err'); return; }
  document.getElementById('comprobanteContenido').innerHTML = renderComprobante(a);
  abrirModal('modalComprobante');
  setTimeout(() => {
    generarQREnEl('qr-comp-iglesia', a.codigo || a.nombre);
    generarQREnEl('qr-comp-familia', a.codigo || a.nombre);
  }, 100);
}

function renderComprobante(a) {
  var ciclo   = obtenerCicloActual();
  var hoy     = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' });
  var mitad   = comprobanteMitad(a, ciclo, hoy, 'iglesia');
  var mitad2  = comprobanteMitad(a, ciclo, hoy, 'familia');

  return `
  <div id="comprobante-print-area" style="font-family:'DM Sans',sans-serif;background:#fff;color:#111;padding:0">
    ${mitad}
    <!-- Línea de corte -->
    <div style="display:flex;align-items:center;gap:10px;padding:4px 0;color:#aaa;font-size:.72rem">
      <div style="flex:1;border-top:2px dashed #ccc"></div>
      ✂ Cortar aquí
      <div style="flex:1;border-top:2px dashed #ccc"></div>
    </div>
    ${mitad2}
  </div>
  `;
}

function comprobanteMitad(a, ciclo, hoy, tipo) {
  var titulo = tipo === 'iglesia' ? '📋 Copia Parroquia' : '👨‍👩‍👧 Copia Familia';
  var color  = tipo === 'iglesia' ? '#1a0a2e' : '#0d1a40';

  return `
  <div style="padding:18px 24px;min-height:290px">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div>
        <div style="font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;color:${color}">
          ✝ Parroquia — Catequesis
        </div>
        <div style="font-size:.72rem;color:#666;margin-top:2px">Comprobante de inscripción ${ciclo}</div>
        <div style="display:inline-block;background:${color};color:#f0d070;font-size:.65rem;
                    font-weight:600;padding:2px 8px;border-radius:99px;margin-top:4px">${titulo}</div>
      </div>
      <div style="text-align:right">
        <div id="qr-comp-${tipo}" style="background:#fff;padding:2px;border:1px solid #ddd;border-radius:4px;display:inline-block"></div>
        <div style="font-size:.62rem;color:#aaa;margin-top:2px">${a.codigo || '—'}</div>
      </div>
    </div>

    <!-- Tabla de datos -->
    <table style="width:100%;border-collapse:collapse;font-size:.78rem;margin-bottom:10px">
      <tr>
        <td style="${tdStyle}"><b>Nombre</b></td>
        <td style="${tdStyle}" colspan="3">${a.nombre}</td>
      </tr>
      <tr>
        <td style="${tdStyle}"><b>Código / Folio</b></td>
        <td style="${tdStyle}">${a.codigo || '—'}</td>
        <td style="${tdStyle}"><b>Fecha</b></td>
        <td style="${tdStyle}">${hoy}</td>
      </tr>
      <tr>
        <td style="${tdStyle}"><b>Curso</b></td>
        <td style="${tdStyle}">${a.curso || '—'}</td>
        <td style="${tdStyle}"><b>Grupo</b></td>
        <td style="${tdStyle}">${a.codigoGrupo || '—'}</td>
      </tr>
      <tr>
        <td style="${tdStyle}"><b>Catequista</b></td>
        <td style="${tdStyle}">${a.catequista || '—'}</td>
        <td style="${tdStyle}"><b>Día/Hora</b></td>
        <td style="${tdStyle}">${[a.dia, a.hora].filter(Boolean).join(' ') || '—'}</td>
      </tr>
      <tr>
        <td style="${tdStyle}"><b>Madre de familia</b></td>
        <td style="${tdStyle}">${a.madre || '—'}</td>
        <td style="${tdStyle}"><b>Teléfono</b></td>
        <td style="${tdStyle}">${a.telefono || '—'}</td>
      </tr>
      <tr>
        <td style="${tdStyle}"><b>Pago realizado</b></td>
        <td style="${tdStyle}" colspan="3">
          <b style="color:${a.pago==='Pagado'?'#166534':a.pago==='Pendiente'?'#92400e':'#374151'}">${a.pago || '—'}</b>
        </td>
      </tr>
      <tr>
        <td style="${tdStyle}"><b>Observaciones</b></td>
        <td style="${tdStyle};height:28px" colspan="3"></td>
      </tr>
    </table>

    <!-- Firmas -->
    <div style="display:flex;gap:24px;margin-top:10px">
      <div style="flex:1;border-top:1px solid #ccc;padding-top:6px;font-size:.68rem;color:#888;text-align:center">
        Firma del catequista / encargado
      </div>
      <div style="flex:1;border-top:1px solid #ccc;padding-top:6px;font-size:.68rem;color:#888;text-align:center">
        Firma del padre / tutor
      </div>
    </div>
  </div>
  `;
}

var tdStyle = 'padding:5px 8px;border:1px solid #ddd;color:#333;vertical-align:top';

function imprimirComprobante() {
  var area = document.getElementById('comprobante-print-area');
  if (!area) return;
  var ventana = window.open('', '_blank', 'width=820,height=700');
  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Comprobante de Inscripción</title>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'DM Sans',sans-serif; padding:20px; background:#fff; }
        @page { size:letter portrait; margin:15mm; }
        @media print {
          body { padding:0; }
          button { display:none; }
        }
      </style>
    </head>
    <body onload="window.print()">
      ${area.innerHTML}
    </body>
    </html>
  `);
  ventana.document.close();
}
