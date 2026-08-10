# Mayor de Stock

Gestor de stock en vanilla HTML/CSS/JS, sin frameworks ni dependencias de build. Las **compras suman** stock y fijan el **último costo**; las **ventas restan** con validación de existencias. Importa facturas en **PDF** (parser cliente con pdf.js) y deja trazabilidad de cada movimiento. Datos en `localStorage`, backup por JSON.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La app entera (UI + lógica). Es lo único imprescindible para que funcione. |
| `manifest.json` | Metadatos PWA para instalación. |
| `sw.js` | Service worker: cachea la app y pdf.js para uso offline. |
| `icon-192.png`, `icon-512.png` | Íconos de la PWA. |
| `apple-touch-icon.png` | Ícono para "Agregar a inicio" en iOS. |
| `favicon.png` | Favicon. |

> Si solo querés probarla, con abrir `index.html` alcanza. Los demás archivos son para que sea **instalable y offline**.

## Deploy en GitHub Pages

1. Subí todos los archivos a la raíz del repo (o a `/docs`).
2. Settings → Pages → Branch `main` (carpeta raíz o `/docs`).
3. Entrá a la URL publicada. En el celular: **Compartir → Agregar a inicio** y queda como app.

## Convención de versionado del service worker

Cada vez que modificás `index.html`, subí el string de versión en `sw.js`:

```js
const CACHE = "mayor-stock-v1";  // -> "mayor-stock-v2", etc.
```

y pusheá **los dos archivos juntos**. Si no, el navegador sigue sirviendo la versión cacheada y no ves los cambios.

## Import de PDF

- Reconoce el formato tipo **Coqui Hobby** (`SKU: descripción … QTY UOM MSRP NET EXT`): toma **NET PRICE** como costo y **MSRP** como precio de venta sugerido, y excluye el flete del stock.
- Si el layout no matchea, cae a una detección genérica línea por línea.
- **Siempre** muestra una tabla editable + el texto crudo extraído antes de impactar stock. Revisá antes de confirmar: los formatos varían.
- El PDF se procesa en el navegador; no se sube a ningún lado.

## Datos

Todo vive en `localStorage` de ese navegador/dispositivo. Usá **Datos → Exportar JSON** para respaldar y mover entre equipos. **Importar JSON** reemplaza todo lo actual.
