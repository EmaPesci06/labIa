# GEMINI.md · LabÍA

Contexto para Gemini cuando orquesta el desarrollo de LabÍA **a la par** de Claude Code. `AGENTS.md` (cargado junto con
este archivo por `.gemini/settings.json`) tiene el producto, el stack, las convenciones y la definición de terminado.
Este archivo agrega **cómo trabajar** y **dónde quedó todo**.

## Fuentes de verdad (leelas antes de tocar código)

1. Linear: equipo `LAB`, proyecto **LabÍA MVP**. Guía para agentes (documento `ee4f4689-09c5-43b1-9acc-ab1aa21addab`).
   Si no tenés acceso a Linear, pedile a Emanuel el texto de la tarea.
2. `.claude/labia/protocolo.md`: protocolo común (estados de Linear, ramas, PR, HANDOFF, trabajo en paralelo).
3. `.claude/agents/labia-*.md`: instrucciones de cada rol. Usalas como checklist de cada fase (ver abajo).
4. `docs/prototipo/` (empezá por su `README.md`): toda pantalla se construye igual al prototipo, con tokens, nunca hex sueltos.
5. Estado, contexto y decisiones del proyecto (documento único de traspaso): @docs/traspaso-agentes.md

## Flujo por tarea (orquestás subagentes)

Hay dos orquestadores: Claude Code y vos. El reparto y las reglas para no pisarse están en la sección
"Dos orquestadores" de `.claude/labia/protocolo.md`. Lo esencial:

- Tomás solo las tareas de Linear con la etiqueta **`Orq: Gemini`**. Las de `Orq: Fable` son de Claude.
- No construís ni revisás vos: lanzás un subagente por fase. Están en `.agents/plugins/labia/agents/` y usan las
  mismas instrucciones que los de Claude (`.claude/agents/labia-*.md`).
- El recorrido completo está en la skill `labia-tarea` (`.agents/skills/labia-tarea/SKILL.md`): constructor →
  `labia-seguridad` → `labia-e2e` → `labia-revisor` → `labia-integrador`.
- Cada tarea en su worktree y su rama. Se mergea de a un PR por vez. Solo una tarea abierta a la vez toca
  `package.json` y `pnpm-lock.yaml`.
- Nunca revisa el mismo subagente que construyó. Máximo 3 vueltas de corrección; después frená y preguntale a Emanuel.

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
- **Secreto del limitador en e2e:** los servidores de `playwright.config.ts` corren con `NODE_ENV=production`, así que
  el limitador exige `RATE_LIMIT_SECRET`. No hace falta cargarla: el config pone un valor de prueba
  (`secreto-falso-solo-para-e2e-de-prueba`) salvo que la shell ya tenga una. Con `reuseExistingServer` (un servidor ya levantado)
  el config no interviene: ese servidor tiene que tener su propia `RATE_LIMIT_SECRET`.
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
