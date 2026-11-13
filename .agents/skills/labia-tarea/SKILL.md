---
name: labia-tarea
description: >-
  Orquesta tareas de Linear de LabÍA de punta a punta (constructor -> seguridad -> e2e -> revisor -> integrador)
  lanzando un subagente por rol. Usar cuando el usuario pida trabajar en una tarea de Linear (ej. LAB-n),
  procesar la próxima ola de tareas o revisar pendientes.
---

# Orquestador de tareas · LabÍA (Gemini)

Sos el orquestador de LabÍA del lado de Gemini. No construís ni revisás vos: lanzás un subagente por fase y decidís
qué sigue. Los subagentes están en `.agents/plugins/labia/agents/` y tienen los mismos nombres y las mismas
instrucciones que los de Claude Code.

Antes de empezar leé `.claude/labia/protocolo.md` (sobre todo "Dos orquestadores"), `AGENTS.md` y `GEMINI.md`.

## Qué tareas tomás

Solo las del proyecto **LabÍA MVP** con las etiquetas **Agente** y **Orq: Gemini**. Las de **Orq: Fable** son del
orquestador de Claude Code: no las construyas. Una tarea sin ninguna de las dos etiquetas no se toma: avisale a Emanuel.

- `pendientes` → lanzá `labia-pendientes-humanas` y mostrá su informe.
- `ola` → listá tus tareas en Todo cuyos `blockedBy` estén todos en Done. Mostralas y procesalas.
- `LAB-n …` → procesá esas tareas. Las bloqueadas no se lanzan y se informan.

## Qué constructor va con cada tarea

| Etiquetas / tarea                           | Subagente                        |
| ------------------------------------------- | -------------------------------- |
| Infra                                       | `labia-infra`                    |
| Base de datos sin pantallas                 | `labia-db`                       |
| Diseño, componentes, navegación             | `labia-ui`                       |
| Frontend/Backend de funcionalidades (resto) | `labia-fullstack`                |
| QA y pruebas E2E                            | `labia-e2e`                      |
| Humano                                      | No se lanza: va a los pendientes |

## Recorrido por tarea

1. **Constructor.** Un subagente por tarea, cada uno en su propio worktree. El encargo incluye el id de la tarea,
   "seguí `.claude/labia/protocolo.md`" y "al terminar pasá la tarea a In Review y devolvé el HANDOFF".
2. Cuando llega el HANDOFF, comprobá que la tarea quedó en **In Review** en Linear; si no, pasala vos.
3. **`labia-seguridad`** si la tarea tiene etiqueta Seguridad o Base de datos, o el HANDOFF dice que toca seguridad
   o datos. Si sale BLOQUEADO, devolvele los hallazgos al constructor y repetí.
4. **`labia-e2e`** si el HANDOFF dice que agrega o cambia un flujo de usuario.
5. **`labia-revisor`**, siempre, con el HANDOFF y los informes anteriores. CAMBIOS → el constructor corrige y se
   repite desde el paso 3. Máximo 3 vueltas; después frená y preguntale a Emanuel.
6. **`labia-integrador`**: actualiza con `main`, espera la CI, mergea con squash y pasa la tarea a Done. Emanuel dio
   autorización permanente para mergear lo que pase las fases 3 a 5. De a un PR por vez, y nunca mientras el otro
   orquestador esté mergeando.
7. Al cerrar una tarea, fijate si destrabó otras (`blocks`) y avisá cuáles quedan listas, de cualquiera de los dos
   orquestadores.

Nunca revisa el mismo subagente que construyó.

## Informe final

```
INFORME LABÍA (Gemini) · <fecha>
LAB-n · <título> · MERGEADO <sha> | EN REVISIÓN | BLOQUEADA | NECESITA A EMANUEL
Próxima ola lista: LAB-x, LAB-y
Pendientes de Emanuel que frenan trabajo: …
```
