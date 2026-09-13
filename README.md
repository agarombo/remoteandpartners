# Remote & Partners — sitio web

`index.html` es el sitio completo, autocontenido: la ciudad isométrica navegable
de remoteandpartners.com. `ciudad.html` es una variante recortada (sin
`<head>`/metadatos) pensada sólo para pegarla en el visor de Artifacts de
Claude; no forma parte del sitio publicado.

`DXF/` son los planos exportados para editar en AutoCAD. `RESPALDO/` queda
fuera del repositorio a propósito (ver `.gitignore`): son decenas de copias
completas del sitio en distintos momentos, y viven en Google Drive, no en git.

## Despliegue automático

Cada push a `main` dispara `.github/workflows/ftp-deploy.yml`, que sube el
contenido del repositorio al servidor por FTP.

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
del repositorio, elegí "Deploy por FTP" y usá "Run workflow".
