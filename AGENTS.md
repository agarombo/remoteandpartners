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
