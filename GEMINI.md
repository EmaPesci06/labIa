# GEMINI.md · LabÍA

Contexto para Gemini CLI cuando sigue el desarrollo de LabÍA en lugar de Claude Code. `AGENTS.md` (cargado junto con
este archivo por `.gemini/settings.json`) tiene el producto, el stack, las convenciones y la definición de terminado.
Este archivo agrega **cómo trabajar** y **dónde quedó todo**.

## Fuentes de verdad (leelas antes de tocar código)

1. Linear: equipo `LAB`, proyecto **LabÍA MVP**. Guía para agentes (documento `ee4f4689-09c5-43b1-9acc-ab1aa21addab`).
   Si no tenés acceso a Linear, pedile a Emanuel el texto de la tarea.
2. `.claude/labia/protocolo.md`: protocolo común (estados de Linear, ramas, PR, HANDOFF, trabajo en paralelo).
3. `.claude/agents/labia-*.md`: instrucciones de cada rol. Usalas como checklist de cada fase (ver abajo).
4. `docs/prototipo/` (empezá por su `README.md`): toda pantalla se construye igual al prototipo, con tokens, nunca hex sueltos.
5. Estado del proyecto al momento del traspaso: @.gemini/estado.md

## Flujo por tarea (sin subagentes: hacés las fases vos, en orden)

Claude Code orquestaba un agente por rol. Vos hacés las mismas fases en secuencia; en cada una, releé el archivo del rol
y cumplilo como si fueras ese agente. No te saltees fases ni te apruebes en la misma pasada en que construiste.

1. **Construir** (`.claude/agents/labia-fullstack.md`; para SQL puro `labia-db.md`, para diseño `labia-ui.md`,
   para infra `labia-infra.md`). Verificá que los `blockedBy` estén en Done. Rama `lab-<n>-<slug>` desde `origin/main`.
2. **Seguridad** (`labia-seguridad.md`) si la tarea tiene etiqueta Seguridad o Base de datos, o toca migraciones, RLS,
   Storage, auth, `/admin`, la service role o datos personales. Leé el diff completo como revisor externo.
3. **E2E** (`labia-e2e.md`) si agrega o cambia un flujo de usuario: Playwright a 390 y 1440, claro y oscuro, teclado y axe.
4. **Revisión** (`labia-revisor.md`) contra la definición de terminado y el prototipo.
5. **Integración** (`labia-integrador.md`): actualizar con `main`, CI en verde, `gh pr merge <n> --squash`, tarea en Done.
   Emanuel dio autorización permanente para mergear lo que pase las fases 2 a 4. Mergeá de a un PR por vez.

Si una fase encuentra problemas, volvé a la 1, corregí y repetí desde la fase que falló. Máximo 3 vueltas; después
frená y preguntale a Emanuel.

## Lecciones aprendidas (no las repitas)

- **Docker no levanta en esta máquina.** No hay Supabase local: los tests pgTAP los corre la CI (job "Base de datos").
  `src/lib/supabase/tipos.ts` se edita a mano, en el orden alfabético del CLI, y la CI lo valida con
  "Los tipos generados coinciden". Nunca `supabase db reset` sobre una base compartida.
- **Migraciones:** el timestamp tiene que ser posterior a la última de `main` y de los PR abiertos. Si entra otra antes,
  renombrá la tuya (mismo SQL) antes del merge. Nunca edites una migración ya mergeada.
- **Políticas redefinidas:** si hacés `create or replace` de una función o `drop/create policy` que ya existe (por ejemplo
  `usuarios_proteger_columnas`, `documentos_subir_propios`, `registrar_documento`, `privado.es_admin`), partí de la
  versión vigente en `main` y conservá todas sus condiciones.
- **pgTAP:** llamá a `tests.como(...)` antes de `set local role` o hacé `reset role` antes; `throws_ok` con 4 argumentos
  (sql, código, mensaje, descripción); ajustá `plan(n)` al número real de asserts; sumá tablas nuevas a `esquema.test.sql`.
- **E2E sin base:** `tests/e2e/apoyo/supabase-falso.cjs` es un Supabase falso. Build con
  `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con cualquier valor; correr con
  `LABIA_E2E_SUPABASE_FALSO=1`. El falso se levanta a mano (`node tests/e2e/apoyo/supabase-falso.cjs`).
- **Procesos:** matá solo los PID de tus puertos. Nunca `taskkill /IM node.exe` ni `pkill -f playwright`.
- **Rutas en Windows:** usá `C:/Users/WIN-10/Desktop/labia` con "Desktop" en mayúscula; con minúscula git falla en worktrees.
- **Formato:** `pnpm format:check` es parte de la CI; corré `pnpm exec prettier --write` sobre lo que tocaste.
- **Accesibilidad que ya falló:** ids duplicados cuando un bloque se renderiza dos veces (celular y escritorio: usá
  `useId`), `<dl>` con wrappers inválidos, foco que no vuelve al botón al cerrar una hoja (Radix necesita
  `Dialog.Trigger` u `onCloseAutoFocus`), táctiles de menos de 44 px.
- **Seguridad que ya falló:** grants de `insert`/`update` directos que saltean la RPC security definer; helpers `privado`
  sin `revoke execute ... from public, anon`; `es_admin()` sin chequear cuenta activa; políticas de Storage que dejan
  leer al admin con su JWT (solo URLs firmadas de 60 s desde el servidor).

## Comandos

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # antes de cada push
gh pr checks <n> --watch                                  # esperar la CI
gh pr merge <n> --squash                                  # solo después de seguridad, e2e y revisión
```

Commits en español. Al final del commit: `Co-Authored-By: Gemini <noreply@google.com>`.
