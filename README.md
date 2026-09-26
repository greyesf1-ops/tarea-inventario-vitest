# Inventario con TypeScript, PostgreSQL y pruebas automatizadas

[![Pruebas de inventario](https://github.com/greyesf1-ops/tarea-inventario-vitest/actions/workflows/tests.yml/badge.svg)](https://github.com/greyesf1-ops/tarea-inventario-vitest/actions/workflows/tests.yml)

- [Código público](https://github.com/greyesf1-ops/tarea-inventario-vitest)
- [Ejecuciones de GitHub Actions](https://github.com/greyesf1-ops/tarea-inventario-vitest/actions/workflows/tests.yml)
- [Entrega: PDF, video y evidencias](https://github.com/greyesf1-ops/tarea-inventario-vitest/releases/tag/entrega-v1)

API para registrar productos, consultar existencias y retirar unidades. La lógica de validación está en `src/domain.ts`; el acceso SQL real está en `src/repository.ts`. El transporte HTTP usa el servidor nativo de Node.js.

## Reglas

- SKU único: de 1 a 30 caracteres, mayúsculas, números y guiones.
- Nombre: de 1 a 100 caracteres después de eliminar espacios exteriores.
- Stock: entero de 0 a 1 000 000; cero y el máximo son válidos.
- Retiro: entero de 1 a 1 000 000. El producto debe existir y tener suficientes unidades.
- Retirar exactamente las existencias deja stock cero. Un retiro superior se rechaza con HTTP 409.
- Una actualización SQL atómica evita sobreventa en retiros concurrentes. PostgreSQL también impone SKU único y stock no negativo.

## Ejecutar localmente

Requisitos: Node.js 22, npm y Docker con contenedores Linux funcionando. En Windows, iniciar Docker Desktop antes de las pruebas de integración.

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d --wait
npm run migrate
npm run dev
```

En Linux/macOS usar `cp .env.example .env`. El puerto local de PostgreSQL es 5433 y el de la API 3001. Las credenciales incluidas son exclusivamente ejemplos locales. No subir `.env`.

También se puede ejecutar `npm run build` y luego `npm start`. Las migraciones SQL se guardan en `migrations/`; el ejecutor registra las aplicadas en `schema_migrations`, usa una transacción y admite ejecuciones repetidas.

## Demostración de la API (PowerShell, otra terminal)

```powershell
$base = 'http://localhost:3001'
$producto = Invoke-RestMethod "$base/products" -Method Post -ContentType 'application/json' -Body '{"sku":"CUAD-01","name":"Cuaderno","stock":5}'
$producto
Invoke-RestMethod "$base/products"
Invoke-RestMethod "$base/products/$($producto.id)/withdrawals" -Method Post -ContentType 'application/json' -Body '{"quantity":5}'
# Rechazo esperado: HTTP 409, stock insuficiente
Invoke-RestMethod "$base/products/$($producto.id)/withdrawals" -Method Post -ContentType 'application/json' -Body '{"quantity":1}'
```

| Operación | Ruta | Resultado |
| --- | --- | --- |
| Registrar | POST /products | 201, producto persistido |
| Consultar | GET /products | 200, lista de productos |
| Retirar | POST /products/:id/withdrawals | 200, existencias actualizadas |

Errores: 400 para entrada inválida, 404 para producto o ruta inexistente, 409 para SKU repetido o existencias insuficientes. La API es una demostración local sin autenticación.

## Pruebas

```powershell
npm run test:unit
npm run test:integration
npm test
npm run build
```

Ambas suites usan `vitest run`, terminan automáticamente y propagan errores. Las unitarias no requieren Docker ni PostgreSQL: verifican validaciones, límites y que el servicio no persista datos inválidos. El único doble sustituye la frontera de persistencia del servicio.

Las pruebas de integración arrancan `postgres:16-alpine` mediante `PostgreSqlContainer`. Obtienen la conexión con `getConnectionUri()`, aplican las mismas migraciones y ejecutan `PgProductRepository` y la API reales. Comprueban escritura/lectura, unicidad, CHECK de stock, retiro al límite, concurrencia, producto inexistente y migraciones repetibles.

Antes de cada caso se ejecuta `TRUNCATE products RESTART IDENTITY`. Los casos no son concurrentes entre sí; el caso de retiros concurrentes sí ejecuta dos operaciones en paralelo intencionalmente. Al finalizar se cierran servidor HTTP, pool y contenedor, incluso ante errores.

### Separación de bases

La aplicación usa `DATABASE_URL` de `.env` y conserva datos en el volumen de Compose. La integración **no lee esa variable**: usa exclusivamente el URI y puerto aleatorio del contenedor nuevo de Testcontainers. No necesita iniciar Compose. No existe fallback a una base de desarrollo, SQLite o repositorio simulado.

## GitHub Actions

`.github/workflows/tests.yml` se ejecuta en `push` y `pull_request`, sobre `ubuntu-latest`, que dispone de Docker. Instala Node.js 22 y dependencias con `npm ci`, compila y ejecuta ambas suites en pasos separados. No usa un servicio PostgreSQL del workflow ni ignora errores. Se puede repetir una ejecución desde la pestaña Actions o creando un commit nuevo.

## Entrega

El PDF y el video se publican como archivos descargables en la release `entrega-v1`. El PDF identifica el commit y la ejecución exactos de las evidencias. El video graba un navegador real que envía peticiones a la API y muestra extractos de logs reales; incluye narración sintética en español y una captura de GitHub Actions. No es una grabación del escritorio personal ni utiliza respuestas simuladas.

El workflow conserva las capturas, logs completos, respuestas JSON y grabación original en el artefacto `evidencias-inventario`. `scripts/record-demo.mjs` produce esa demostración contra la API levantada con PostgreSQL de Compose, después de ejecutar las pruebas. La integración continúa usando exclusivamente Testcontainers.

Validación local: compilación y 31 pruebas unitarias aprobadas. La integración local requiere instalar/iniciar Docker; en el equipo de preparación no había motor de contenedores. Las 8 pruebas de integración y la demostración con PostgreSQL se verificaron en el runner Linux de GitHub Actions. Consultar `evidencias/ESTADO.md`.
