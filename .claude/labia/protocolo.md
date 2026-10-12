# Protocolo común de los agentes de LabÍA

Todos los agentes `labia-*` siguen este protocolo. Si una tarea de Linear lo contradice, manda la tarea.

## Fuentes de verdad

- **Linear**, equipo `LAB`, proyecto **LabÍA MVP** (`P-LAB-1`).
- **Guía para agentes** (documento de Linear `ee4f4689-09c5-43b1-9acc-ab1aa21addab`): stack, estructura, convenciones, diseño (§5), modelo de datos (§6), seguridad (§7), definición de terminado (§8), olas (§9). Leela con `mcp__claude_ai_Linear__get_document` antes de tocar código.
- **Prototipo de interfaz** en `docs/prototipo/` (leé primero su `README.md`): copia del canvas "LabÍA · Prototipo MVP". Toda pantalla y componente se construye igual a su pantalla del prototipo, usando los tokens (nunca hex sueltos).
- `AGENTS.md` en la raíz del repo (existe desde LAB-8): resumen de la guía.
- Repo: `github.com/EmaPesci06/labIa`, rama por defecto `main`. `gh` ya está autenticado como EmaPesci06.

Las herramientas de Linear son diferidas: cargalas con `ToolSearch` (`select:mcp__claude_ai_Linear__get_issue,mcp__claude_ai_Linear__save_issue,mcp__claude_ai_Linear__save_comment,mcp__claude_ai_Linear__get_document,mcp__claude_ai_Linear__list_comments`) antes de usarlas.

## Estados de Linear

| Momento | Estado | Quién lo cambia |
|---|---|---|
| Arranca la tarea | `In Progress` | Agente constructor |
| PR abierto y DoD cumplida | `In Review` | Agente constructor (**obligatorio**) |
| PR mergeado | `Done` | `labia-revisor` |
| Revisión rechazada | vuelve a `In Progress` con comentario | `labia-revisor` |

Se cambia con `mcp__claude_ai_Linear__save_issue` (`id: "LAB-n"`, `state: "In Review"`).

## Recorrido de cada tarea

```
constructor (labia-infra | labia-db | labia-ui | labia-fullstack)  → In Review
  → labia-seguridad   si la tarea es de Seguridad o Base de datos (APROBADO / BLOQUEADO)
  → labia-e2e         si agrega un flujo de usuario
  → labia-revisor     siempre al final: squash-merge + Done, o cambios + In Progress
```

Solo `labia-revisor` mergea a `main`. Lo orquesta la sesión principal con `/labia-tarea`.

## Antes de empezar (constructores)

1. `get_issue` con `includeRelations: true`. Si algún `blockedBy` no está en `Done`, **no arranques**: devolvé "BLOQUEADA por LAB-x" y terminá.
2. Pasá la tarea a `In Progress`.
3. Rama: `lab-<n>-<slug>` desde `origin/main` actualizado (`git fetch origin && git switch -c lab-<n>-<slug> origin/main`). Si ya estás en un worktree aislado, creá la rama ahí.

## Al terminar (constructores)

1. Verificá la definición de terminado (Guía §8): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` en verde (y `pnpm test:e2e` si la tarea toca flujos). Pegá el resultado real; si algo falla, decilo, no lo escondas.
2. Commits chicos, en español, terminando con:
   `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
3. `git push -u origin <rama>` y `gh pr create --base main --title "LAB-n: <título>"`. El cuerpo lleva: resumen, antes/después, cómo probar, criterios de aceptación tildados, decisiones no escritas en la tarea, y al final:
   `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
4. En Linear: adjuntá el PR (`save_issue` con `links: [{url, title}]`), comentá un resumen corto (qué se hizo, decisiones, lo que quedó afuera) y **pasá la tarea a `In Review`**.
5. Devolvé al orquestador un HANDOFF:

```
## HANDOFF: <agente> -> labia-revisor
Tarea: LAB-n · PR: <url> · Rama: <rama>
Hecho: …
Archivos clave: …
Verificación: lint ✓/✗ · typecheck ✓/✗ · test ✓/✗ · build ✓/✗ · e2e ✓/✗/n.a.
Toca seguridad/datos: sí/no (por qué)
Agrega flujo de usuario: sí/no
Pendiente / dudas: …
```

## Reglas para el trabajo en paralelo

- No toques archivos de otra tarea abierta, salvo los compartidos (`globals.css`, `tipos.ts`, `metricas.ts`). En esos, cambios chicos y rebase antes del merge.
- Migraciones: nunca edites una ya mergeada. Si otra migración entró antes que la tuya con timestamp posterior, renombrá la tuya y regenerá los tipos.
- Nunca leas ni imprimas los valores de `.env.local` o `.env.ci.local`. Nunca commitees secretos.
- Sin `console.log`, sin `any`, interfaz en español rioplatense con voseo.
- Si necesitás algo que solo Emanuel puede hacer (cuentas, claves, pagos), comentalo en la tarea de Linear y seguí con lo que puedas sin eso.
