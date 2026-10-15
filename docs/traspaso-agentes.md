# Documento de Traspaso y Contexto General · LabÍA

**Fecha:** 2026-10-14T23:45:00-03:00  
**Proyecto:** LabÍA MVP (Equipo Linear `LAB`, Proyecto `LabÍA MVP`)  
**Repositorio:** `https://github.com/EmaPesci06/labIa`  
**Rama principal:** `main`

---

## 1. Visión y Reglas del Producto

LabÍA es un marketplace de oficios exclusivo para Mar del Plata (solo esa ciudad en el MVP).
- **Roles:** `cliente`, `profesional`, `admin` (interno). Una cuenta tiene un único rol.
- **Oficios:** carpintería, plomería, cerrajería, gas, pintura, mecánica, electricidad.
- **Contacto:** Siempre por WhatsApp (`https://wa.me/<numero>?text=<mensaje>`), sin chat interno ni cobros dentro de la app.
- **Seguridad y Privacidad (No negociables):**
  - RLS en el 100% de las tablas. Los tests de pgTAP corren en la CI de GitHub Actions.
  - El profesional sube DNI (frente/dorso) y antecedentes al bucket privado `documentos`. Solo un admin genera URLs firmadas de 60 segundos. Nunca se muestran en interfaces públicas.
  - Nunca se solicita ni guarda dirección exacta: se utiliza el **barrio** de Mar del Plata y las distancias se miden entre centros de barrios.
  - `SUPABASE_SERVICE_ROLE_KEY` se ejecuta únicamente en el servidor en `/admin`, endpoints de cron protegidos y jobs puntuales (`borrado.ts`, avisos por email).
  - Toda mutación valida sesión, rol y payload con Zod.
  - Sin `console.log`, sin `any`, sin hex sueltos en componentes (únicamente tokens de Tailwind definidos en `src/app/globals.css`).

---

## 2. Estado de Tareas en Linear y Git

### A. Tareas Completadas y Mergeadas en `main` (Done)

- **Fase 0 y Fase 1 (Base e Infra):**
  - `LAB-5`: Creación de repositorio en GitHub.
  - `LAB-6`: Cuentas de Supabase y Vercel y variables de entorno.
  - `LAB-8`: Inicialización de Next.js 16, App Router, React 19, TypeScript estricto, Tailwind CSS 4.
  - `LAB-9`: Tokens de diseño, tipografías (Archivo, Atkinson Hyperlegible Next, IBM Plex Mono), logo y tema claro/oscuro.
  - `LAB-10`: Componentes base (`Boton`, `Campo`, `Insignia`, `Chip`, `CintaMetrica`, etc.).
  - `LAB-11`: Esquema inicial Postgres, PostGIS y barrios de Mar del Plata.
  - `LAB-12`: Políticas RLS y buckets de Storage (`fotos` público, `documentos` privado).
  - `LAB-13`: Navegación móvil (barra inferior) y escritorio (barra superior), manifest PWA.
  - `LAB-14`: CI con GitHub Actions (Base de datos pgTAP, Calidad, Playwright E2E) y Vercel.
  - `LAB-15`: Monitoreo de errores con Sentry y métricas de uso anónimas con PostHog.
- **Fase 2 (Cuentas y Perfiles):**
  - `LAB-16`: Bienvenida, ingreso y sesiones con Supabase Auth (email y Google).
  - `LAB-17`: Registro de cliente.
  - `LAB-18`: Registro de profesional (Paso 1: datos, zonas, experiencia, fotos).
  - `LAB-19`: Carga privada de documentos (DNI, antecedentes, matrícula).
  - `LAB-20`: Normas de seguridad (Paso 2 del profesional con 10 compromisos).
  - `LAB-21`: Panel `/admin/verificaciones` para revisión y aprobación de profesionales con URLs firmadas de 60s.
  - `LAB-40`: Función SQL `elegir_rol_inicial` para alta con Google.
  - `LAB-43`: Consentimiento explícito de datos sensibles antes de subir documentos.
- **Fase 3 (Búsqueda):**
  - `LAB-22`: Función SQL `buscar_profesionales` por oficio, barrio y distancia entre centroides.
  - `LAB-23`: Inicio del cliente y resultados de búsqueda con cinta métrica de distancia.
  - `LAB-24`: Perfil público del profesional (`/profesionales/[id]`).
  - `LAB-25`: Contacto por WhatsApp con hoja de consejos de seguridad ("Antes de contactar").
