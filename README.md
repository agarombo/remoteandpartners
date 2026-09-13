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
| `FTP_SERVER`      | host del servidor FTP (ej. `ftp.remoteandpartners.com`)   |
| `FTP_USERNAME`    | usuario FTP                                               |
| `FTP_PASSWORD`    | contraseña FTP                                            |
| `FTP_SERVER_DIR`  | opcional — carpeta remota si no es la raíz (ej. `public_html/`) |

Sin `FTP_SERVER_DIR`, el workflow sube todo a la raíz de la cuenta FTP.

Para lanzar el despliegue sin esperar un push, andá a la pestaña **Actions**
del repositorio, elegí "Build y despliegue por FTP" y usá "Run workflow".

`ciudad.html` sigue siendo manual: se regenera con el mismo comando de
siempre y se commitea aparte, porque depende de coincidir de forma exacta con
la cabecera de `index.html` y no conviene correrlo sin supervisión en CI.
