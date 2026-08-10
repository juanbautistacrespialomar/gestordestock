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

## Datos y sincronización entre dispositivos

Por defecto todo vive en `localStorage` del navegador (modo **Local**, offline). Para que el stock sea **el mismo desde la PC y el celu**, hay un backend opcional en **Cloudflare Worker + D1**.

### Cómo funciona

- La app guarda siempre en local (seguís trabajando sin conexión) y, si hay servidor configurado, empuja/trae el estado completo.
- Control de versión optimista con `rev`: si desde la última sincronización cambió **acá y en el servidor**, la app avisa **Conflicto** y elegís cuál conservar. Si solo cambió de un lado, sincroniza solo.
- El indicador de estado (**Local / Sincronizado / Guardando / Sin conexión / Conflicto**) está en la barra lateral.

### Backend — archivos

| Archivo | Qué es |
|---|---|
| `worker.js` | El Worker (API `/state`, GET y PUT con control de `rev`). |
| `schema.sql` | Tabla `estado` de D1. |
| `wrangler.toml` | Config de deploy (poné el `database_id`). |

### Deploy del backend (una vez)

```bash
npm i -g wrangler
wrangler login

# 1) Crear la base D1 y pegar el database_id en wrangler.toml
wrangler d1 create mayor-stock

# 2) Crear la tabla
wrangler d1 execute mayor-stock --remote --file=schema.sql

# 3) Definir el token de acceso (elegí uno largo y secreto)
wrangler secret put TOKEN

# 4) Publicar
wrangler deploy
```

Te queda una URL tipo `https://mayor-stock-api.TU-USUARIO.workers.dev`.

### Conectar la app

En cada dispositivo, entrá a **Datos → Sincronización** y cargá:

- **URL del Worker**: la de `wrangler deploy`.
- **Token**: el mismo que pusiste en `wrangler secret put TOKEN`.
- **Espacio**: `main` (o `us`, `europa`, etc. para tener varios inventarios separados en el mismo servidor).

Tocá **Conectar / Guardar**. El primer dispositivo sube su estado; los demás lo traen. Listo.

> El token viaja en el header `Authorization: Bearer`. Al ser un solo secreto compartido, tratá la URL+token como una contraseña. Si querés algo más fino (usuarios, roles) se puede, pero para uso personal esto alcanza y es simple.

### Respaldo extra

Aun con servidor, **Datos → Exportar JSON** te da una copia puntual. **Importar JSON** reemplaza el estado actual (y se sincroniza al servidor si estás conectado).
