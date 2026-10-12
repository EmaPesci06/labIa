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
- RLS está activado en todas las tablas y las políticas y los buckets están en LAB-12
  (`20261011200000_politicas.sql`, `20261011200100_storage.sql`). Ver "Seguridad" más abajo.
- **Toda tabla o vista nueva en `public` empieza con `revoke all ... from anon, authenticated`** y después un `grant`
  mínimo: Supabase da ALL a esos roles por defecto.

## Datos de prueba (`seed.sql`)

Solo local y CI; **nunca en un proyecto remoto** (labia-dev, preview ni producción; la CI de migraciones no aplica el seed). La contraseña de todas las
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

Si alguna vez se activa Supabase Branching, hay que desactivar el seed en los branches de preview. En un proyecto remoto el admin se promueve a mano (con la service role), nunca con una clave fija.

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

## Seguridad (LAB-12)

Tests: `supabase/tests/database/politicas.test.sql` (permitido y denegado por tabla y por rol: anon, cliente,
profesional, dueño y admin; permisos de funciones y columnas; buckets y políticas de Storage).

- **Permisos por columna.** `anon` solo lee `barrios`, `perfiles_profesionales`, `resenas` y `usuarios_publicos`.
  `authenticated` escribe solo columnas puntuales; nunca `usuarios.rol`, `whatsapp`, `normas_*`, ni `publicado`,
  `promedio`, `cantidad_resenas`, `prioridad` de los perfiles. Las insignias las edita un admin (un trigger lo exige).
- **Helpers** (`es_admin()`, `rol_actual()`, `cuenta_activa()` y otros) en el esquema `privado`, que la API no expone.
  `recalcular_resenas_de` también vive ahí, así que ya no sale como RPC en `tipos.ts`.
- **WhatsApp y normas** se escriben solo con las funciones `actualizar_whatsapp(text)` y `aceptar_normas(text)`.
- **Vistas.** `usuarios_publicos` (nombre, inicial del apellido, barrio y foto; sin `whatsapp`) y `mis_verificaciones`
  (el estado de mis documentos, sin `storage_path`). Son vistas con los privilegios del dueño a propósito: el `where`
  acota las filas.
- **Verificaciones.** El dueño inserta y no lee la tabla (usa `mis_verificaciones`). Con supabase-js hay que insertar
  sin `.select()`: un `INSERT ... RETURNING` necesitaría una política de lectura que el dueño no tiene.
- **Storage.** `fotos` público (3 MB; jpeg, png, webp): el dueño sube y borra en `perfiles/<uid>/`,
  `trabajos-hechos/<uid>/` o `trabajos/<trabajo_id>/`. `documentos` privado (8 MB; jpeg, png, pdf): el dueño solo
  inserta `<uid>/<tipo>-<timestamp>.<ext>`; lee un admin y la URL firmada de 60 s la genera `firmarDocumento`
  (`src/lib/supabase/admin.ts`).
- Un usuario `suspendida` no puede crear nada (trabajos, postulaciones, contactos, reseñas, reportes, archivos).
