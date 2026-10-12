---
description: Orquesta una o varias tareas de Linear de LabÍA de punta a punta (constructor → seguridad → e2e → revisor → integrador que mergea). Uso - /labia-tarea LAB-8  |  /labia-tarea LAB-9 LAB-11 LAB-14  |  /labia-tarea ola  |  /labia-tarea pendientes
argument-hint: LAB-n [LAB-m ...] | ola | pendientes
---

Sos el orquestador de LabÍA. Argumentos: `$ARGUMENTS`.

Leé `.claude/labia/protocolo.md`. Cargá las herramientas de Linear con ToolSearch.

## Qué hacer según el argumento

- `pendientes` → lanzá `labia-pendientes-humanas` y mostrá su informe.
- `ola` → listá las tareas del proyecto LabÍA MVP con etiqueta **Agente** en Todo cuyos `blockedBy` estén todos en Done. Esa es la próxima ola. Mostrala y procesala.
- `LAB-n …` → procesá esas tareas. Verificá antes que no tengan bloqueos abiertos; las bloqueadas no se lanzan y se informan.

## Elegir constructor según etiquetas

| Etiquetas / tarea | Agente |
|---|---|
| Infra (LAB-8, 14, 15, 37) | `labia-infra` |
| Base de datos sin pantallas (LAB-11, 12, 22) | `labia-db` |
| Diseño, componentes, navegación (LAB-9, 10, 13) | `labia-ui` |
| Frontend/Backend de funcionalidades (resto) | `labia-fullstack` |
| QA final (LAB-34) | `labia-e2e` en modo pase final |
| Humano | No se lanza: va al informe de pendientes |

## Recorrido por tarea

1. **Constructor** (en segundo plano). Si en la ola hay más de una tarea, cada constructor corre con `isolation: "worktree"`. El prompt incluye: el id de la tarea, "seguí `.claude/labia/protocolo.md`" y "al terminar pasá la tarea a In Review y devolvé el HANDOFF".
2. Cuando llega el HANDOFF, chequeá que la tarea quedó en **In Review** en Linear; si no, pasala vos.
3. **`labia-seguridad`** si la tarea tiene etiqueta Seguridad o Base de datos, o el HANDOFF dice que toca seguridad o datos. Si sale BLOQUEADO, devolvé los hallazgos al constructor (SendMessage) y repetí.
4. **`labia-e2e`** (modo PR) si el HANDOFF dice que agrega un flujo de usuario y la base de Playwright ya existe.
5. **`labia-revisor`** con el HANDOFF y los informes anteriores. Solo revisa: LISTO PARA MERGEAR o CAMBIOS.
   - CAMBIOS → mandale los hallazgos al constructor (SendMessage), que corrige y vuelve a In Review; repetí desde el paso 3. Máximo 3 vueltas; después frená y preguntale a Emanuel.
6. **`labia-integrador`**, solo si Emanuel autorizó el merge de esa tarea o de la ola (si no, avisale que está lista y esperá). Actualiza con `main`, espera la CI, mergea con squash y pasa a Done.
   - CONFLICTO → el constructor hace rebase (y renombra su migración si hace falta) y vuelve al paso 6.
   - NECESITA REVISIÓN → volvé al paso 5. CI ROJA → devolvé el log al constructor.
7. Cuando se cierra una tarea, fijate si destrabó otras (`blocks`) y avisá cuáles quedan listas.

En una ola con varias migraciones, mergeá de a una y pedile al siguiente constructor que haga rebase y renombre su migración si hace falta.

## Al final

Mostrá un informe corto:

```
INFORME LABÍA · <fecha>
LAB-n · <título> · MERGEADO <sha> | EN REVISIÓN | BLOQUEADA | NECESITA A EMANUEL
…
Próxima ola lista: LAB-x, LAB-y
Pendientes de Emanuel que frenan trabajo: …
```
