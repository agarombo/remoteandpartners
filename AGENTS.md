# Instrucciones para agentes

## Nunca subir a GitHub sin permiso explícito, cada vez

No hagas `git push` —ni ninguna otra acción que publique algo en el
remoto de GitHub: crear o mover un tag, publicar un release, disparar
manualmente un workflow que despliegue— sin que el usuario lo pida de
forma explícita, en ese momento puntual. Una aprobación anterior no
alcanza para el próximo push: preguntá siempre antes de publicar.

Sí está permitido trabajar libremente en el árbol de trabajo local:
editar archivos, `git add`, `git commit`. Eso queda en la máquina y no
se publica en ningún lado, así que no hace falta permiso para eso.

Cuando termines un cambio, dejalo commiteado localmente y avisá que
está listo para subir — sin subirlo — hasta que el usuario confirme.

**Por qué:** el despliegue de este repositorio dispara un GitHub Action
que sube el sitio al hosting por FTP en cada push a `main`. Un push
hecho de más publica en el dominio real (remoteandpartners.com) sin que
el usuario haya decidido que ese cambio ya está listo para eso.

## Rendimiento: preservar la experiencia y comprobar cada motor

El sitio ya usa Vite y JavaScript nativo. Cambiar de framework o reducir el
bundle por sí solo no resuelve el costo de dibujar la ciudad SVG. Antes de
otra refactorización, reproducí el recorrido que falla y distinguí carga,
trabajo de JavaScript, layout, pintura y composición. Conservá contenido,
geometría, aspectos, idiomas, navegación, teclado/touch, formularios, planos,
BIM, territorio, capturas y descargas DXF. Eliminá código solamente después
de comprobar que no participa en esos flujos, incluidos los imports diferidos.

### Lo aprendido en Chrome y Safari

- Chrome dejó de parpadear al mover una capa HTML con `translate3d` y escala,
  manteniendo fijo el transform del SVG durante el viaje y actualizándolo al
  aterrizar. Preservá ese comportamiento al corregir otros navegadores.
- No alternes el culling de islas durante un zoom. Mantené la escena disponible
  durante el viaje y ocultá lo que queda fuera de pantalla al terminar.
  El blur vivo detrás de paneles deslizantes y los cambios de filtros sobre
  geometría en movimiento provocaron repintados costosos; evitá reintroducirlos.
- Safari/WebKit no se comporta igual que Chrome con SVG complejos y filtros,
  incluso dentro de una capa HTML. `will-change` o una prueba en Chrome no
  demuestran que Safari sea fluido. Probá ambos motores por separado.
- Una caché de renderizado debe corresponder al contenido y estado visibles.
  Contemplá cambios de modo/clases del body, contenido diferido, selección, idioma,
  aspecto, planos/BIM y tamaño de pantalla; el transform de cámara por sí
  solo no debe invalidar el dibujo y generar capturas continuamente.
- No estires una única captura de toda la ciudad para un primer plano. Su
  resolución debe contemplar la escala de destino y el DPR; un recorte de
  detalle permite conservar definición sin rasterizar todo a tamaño enorme.
  Limitá píxeles/memoria y liberá canvases y Blob URLs al reemplazarlos.
- La preparación de caché no debe causar pausas repetidas ni imágenes viejas.
  Medí también captura, decodificación y entrega al SVG. El SVG nítido debe
  volver al terminar el zoom, sin segundos adicionales de convergencia de
  cámara. Conservá la interacción durante el viaje y cancelá preparaciones
  obsoletas al navegar, redimensionar o activar movimiento reducido.
- No leas layout/estilos de miles de nodos en cada frame. Reutilizá geometría,
  estilos y módulos; usá un único scheduler y pausá trabajo decorativo cuando
  no aporte a la vista. Si una adaptación elimina movimiento decorativo,
  documentala y no elimines lógica funcional con ese pretexto.
- Mantené baratos los eventos frecuentes: hover, movimiento del puntero y
  scroll no deben disparar serialización de escenas, decodificación de imágenes
  ni reconstrucciones completas. Separá estado transitorio de interacción del
  contenido que invalida una caché; medí la respuesta real al puntero.

### Verificación de cambios de animación

Cuando el usuario haya autorizado pruebas de navegador, incluí Chrome y
WebKit, escritorio y móvil, movimiento normal y reducido, y DPR alto. La
autorización ya dada en una sesión sigue vigente para completar ese trabajo.

Comprobá transiciones en ambas direcciones, cambios de contenido durante la
animación y navegación/redimensionado rápidos. El zoom debe conservar definición
y las zonas de clic deben corresponder al dibujo visible. No esperes siempre
a que termine la caché antes de probar una interacción: también probá clics
durante su preparación y el movimiento.

Separá pruebas funcionales de pruebas visuales/de rendimiento. Que los botones
funcionen, que el SVG no cambie o que exista un canvas no prueba fluidez, calidad
ni contenido correcto. Revisá frames intermedios, pausas y el paso de caché a
SVG. Una emulación móvil no equivale a un dispositivo físico; Playwright
WebKit no equivale exactamente a la versión de Safari del usuario. No declares
resuelto un problema de Safari basándote solamente en Chrome o en tests de DOM.

Ejecutá las comprobaciones apropiadas del proyecto (`npm run check`, pruebas
de navegador autorizadas) y regenerá `ciudad.html` con `npm run artifact` cuando
cambie `src/`. Registrá resultados y límites en `PERFORMANCE.md`, identificando
versión, motor, viewport/DPR y qué se midió realmente. No atribuyas mediciones
de una versión intermedia a cambios posteriores sin volver a medirlos.
