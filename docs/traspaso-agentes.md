# Documento de traspaso y contexto general · LabÍA

**Última revisión:** 2026-10-15
**Proyecto:** LabÍA MVP (Linear, equipo `LAB`, proyecto `LabÍA MVP`)
**Repositorio:** `https://github.com/EmaPesci06/labIa`
**Rama principal:** `main`

Este es el **único** documento de traspaso. `.gemini/estado.md` y `GEMINI.md` apuntan acá; no hay otro lugar donde mantener el estado.

Las fuentes vivas son Linear y Git. Este documento explica reglas, contexto y decisiones que no están en las tareas. Si algo de acá no coincide con Linear o con `git`, mandan Linear y `git`.

---

## 1. Visión y reglas del producto

LabÍA es un marketplace de oficios exclusivo para Mar del Plata (solo esa ciudad en el MVP).

- **Roles:** `cliente`, `profesional`, `admin` (interno). Una cuenta tiene un único rol.
- **Oficios:** carpintería, plomería, cerrajería, gas, pintura, mecánica, electricidad.
- **Contacto:** siempre por WhatsApp (`https://wa.me/<numero>?text=<mensaje>`), sin chat interno ni cobros dentro de la app.
- **Seguridad y privacidad (no negociables):**
  - RLS en todas las tablas. Los tests pgTAP corren en la CI de GitHub Actions.
  - El profesional sube DNI (frente y dorso) y antecedentes al bucket privado `documentos`. Solo un admin genera URLs firmadas de 60 segundos. Nunca se muestran en interfaces públicas.
  - Nunca se pide ni se guarda la dirección exacta: se usa el **barrio** y las distancias se miden entre centros de barrio.
  - `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor, dentro de `/admin`, endpoints de cron protegidos y jobs puntuales (`borrado.ts`, avisos por email).
  - Toda Server Action valida sesión, rol y entrada con Zod.
  - Sin `console.log`, sin `any`, sin hex sueltos en componentes (solo tokens definidos en `src/app/globals.css`).

---

## 2. Estado del trabajo

El estado de los PRs y de las tareas **no se copia en este documento**: envejece. Consultalo en vivo:

- PRs abiertos y su CI: `gh pr list` y `gh pr checks <n>`.
- Estado de cada tarea, bloqueos y comentarios: Linear, equipo `LAB`.
- Qué entró a `main`: `git log origin/main --oneline`.

### 2.A Ya en `main` (referencia histórica)

- **Fases 0 y 1 (base e infra):**
  - `LAB-5`: repositorio en GitHub.
  - `LAB-6`: cuentas de Supabase y Vercel, variables de entorno.
  - `LAB-8`: Next.js 16, App Router, React 19, TypeScript estricto, Tailwind CSS 4.
  - `LAB-9`: tokens de diseño, tipografías (Archivo, Atkinson Hyperlegible Next, IBM Plex Mono), logo y tema claro y oscuro.
  - `LAB-10`: componentes base (`Boton`, `Campo`, `Insignia`, `Chip`, `CintaMetrica`, etc.).
  - `LAB-11`: esquema inicial de Postgres, PostGIS y barrios de Mar del Plata.
  - `LAB-12`: políticas RLS y buckets de Storage (`fotos` público, `documentos` privado).
  - `LAB-13`: navegación móvil (barra inferior) y de escritorio (barra superior), manifest PWA.
  - `LAB-14`: CI con GitHub Actions (Base de datos con pgTAP, Calidad, Playwright E2E) y Vercel.
  - `LAB-15`: monitoreo de errores con Sentry y métricas anónimas con PostHog.
- **Fase 2 (cuentas y perfiles):**
  - `LAB-16`: bienvenida, ingreso y sesiones con Supabase Auth (email y Google).
  - `LAB-17`: registro de cliente.
  - `LAB-18`: registro de profesional (paso 1: datos, zonas, experiencia, fotos).
  - `LAB-19`: carga privada de documentos (DNI, antecedentes, matrícula).
  - `LAB-20`: normas de seguridad (paso 2 del profesional, 10 compromisos).
  - `LAB-21`: panel `/admin/verificaciones` con URLs firmadas de 60 s.
  - `LAB-40`: función SQL `elegir_rol_inicial` para el alta con Google.
  - `LAB-43`: consentimiento explícito de datos sensibles antes de subir documentos.
- **Fase 3 (búsqueda):**
  - `LAB-22`: función SQL `buscar_profesionales` por oficio, barrio y distancia entre centroides.
  - `LAB-23`: inicio del cliente y resultados con cinta métrica de distancia.
  - `LAB-24`: perfil público del profesional (`/profesionales/[id]`).
  - `LAB-25`: contacto por WhatsApp con hoja "Antes de contactar".
- **Fase 4 (trabajos):**
  - `LAB-26`: publicar trabajo (`/trabajos/nuevo`).
  - `LAB-27`: lista de trabajos para profesionales (`/trabajos`).
  - `LAB-28`: detalle del trabajo y postulación con precio y seña (`/trabajos/[id]`).
  - `LAB-29` (PR #34, commit `70c52a2`): "Mis trabajos" del cliente (`/mis-trabajos`, `/mis-trabajos/[id]`), RPCs transaccionales con `FOR UPDATE` (`elegir_postulante`, `cambiar_profesional`, `marcar_trabajo_terminado`, `cancelar_trabajo`) y contacto por WhatsApp con el postulante elegido.
- **Fases 5 y 6 (confianza y lanzamiento):**
  - `LAB-30`: emails transaccionales con Resend y React Email.
  - `LAB-33`: "Mi cuenta" (`/cuenta`): edición de datos, tema, descarga de datos personales y borrado de cuenta (Ley 25.326).
  - `LAB-35`: borrador de Términos y Condiciones y Política de Privacidad.
  - `LAB-42` (PR #35, commit `d4221a7`): borrado de documentos a los 30 días de revisados, con cron `/api/cron/borrar-documentos` y tests en `tests/unidad/limpieza-documentos.test.ts`.
    **Ojo:** esta limpieza duplicó la que ya hacía `LAB-21`. Hay una corrección de seguridad en curso que las unifica. No agregues una tercera limpieza ni toques el borrado de documentos por fuera de esa corrección.

### 2.B Trabajo en curso

Al momento de esta revisión están en curso `LAB-31` (reseñas de clientes), `LAB-32` (reportes y moderación) y `LAB-41` (endurecer auth). Su estado real está en Linear y en `gh pr list`.

- **`LAB-32`:** si la CI falla en pgTAP, la causa va en la migración o la política (por ejemplo, grants por columna en `reportes` y `acciones_moderacion`). Nunca se ajusta el assert para que pase.
- **`LAB-41`: endurecer auth antes de producción.** Alcance:
  - Unificar `ipDelPedido` y el limitador de tasa (persistente o en memoria) entre `auth/acciones.ts`, `auth/registro-cliente.ts` y `registro/profesional.ts`, extrayendo la IP de cabeceras de proxy de confianza (Vercel).
  - Mitigar la sobrescritura de `user_metadata` en reintentos de `signUp` sobre emails no confirmados.
  - En `scripts/generar-perfiles.ts`: abortar si la base no es local.
  - En SQL: `and estado = 'activa'` en `privado.es_admin()`, para que los admins suspendidos no retengan facultades.
  - Migración con timestamp posterior, tipos actualizados y test pgTAP.

### 2.C Pendientes

- **`LAB-34`: pruebas de punta a punta, accesibilidad y rendimiento (pase final de calidad).** **No la hace Gemini ni ningún otro modelo.** La hace Claude (`labia-e2e`, pase final) cuando el resto esté en `main`. Emanuel le pidió a Gemini que no la tomara porque quería que la hiciera Claude. No la ejecutes.
- **`LAB-37`: puesta en producción** (dominio propio, backups, monitoreo). Depende de las tareas humanas de infraestructura de Emanuel.
- **Tareas humanas de Emanuel:** `LAB-7` (dominio y cuentas de producción de Resend, Sentry y PostHog), `LAB-36` (revisión legal), `LAB-38` (reclutamiento de los primeros 30 profesionales), `LAB-39` (piloto con clientes reales en Mar del Plata).
- **Pendientes de Emanuel sin tarea propia:**
  - Activar "Secure password change" en el Supabase de producción.
  - Decidir la defensa contra la cosecha de números de WhatsApp con muchas cuentas de cliente. Hoy hay un límite de 20 contactos por día por cuenta. Como mínimo, email confirmado obligatorio en producción.

### 2.D Decisiones que no están en las tareas

- Los documentos aprobados se borran a los 30 días; la insignia queda (minimizar datos sensibles).
- Se puede volver de profesional a cliente mientras la cuenta no tenga datos (LAB-40).
- El consentimiento de datos sensibles lo exige la base: política del bucket y RPC `registrar_documento` (LAB-43).

---

## 3. Cómo se trabaja

### 3.1 Recorrido de cada tarea

```
constructor (labia-fullstack, labia-db, labia-ui, labia-infra)  → In Review
  → labia-seguridad   si toca seguridad, datos, migraciones, RLS, Storage, auth, /admin o service role
  → labia-e2e         si agrega o cambia un flujo de usuario (y en el pase final, LAB-34)
  → labia-revisor     siempre: LISTO PARA MERGEAR o cambios + vuelve a In Progress
  → labia-integrador  con autorización de Emanuel: actualiza con main, espera CI, squash y Done
