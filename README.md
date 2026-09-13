# Remote & Partners

Ciudad isométrica interactiva hecha con **Vite y JavaScript nativo**. El hosting
recibe archivos estáticos: no necesita Node ni un servidor de aplicaciones.

## Desarrollo local

Usar Node 24 (el mismo que CI), o Node 22.13+.

```sh
npm ci
npm run dev
```

Vite muestra la URL local. Para comprobar el resultado que se publicaría:

```sh
npm run check
npm run preview
```

`check` ejecuta el análisis de código, genera `dist/` y prueba las interacciones
del sitio compilado en un DOM simulado. Las pruebas comprueban navegación,
idiomas, controles de sonido, planos, BIM, territorio, contacto, movimiento
reducido y capturas. No miden FPS ni sustituyen una revisión visual en un navegador.

## Archivos

- `index.html`: documento, metadatos y estructura del sitio.
- `src/content.js`: textos en español/inglés, equipo, contacto y distritos.
- `src/geometry.js`: geometría de la ciudad, planos y modelo BIM.
- `src/app.js`: navegación, cámara y visores.
- `src/motion.js`: planificación de fotogramas y actualización de transforms.
- `src/site.css`: estilos y aspectos existentes.
- `src/assets/`: retratos, favicon y fuentes. Vite genera nombres con hash.
- `public/DXF/`: planos descargables; conservan las URLs `/DXF/...`.
- `public/licenses/`: licencias de las fuentes del sitio.
- `dist/`: salida generada, excluida de Git.

Las fuentes Metropolis existentes se convirtieron de OTF a WOFF2 conservando
sus glifos. Los subconjuntos de IBM Plex Mono provienen del CSS original de
Google Fonts, con sus rangos Unicode; ahora se sirven localmente. Los retratos
conservan los archivos originales y se solicitan cuando se abre su contenido.

## Artifact autocontenido

`ciudad.html` conserva la variante para pegar en el visor de Artifacts de Claude.
Se genera desde las mismas fuentes, con JavaScript, imágenes y fuentes incrustados:

```sh
npm run artifact
```

No editarlo a mano. Regenerarlo al modificar `src/` y commitearlo junto al cambio.
No forma parte de `dist/` ni del sitio publicado.

## Capturas

Se mantienen `?shot=city`, `plan`, `flat`, `bim`, `typo`, `map` y `rings`.
`?shot=city&look=bw` cambia el aspecto y `?shot=flat&sheet=0` elige la lámina
(índices de 0 a 3). El resto de las visitas conserva la interfaz normal.

## Despliegue por FTP

**Cada push a `main` publica en el dominio real. Requiere permiso explícito del
usuario para ese push, según `AGENTS.md`.** Los cambios se dejan commiteados
localmente hasta tener esa autorización.

El workflow `.github/workflows/ftp-deploy.yml` instala dependencias con `npm ci`,
ejecuta `npm run check` y sube **todo `dist/`** por FTP. No subir el `index.html`
fuente por separado: depende de los assets que genera Vite.

Los secrets permanecen en el entorno **CPanel Variables**:

| Secret | Valor |
| --- | --- |
| `FTP_SERVER` | Host del servidor FTP de cPanel |
| `FTP_USERNAME` | Usuario FTP |
| `FTP_PASSWORD` | Contraseña FTP |
| `FTP_SERVER_DIR` | Opcional; por defecto `public_html/` |

Si la cuenta FTP ya está encerrada en `public_html`, usar `./` como
`FTP_SERVER_DIR`. El workflow también admite ejecución manual, que igualmente
publica y requiere autorización. `RESPALDO/` sigue fuera de Git.

Ver [PERFORMANCE.md](PERFORMANCE.md) para el alcance y los resultados de la refactorización.