- **Fase 4 (Trabajos):**
  - `LAB-26`: Publicar trabajo del cliente (`/trabajos/nuevo`).
  - `LAB-27`: Lista de trabajos para profesionales (`/trabajos`).
  - `LAB-28`: Detalle del trabajo y postulación con precio y seña (`/trabajos/[id]`).
  - **`LAB-29` (Mergeado recientemente - PR #34, commit `70c52a2`):**
    - "Mis trabajos" del cliente (`/mis-trabajos` y `/mis-trabajos/[id]`).
    - Maestro-detalle en escritorio y lista con tabs ("abiertos", "contratados", "terminados") en móvil.
    - RPCs transaccionales con bloqueo `FOR UPDATE`: `elegir_postulante`, `cambiar_profesional`, `marcar_trabajo_terminado`, `cancelar_trabajo`.
    - Comparación de postulantes (mensaje, precio estimado, seña, promedio de estrellas).
    - Contacto directo por WhatsApp al postulante elegido con `origen = 'postulacion'`.
- **Fase 5 y 6 (Confianza y Lanzamiento):**
  - `LAB-30`: Emails transaccionales con Resend y React Email.
  - `LAB-33`: Mi cuenta (`/cuenta`): edición de datos, tema, descarga de datos personales y borrado de cuenta bajo Ley 25.326.
  - `LAB-35`: Borrador de Términos y Condiciones y Política de Privacidad.
  - **`LAB-42` (Mergeado recientemente - PR #35, commit `d4221a7`):**
    - Borrado seguro de documentos a los 30 días de revisados.
    - Función server-only `src/lib/documentos/limpieza.ts` que purga los archivos del bucket `documentos` usando el cliente admin y marca `archivo_borrado_at = now()` en la tabla `verificaciones` conservando las insignias y estado.
    - Route handler cron `/api/cron/borrar-documentos` con autenticación Bearer `CRON_SECRET`.
    - 354 líneas de tests unitarios exhaustivos en `tests/unidad/limpieza-documentos.test.ts`.

---

### B. Pull Requests Abiertos (En Revisión)

#### 1. PR #36: `LAB-31: Reseñas de clientes a profesionales`
- **Rama:** `lab-31-resenas-clientes-profesionales`
- **Estado de CI:** **100% VERDE** (Base de datos: 2m53s, Calidad: 1m50s, E2E: 5m23s, Vercel: OK).
- **Alcance implementado:**
  - `src/lib/validaciones/resenas.ts`: Esquema Zod, filtro anti-spam / fuga de datos (`sinContacto` rechaza teléfonos y emails), chips rápidos (`CHIPS_RAPIDOS`), etiquetas accesibles (`ETIQUETAS_PUNTAJE`).
  - `src/lib/resenas/acciones.ts`: Server Action `guardarResena` con validación de rol cliente, cuenta activa, verificación de elegibilidad (contacto previo o contratación en trabajo), upsert seguro, ventana de edición de 24 horas y auto-reporte para reseñas con puntaje 1-2. Métrica PostHog `resena_publicada`.
  - `src/components/resenas/HojaResena.tsx`: Bottom sheet accesible con Radix Dialog, 5 estrellas grandes táctiles (44px, flechas de teclado), chips rápidos agregables al texto, contador de caracteres y aviso de privacidad.
  - `src/components/mis-trabajos/DetalleMiTrabajo.tsx`: Apertura de reseña al marcar trabajo terminado.
  - `src/app/(explorar)/profesionales/[id]/page.tsx`: Sección `#resena` con botón "Dejar reseña" o "Editar mi reseña".
- **Siguiente acción:** Revisión de seguridad/código y merge squash a `main`.

#### 2. PR #37: `LAB-32: Reportes y moderación: reportar perfiles, trabajos y reseñas, y suspender cuentas`
- **Rama:** `lab-32-reportes-y-moderacion`
- **Estado de CI:** `Calidad` y `Vercel` en verde; **`Base de datos` falló en pgTAP**.
- **Causa del fallo en pgTAP:**
  - `Failed test 246`: `authenticated no tiene insert ni update a nivel de tabla: todo es por columna`. La migración dio `grant insert on reportes` a nivel tabla en vez de por columnas específicas, o faltó grant en `acciones_moderacion`.
  - Error en `psql:.../moderacion.test.sql:125: ERROR: Reporte no encontrado`.
- **Siguiente acción:**
  1. Hacer checkout de `lab-32-reportes-y-moderacion`.
  2. Rebasar o mergear los últimos commits de `main` (incluyendo LAB-42).
  3. Ajustar los grants en la migración de moderación a nivel columna (`grant insert (autor_id, ...) on public.reportes to authenticated`).
  4. Corregir los asserts de pgTAP en `supabase/tests/database/moderacion.test.sql`.
  5. Pushear para que la CI quede en verde y proceder al merge.

---

### C. Tareas Pendientes en Backlog / Todo

1. **`LAB-41`: Endurecer auth antes de producción** (Estado: `In Progress` en Linear)
   - **Rama local ya creada:** `lab-41-endurecer-auth`.
   - **Alcance pendiente:**
     - Unificar `ipDelPedido` y limitador de tasa persistente/en memoria entre `auth/acciones.ts`, `auth/registro-cliente.ts` y `registro/profesional.ts`, extrayendo IP de cabeceras de proxy de confianza (Vercel).
     - Mitigar sobrescritura de `user_metadata` en reintentos de `signUp` sobre emails no confirmados.
     - En `scripts/generar-perfiles.ts`: validar abortar si la base no es local.
     - En SQL: agregar `and estado = 'activa'` a la función `privado.es_admin()` para que administradores suspendidos no retengan facultades.
     - Crear migración SQL con timestamp posterior, tipos actualizados y test pgTAP.
2. **`LAB-34`: Pruebas de punta a punta, accesibilidad y rendimiento**
   - **DECISIÓN EXPRESA DE EMANUEL:** **NO LLEVAR A CABO.** No se debe ejecutar esta tarea.
3. **`LAB-37`: Puesta en producción con dominio propio, backups y monitoreo**
   - Configuración final de producción una vez que Emanuel complete las tareas humanas de infraestructura.
4. **Tareas asignadas a Emanuel (Humano):**
   - `LAB-7`: Dominio propio y cuentas de producción de Resend, Sentry y PostHog.
   - `LAB-36`: Revisión legal con abogado.
   - `LAB-38`: Reclutamiento de los primeros 30 profesionales.
   - `LAB-39`: Piloto con clientes reales en Mar del Plata.

---

## 3. Guía de Ejecución y Lecciones Aprendidas

1. **Docker local no funciona:** En el entorno local de Windows no corre Docker Desktop. Las pruebas SQL de pgTAP se validan exclusivamente en GitHub Actions (`Base de datos`). Nunca ejecutar `supabase db reset` local.
2. **Tipos de Supabase (`src/lib/supabase/tipos.ts`):** Deben mantenerse ordenados alfabéticamente de forma estricta. La CI valida que coincidan con `Los tipos generados coinciden con los commiteados`.
3. **Migraciones:**
   - Crear archivos en `supabase/migrations/` con timestamp estrictamente posterior a la última existente.
   - Jamás editar una migración ya mergeada en `main`.
4. **Estilos y Modo Oscuro:**
   - La paleta se define en `src/app/globals.css`.
   - `--color-azul` es `#232f49` en light mode y `#b7c5e8` en dark mode. Por lo tanto, `text-azul` es accesible en ambos modos.
   - `--color-azul-suave` es `#2a3550` en dark mode (color de superficie/fondo). **Nunca usar `dark:text-azul-suave`** como color de texto sobre fondo oscuro porque produce violación de contraste WCAG AA.
5. **Comandos antes de commitear:**
   ```bash
   pnpm exec prettier --write <archivos-tocados>
   pnpm typecheck
   pnpm lint
   pnpm test
   ```
   *Nota:* En PowerShell en Windows, no usar `&&`; separar con punto y coma `;`.
6. **Formato de Commits:**
   Mensajes en español describiendo el cambio y finalizados obligatoriamente con:
   ```
   Co-Authored-By: Gemini <noreply@google.com>
   ```
7. **Flujo de PR y Merge:**
   - Abrir PR con `gh pr create`.
   - Esperar CI con `gh pr checks <numero> --watch`.
   - Realizar revisión de código y seguridad (`labia-seguridad.md` y `labia-revisor.md`).
   - Mergear squash con `gh pr merge <numero> --squash --delete-branch`.
   - Actualizar Linear pasando la tarea a `Done` con comentario y enlace al PR.
   - Regresar a `main` y hacer `git pull origin main`.

---

## 4. Plan de Acción Inmediato para el Nuevo Agente

1. **Paso 1: Mergear PR #36 (LAB-31)**
   - La CI ya pasó completamente en verde.
   - Ejecutar `gh pr merge 36 --squash --delete-branch`.
   - Actualizar `main` (`git checkout main; git pull origin main`).
   - Marcar `LAB-31` como `Done` en Linear y registrar comentario.
2. **Paso 2: Corregir y Mergear PR #37 (LAB-32)**
   - Cambiar a la rama `lab-32-reportes-y-moderacion`.
   - Mergear `main` en la rama para integrar LAB-42 y LAB-31.
   - Corregir en la migración los grants de `reportes` / `acciones_moderacion` para que sean específicos a nivel columna (evitando el fallo en `test 246` de políticas).
   - Ajustar el assert de `moderacion.test.sql`.
   - Ejecutar verificaciones, commitear, pushear y esperar CI en verde para mergear.
   - Marcar `LAB-32` como `Done` en Linear.
3. **Paso 3: Retomar LAB-41**
   - Cambiar a la rama `lab-41-endurecer-auth` rebasada contra el nuevo `main`.
   - Finalizar el limitador unificado de IP, la mitigación de metadata y la migración `privado.es_admin()`.
   - Crear PR, verificar CI y mergear.
4. **Paso 4: Recordatorio**
   - **No tocar LAB-34.**