```

Reglas:

- **Nada se mergea sin pasar por las fases que correspondan y sin veredicto del revisor.** Ningún agente ni modelo mergea "porque la CI pasó" ni "porque el constructor dice que está bien".
- No se usa `gh pr merge` directo para saltear el recorrido. El merge lo hace el integrador, con autorización de Emanuel.
- Si una fase encuentra problemas, se vuelve a construir, se corrige y se repite desde la fase que falló. Máximo 3 vueltas; después se frena y se consulta a Emanuel.
- Si un test falla, se investiga la causa. **No se ajusta el assert, el snapshot ni el test para que pase.**

### 3.2 Lección de esta etapa

Los PRs que mergeó otro modelo sin revisión tuvieron 2 hallazgos ALTO de seguridad y bloqueantes de calidad. Por eso: **nada se mergea sin las fases.** Una fase no se aprueba en la misma pasada en que se construyó.

### 3.3 Base de datos

- Docker no levanta en la máquina de Windows. Las pruebas pgTAP se corren solo en la CI (job `Base de datos`). Nunca `supabase db reset` local ni sobre una base compartida.
- `src/lib/supabase/tipos.ts` se mantiene en orden alfabético estricto. La CI valida que coincida con "Los tipos generados coinciden con los commiteados".
- Migraciones:
  - Archivos en `supabase/migrations/` con timestamp estrictamente posterior a la última de `main` y de los PR abiertos. Si entra otra antes, se renombra la propia (mismo SQL) antes del merge.
  - Nunca se edita una migración ya mergeada.
- Políticas o funciones redefinidas (`usuarios_proteger_columnas`, `documentos_subir_propios`, `registrar_documento`, `privado.es_admin`): partir de la versión vigente en `main` y conservar todas sus condiciones.
- pgTAP:
  - Llamar a `tests.como(...)` antes de `set local role`, o hacer `reset role` antes.
  - `throws_ok` con 4 argumentos (sql, código, mensaje, descripción).
  - `plan(n)` igual al número real de asserts.
  - Las tablas nuevas se suman a `esquema.test.sql`.
- Errores de seguridad que ya ocurrieron (no repetir):
  - Grants de `insert` o `update` directos que saltean la RPC `security definer`.
  - Funciones del esquema `privado` sin `revoke execute ... from public, anon`.
  - `es_admin()` sin chequear que la cuenta esté activa.
  - Políticas de Storage que dejan leer al admin con su JWT. Solo se entregan URLs firmadas de 60 s desde el servidor.

### 3.4 Interfaz

- La paleta y los tokens viven en `src/app/globals.css`. Nunca hex sueltos.
- `--color-azul` es `#232f49` en claro y `#b7c5e8` en oscuro, así que `text-azul` es accesible en ambos modos.
- `--color-azul-suave` es `#2a3550` en oscuro y es una superficie. **Nunca usar `dark:text-azul-suave` como color de texto:** no cumple WCAG AA.
- Accesibilidad que ya falló (no repetir):
  - Ids duplicados cuando un bloque se renderiza dos veces (celular y escritorio): usar `useId`.
  - `<dl>` con wrappers inválidos.
  - Foco que no vuelve al botón al cerrar una hoja: Radix necesita `Dialog.Trigger` o `onCloseAutoFocus`.
  - Táctiles de menos de 44 px.

