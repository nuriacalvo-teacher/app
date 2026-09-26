/**
 * =====================================================================
 *  ACCESO CON GOOGLE · Archivo histórico del IES Goya
 *  Proyecto de Apps Script APARTE (no va en el proyecto del archivo).
 * =====================================================================
 *
 *  Sirve para que el profesorado entre al archivo con SU cuenta de Google (@gmail.com,
 *  @iesgoya.es…) sin códigos. Esta pequeña app se ejecuta con la cuenta de quien la abre,
 *  pregunta a Google su correo y le devuelve al archivo con un pase firmado. Sólo pide permiso
 *  para «ver tu dirección de correo»: no puede ver ni tocar nada más de nadie.
 *
 *  Instalación:
 *   1. script.google.com > Nuevo proyecto. Llámalo «Acceso Archivo IES Goya».
 *   2. Pega este archivo y rellena las dos líneas de abajo:
 *        SECRETO     → la «clave secreta» que aparece en el archivo, en Ajustes y copias.
 *        URL_ARCHIVO → el enlace público del archivo (el que termina en /exec).
 *   3. Implementar > Nueva implementación > Aplicación web:
 *        Ejecutar como: «Usuario que accede a la aplicación web»
 *        Quién tiene acceso: «Cualquier usuario con una cuenta de Google»
 *   4. Copia su enlace y pégalo en el archivo, en Ajustes y copias > «Enlace de Acceso con Google».
 */

const SECRETO = 'PEGA_AQUI_LA_CLAVE_SECRETA';
const URL_ARCHIVO = 'PEGA_AQUI_EL_ENLACE_DEL_ARCHIVO';

function doGet() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  let cuerpo;
  if (!email) {
    cuerpo = '<h1>No se ha podido comprobar tu cuenta</h1><p>Google no ha facilitado tu correo. Cierra esta pestaña e inténtalo de nuevo.</p>';
  } else if (SECRETO.indexOf('PEGA_AQUI') === 0 || URL_ARCHIVO.indexOf('PEGA_AQUI') === 0) {
    cuerpo = '<h1>Falta configurar el acceso</h1><p>La coordinación tiene que rellenar SECRETO y URL_ARCHIVO en este proyecto.</p>';
  } else {
    const datos = email + '|' + (Date.now() + 5 * 60 * 1000);
    const firma = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(datos, SECRETO));
    const pase = Utilities.base64EncodeWebSafe(datos, Utilities.Charset.UTF_8) + '.' + firma;
    const url = URL_ARCHIVO + (URL_ARCHIVO.indexOf('?') >= 0 ? '&' : '?') + 'acceso=' + encodeURIComponent(pase);
    cuerpo = '<div class="sello">G</div><h1>Archivo histórico del IES Goya</h1>' +
      '<p>Has entrado como <strong>' + esc(email) + '</strong>.</p>' +
      '<a class="boton" href="' + esc(url) + '" target="_top">Continuar al archivo</a>' +
      '<p class="nota">Si tu correo está autorizado por la coordinación podrás editar; si no, verás la consulta pública.</p>';
  }
  const html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f4ef;font-family:system-ui,sans-serif;color:#23262d}' +
    '.caja{background:#fff;border:1px solid #dcd6c8;border-radius:14px;padding:32px;max-width:420px;text-align:center;box-shadow:0 10px 40px rgba(31,42,68,.08)}' +
    '.sello{width:64px;height:64px;border-radius:50%;background:#8c2332;color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 30px Georgia,serif;box-shadow:inset 0 0 0 2px #b08d57,inset 0 0 0 4px #8c2332}' +
    'h1{font:700 22px Georgia,serif;color:#1f2a44}.boton{display:inline-block;background:#8c2332;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;margin:8px 0}' +
    '.nota{font-size:13px;color:#6b6f78}</style></head><body><div class="caja">' + cuerpo + '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Acceso · Archivo IES Goya')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
