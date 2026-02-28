// ============================================================
// HOOQ — Google Apps Script para crear Google Docs
// ============================================================
// INSTRUCCIONES:
// 1. Ve a https://script.google.com
// 2. Crea un nuevo proyecto (+ New Project)
// 3. Borra el contenido y pega TODO este archivo
// 4. Click en Deploy > New deployment
// 5. Type: Web app
// 6. Execute as: Me
// 7. Who has access: Anyone
// 8. Click Deploy, copia la URL
// 9. Pega la URL en el nodo "Config" de N8N donde dice GOOGLE_SCRIPT_URL
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var title = data.title || 'Hooq - Guiones ADS ' + new Date().toLocaleDateString('es-CO');
    var content = data.content || '';

    // Crear el documento
    var doc = DocumentApp.create(title);
    var body = doc.getBody();
    body.clear();

    // Estilos
    var titleAttrs = {};
    titleAttrs[DocumentApp.Attribute.BOLD] = true;
    titleAttrs[DocumentApp.Attribute.FONT_SIZE] = 18;
    titleAttrs[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';

    var contenidoHeaderAttrs = {};
    contenidoHeaderAttrs[DocumentApp.Attribute.BOLD] = true;
    contenidoHeaderAttrs[DocumentApp.Attribute.FONT_SIZE] = 16;
    contenidoHeaderAttrs[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';

    var sectionHeaderAttrs = {};
    sectionHeaderAttrs[DocumentApp.Attribute.BOLD] = true;
    sectionHeaderAttrs[DocumentApp.Attribute.FONT_SIZE] = 11;
    sectionHeaderAttrs[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
    sectionHeaderAttrs[DocumentApp.Attribute.BACKGROUND_COLOR] = '#000000';
    sectionHeaderAttrs[DocumentApp.Attribute.FOREGROUND_COLOR] = '#FFFFFF';

    var normalAttrs = {};
    normalAttrs[DocumentApp.Attribute.BOLD] = false;
    normalAttrs[DocumentApp.Attribute.FONT_SIZE] = 11;
    normalAttrs[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
    normalAttrs[DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
    normalAttrs[DocumentApp.Attribute.BACKGROUND_COLOR] = null;

    var boldAttrs = {};
    boldAttrs[DocumentApp.Attribute.BOLD] = true;
    boldAttrs[DocumentApp.Attribute.FONT_SIZE] = 11;
    boldAttrs[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
    boldAttrs[DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
    boldAttrs[DocumentApp.Attribute.BACKGROUND_COLOR] = null;

    // Titulo del documento
    var titleP = body.appendParagraph(title);
    titleP.setAttributes(titleAttrs);
    body.appendParagraph('Generado: ' + new Date().toLocaleString('es-CO')).setItalic(true);
    body.appendParagraph('');

    // Parsear y formatear contenido
    var lines = content.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) {
        body.appendParagraph('');
        continue;
      }

      // CONTENIDO #N
      if (/^CONTENIDO #\d+/.test(trimmed)) {
        body.appendParagraph(''); // espacio antes
        var p = body.appendParagraph(trimmed);
        p.setAttributes(contenidoHeaderAttrs);
        continue;
      }

      // Section headers: REFERENTE, HOOK 1, HOOK 2, CUERPO, CTA 1, CTA 2, CTA
      if (/^(REFERENTE|HOOK\s*\d*|CUERPO|CTA\s*\d*)$/i.test(trimmed)) {
        var p = body.appendParagraph(trimmed);
        p.setAttributes(sectionHeaderAttrs);
        continue;
      }

      // Separador
      if (trimmed === '---' || trimmed.indexOf('━') >= 0) {
        body.appendHorizontalRule();
        continue;
      }

      // Direcciones visuales [ENTRE CORCHETES]
      if (/^\[.*\]$/.test(trimmed)) {
        var p = body.appendParagraph(trimmed);
        p.setAttributes(boldAttrs);
        continue;
      }

      // Texto normal
      var p = body.appendParagraph(line);
      p.setAttributes(normalAttrs);
    }

    // Permisos: cualquiera con el link puede editar
    var file = DriveApp.getFileById(doc.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: doc.getUrl(),
      docId: doc.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
