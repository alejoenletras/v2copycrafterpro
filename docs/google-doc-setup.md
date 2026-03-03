# Configuración de Google Doc en N8N

El agente de anuncios crea un Google Doc con los guiones generados. Para que funcione, necesitas un Google Apps Script desplegado como web app.

## Paso 1: Crear el Google Apps Script

1. Ve a [script.google.com](https://script.google.com)
2. Crea un nuevo proyecto
3. Pega este código:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const title = data.title || 'Guiones Hooq - ' + new Date().toLocaleDateString();
    const content = data.content || '';

    const doc = DocumentApp.create(title);
    const body = doc.getBody();

    // Parsear secciones del contenido
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        body.appendParagraph(line.substring(2)).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      } else if (line.startsWith('## ')) {
        body.appendParagraph(line.substring(3)).setHeading(DocumentApp.ParagraphHeading.HEADING2);
      } else if (line.startsWith('---')) {
        body.appendHorizontalRule();
      } else {
        body.appendParagraph(line);
      }
    }

    doc.saveAndClose();

    // Mover a carpeta específica (opcional)
    if (data.folderId) {
      const file = DriveApp.getFileById(doc.getId());
      DriveApp.getFolderById(data.folderId).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      docId: doc.getId(),
      docUrl: doc.getUrl(),
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Paso 2: Desplegar como Web App

1. Clic en **Implementar** → **Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo** (tu cuenta de Google)
4. Quién tiene acceso: **Cualquiera**
5. Clic en **Implementar**
6. Copia la URL de la web app (formato: `https://script.google.com/macros/s/AKfyc.../exec`)

## Paso 3: Configurar en N8N

1. Abre el workflow v7 en N8N
2. En el nodo **Config**, pega la URL en el campo `GOOGLE_SCRIPT_URL`
3. Guarda el workflow

## Paso 4: Permisos

La primera vez que se ejecute, Google pedirá permisos para:
- Crear documentos en Google Docs
- Acceder a Google Drive

Acepta los permisos para que el script funcione.

## Solución de problemas

| Problema | Solución |
|----------|----------|
| "No se pudo crear Google Doc" | Verifica que la URL del script sea correcta y que los permisos estén autorizados |
| El doc se crea vacío | Revisa que el campo `content` en el request no sea vacío |
| Error 403 | Vuelve a desplegar el script con acceso "Cualquiera" |
| Timeout | Google Apps Script tiene un límite de 6 minutos. Si el contenido es muy largo, puede fallar |

## Nota sobre fallos

El workflow v7 incluye un fallback: si el Google Doc falla, los guiones se envían igualmente por Telegram y email con un aviso `[AVISO] No se pudo crear Google Doc`. No se pierde ningún contenido.
