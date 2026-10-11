# supabase

Proyecto local de Supabase CLI de LabÍA: esquema en `migrations/`, datos de prueba en `seed.sql` y tests de la base (pgTAP) en `tests/database/`.

## Requisitos

- Docker en marcha (Docker Desktop o equivalente).
- `pnpm install` (el CLI de Supabase viene como devDependency, se usa con `pnpm exec supabase`).

## Comandos

| Comando                     | Qué hace                                                                      |
| --------------------------- | ----------------------------------------------------------------------------- |
| `pnpm db:start`             | Levanta Supabase local (Postgres 17 + PostGIS, Auth, Storage, API).           |
| `pnpm db:reset`             | Recrea la base desde cero: aplica todas las migraciones y después `seed.sql`. |
| `pnpm db:test`              | Corre los tests SQL de `tests/database/` (`supabase test db`).                |
| `pnpm db:tipos`             | Regenera `src/lib/supabase/tipos.ts` desde la base local. Commitealo.         |
| `pnpm exec supabase status` | URL y claves locales (las de demo del CLI, no son secretos).                  |
| `pnpm exec supabase stop`   | Apaga la base local.                                                          |

Después de cada migración nueva: `pnpm db:reset`, `pnpm db:test` y `pnpm db:tipos`. La CI hace lo mismo
(job "Base de datos") y falla si los tipos commiteados no coinciden con las migraciones.

## Migraciones

- Una migración nueva por cambio: `pnpm exec supabase migration new <nombre_en_snake_case>`.
- **Nunca se edita una migración ya mergeada.**
- Los barrios (`20261011190100_barrios_mar_del_plata.sql`) son datos de referencia que necesita todo entorno, por eso
  van en una migración y no en el seed. Se generaron con `scripts/barrios.ts` (fuente: OpenStreetMap, ODbL).
- RLS está activado en todas las tablas. Las políticas y los buckets llegan en LAB-12; hasta entonces ninguna tabla
  es accesible por la API (solo con la service role).

## Datos de prueba (`seed.sql`)

Solo local y labia-dev, **nunca producción** (la CI de migraciones no aplica el seed). La contraseña de todas las
cuentas es `labia-prueba-1234`.

| Cuenta                    | Rol         | Notas                                        |
| ------------------------- | ----------- | -------------------------------------------- |
| `admin@labia.test`        | admin       | Promovido a mano en el seed                  |
| `cliente1@labia.test`     | cliente     | La Perla                                     |
| `cliente2@labia.test`     | cliente     | Punta Mogotes                                |
| `carpinteria@labia.test`  | profesional | Verificado                                   |
| `plomeria@labia.test`     | profesional | Verificado, toda la ciudad                   |
| `cerrajeria@labia.test`   | profesional | Verificado                                   |
| `gas@labia.test`          | profesional | Verificado, gasista matriculado (MP-4521)    |
| `pintura@labia.test`      | profesional | Verificado                                   |
| `mecanica@labia.test`     | profesional | Verificado                                   |
| `electricidad@labia.test` | profesional | Verificado                                   |
| `multioficio@labia.test`  | profesional | Verificado, plomería y electricidad          |
| `pendiente@labia.test`    | profesional | Gasista con verificación pendiente (no sale) |

Más 5 trabajos abiertos, 3 postulaciones, 4 contactos y 4 reseñas. Los documentos de verificación apuntan a rutas
ficticias: no hay archivos en Storage.

## Modelo en una mirada

`barrios` (centro `geography(Point,4326)`) · `usuarios` (1 fila por cuenta de `auth.users`, un solo rol) ·
`perfiles_profesionales` · `verificaciones` · `trabajos` · `postulaciones` · `contactos` · `resenas` · `reportes`.

- `al_crear_usuario` (trigger sobre `auth.users`): crea el `usuarios`; solo acepta `profesional` desde la metadata,
  nunca `admin`.
- `publicado` en `perfiles_profesionales` lo calcula un trigger (identidad + antecedentes + matrícula si es gas +
  cuenta activa); no se puede forzar.
- `promedio` y `cantidad_resenas` se recalculan al insertar, editar o borrar reseñas.
- `distancia_km(barrio_a, barrio_b)`: distancia entre centros de barrio en km con una decimal. Nunca se guarda la
  dirección exacta.