### 3.5 Comandos, formato y procesos

```bash
pnpm exec prettier --write <archivos-tocados>
pnpm format:check        # parte de la CI: corre prettier --check sobre todo el repo
pnpm lint
pnpm typecheck
pnpm test
pnpm build
gh pr checks <n> --watch
```

- En PowerShell no se usa `&&`: separar con `;`.
- E2E sin base: `tests/e2e/apoyo/supabase-falso.cjs` es un Supabase falso. Se builda con `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399` y se corre con `LABIA_E2E_SUPABASE_FALSO=1`. Se levanta a mano con `node tests/e2e/apoyo/supabase-falso.cjs`.
- Procesos: matar solo los PID de los puertos propios. Nunca `taskkill /IM node.exe` ni `pkill -f playwright`.
- Rutas en Windows: usar `C:/Users/WIN-10/Desktop/labia` con "Desktop" en mayúscula. Con minúscula, git falla en los worktrees.

### 3.6 Commits, ramas y PR

- Una rama por tarea: `lab-<n>-<slug>` desde `origin/main` actualizado. Un PR por tarea, con título `LAB-n: <título>`.
- Commits chicos, en español, terminados con la línea `Co-Authored-By` del agente o modelo que hizo el commit (ver `.claude/labia/protocolo.md`).
- Al abrir el PR: la tarea pasa a `In Review` con el link. Solo el integrador mergea (squash) y la pasa a `Done`.
- Las capturas de celular (390 px) y escritorio (1440 px), en claro y oscuro, van en el PR.

---

## 4. Plan inmediato para el próximo agente

1. Leer `.claude/labia/protocolo.md`, `AGENTS.md` y el estado vivo: `gh pr list` y Linear (equipo `LAB`).
2. Para cada PR abierto (`LAB-31`, `LAB-32`, `LAB-41` o los que aparezcan): seguir el recorrido de la sección 3.1. Pasar por `labia-seguridad` si corresponde, por `labia-e2e` si agrega flujo, y por `labia-revisor`. Recién después, `labia-integrador` con autorización de Emanuel. Sin merges directos.
3. `LAB-32`: si pgTAP falla, corregir la causa en la migración o en la política. No tocar los asserts para que pasen.
4. `LAB-41`: tomar el alcance de la sección 2.B. Rebasar sobre `main` antes de cerrar.
5. Limpieza de documentos: no agregar otra. `LAB-21` y `LAB-42` se unifican en la corrección de seguridad en curso.
6. `LAB-34` no se toma. Queda para Claude (`labia-e2e`, pase final) cuando el resto esté en `main`.
7. `LAB-37` solo cuando Emanuel complete las tareas humanas de infraestructura.
