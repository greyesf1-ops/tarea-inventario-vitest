# Estado de verificación

## Comprobado en este equipo

- `npm install`: dependencias instaladas y `package-lock.json` generado.
- `npm run build`: compilación TypeScript exitosa.
- `npm run test:unit`: 31 pruebas aprobadas.

## Comprobado en GitHub Actions

- Repositorio público: https://github.com/greyesf1-ops/tarea-inventario-vitest
- Compilación, 31 pruebas unitarias y 8 pruebas de integración con PostgreSQL real aprobadas.
- Ejecución inicial: https://github.com/greyesf1-ops/tarea-inventario-vitest/actions/runs/36206734733
- Segunda ejecución, con API grabada: https://github.com/greyesf1-ops/tarea-inventario-vitest/actions/runs/36206888678
- La API de demostración registró y consultó un producto, retiró todo el stock y devolvió HTTP 409 al intentar retirar una unidad adicional. Las respuestas se validan automáticamente durante la grabación.
- El PDF final identifica la ejecución de la versión entregada. Archivos: https://github.com/greyesf1-ops/tarea-inventario-vitest/releases/tag/entrega-v1

## Límite de la verificación local

`npm run test:integration` se intentó localmente y falló en la preparación con `Could not find a working container runtime strategy`: no había Docker disponible. Los ocho casos sí se ejecutaron y aprobaron en GitHub Actions. Para repetirlos localmente se necesita Docker con contenedores Linux en funcionamiento.

La grabación corresponde a un navegador automatizado en el runner y a la API real; la voz explicativa es sintética. Los logs completos y las respuestas HTTP se conservan como evidencia, sin secretos.
