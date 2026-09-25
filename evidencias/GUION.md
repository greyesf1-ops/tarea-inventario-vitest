# Guion del video (máximo 3 minutos)

0:00-0:25: presentar el repositorio y el problema: registrar productos y retirar unidades sin permitir stock negativo; mostrar reglas del README.

0:25-1:00: mostrar PostgreSQL y la API funcionando. Registrar un producto con cinco unidades, consultarlo, retirar cinco y demostrar el rechazo al retirar otra unidad.

1:00-1:30: abrir tests/unit/inventory.test.ts. Explicar Arrange–Act–Assert del stock cero y el rechazo de stock negativo. Mostrar npm run test:unit y su resultado real.

1:30-2:10: abrir tests/integration/postgres.test.ts. Mostrar PostgreSqlContainer, getConnectionUri, migrate, TRUNCATE, pool.end y container.stop. Explicar la escritura/lectura y el rechazo de SKU duplicado. Mostrar el resultado real de npm run test:integration.

2:10-2:45: mostrar GitHub Actions del commit entregado, sus pasos unitarios y de integración exitosos. Explicar push/pull_request, npm ci y vitest run.

2:45-2:55: mostrar enlaces del repositorio, ejecución y video en el PDF. Verificar que el docente tenga acceso.

No mostrar .env, tokens, gestores de credenciales ni datos ajenos a esta tarea.
