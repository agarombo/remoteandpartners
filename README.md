# Remote & Partners — sitio web

`index.html` es el sitio completo, autocontenido: la ciudad isométrica navegable
de remoteandpartners.com. `ciudad.html` es una variante recortada (sin
`<head>`/metadatos) pensada sólo para pegarla en el visor de Artifacts de
Claude; no forma parte del sitio publicado.

`DXF/` son los planos exportados para editar en AutoCAD. `RESPALDO/` queda
fuera del repositorio a propósito (ver `.gitignore`): son decenas de copias
completas del sitio en distintos momentos, y viven en Google Drive, no en git.

## Build y despliegue automático

Cada push a `main` dispara `.github/workflows/ftp-deploy.yml`, en dos jobs:

1. **Build** — no hay nada que compilar (el sitio es un único HTML
   autocontenido, sin bundler), pero el job arma en `dist/` exactamente lo
   que debe quedar público: `index.html`, `DXF/` y `LEEME.txt`. Deja afuera
   `README.md`, `.gitignore`, el propio workflow y `ciudad.html` (la versión
   recortada para pegar en el visor de Artifacts, no para publicar). El
   resultado queda además como artifact descargable del run, por si hace
   falta revisarlo sin esperar al FTP.
2. **Deploy** — toma ese `dist/` y lo sube por FTP.

Antes de que funcione, cargá estos secrets en **Settings → Secrets and
variables → Actions → New repository secret**:

| Secret            | Qué va ahí                                              |
|-------------------|----------------------------------------------------------|
| `FTP_SERVER`      | host del servidor FTP                                     |
| `FTP_USERNAME`    | usuario FTP                                               |
| `FTP_PASSWORD`    | contraseña FTP                                            |
| `FTP_SERVER_DIR`  | opcional — sólo si la cuenta FTP no debe subir a `public_html/` |

Sin `FTP_SERVER_DIR`, el workflow sube a `public_html/`, que es donde cPanel
sirve el dominio principal.

### Namecheap / cPanel

El hosting es cPanel en Namecheap. Para cargar `FTP_SERVER`, `FTP_USERNAME` y
`FTP_PASSWORD`:

1. Entrá a cPanel → **FTP Accounts**.
2. Si no existe ya una cuenta para esto, creá una dedicada (mejor que usar el
   login principal de cPanel) — en **Directory** dejala apuntando a
   `public_html` para que sólo pueda tocar el sitio.
3. El campo **FTP Server**/**Server** que muestra cPanel es el valor de
   `FTP_SERVER` (suele ser el hostname del servidor, no `ftp.tudominio.com`
   necesariamente — usá el que cPanel indique ahí).
4. Usuario y contraseña de esa cuenta van en `FTP_USERNAME` y `FTP_PASSWORD`.
5. Si al crear la cuenta el **Directory** ya quedó en `public_html` (o una
   subcarpeta de ahí), la cuenta nace "encerrada" en esa carpeta: en ese caso
   cargá el secret `FTP_SERVER_DIR` con el valor `./`, para no terminar
   subiendo a `public_html/public_html/`. Si el **Directory** quedó en la
   raíz de la cuenta de hosting, dejá `FTP_SERVER_DIR` sin crear.

Si después del primer deploy el sitio no aparece o aparece duplicado en una
subcarpeta, es señal de que hay que ajustar ese secret en un sentido o el
otro.

Para lanzar el despliegue sin esperar un push, andá a la pestaña **Actions**
del repositorio, elegí "Build y despliegue por FTP" y usá "Run workflow".

`ciudad.html` sigue siendo manual: se regenera con el mismo comando de
siempre y se commitea aparte, porque depende de coincidir de forma exacta con
la cabecera de `index.html` y no conviene correrlo sin supervisión en CI.
