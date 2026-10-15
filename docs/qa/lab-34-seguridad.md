# LAB-34 · Informe de seguridad del pase final

- **Fecha:** 2026-10-15
- **Commit auditado:** `04b9f3a` (`origin/main`, LAB-50)
- **Alcance:** todo el sistema en `main` (no un delta): migraciones, RLS y grants, Storage, Server Actions, route handlers, service role, datos personales, rate limit, cabeceras, secretos, dependencias, CI.
- **Autor:** revisor de seguridad (labia-seguridad), auditoría estática.

## Veredicto: BLOQUEADO

Hay 2 hallazgos ALTO (H-01 cabeceras de seguridad ausentes, H-02 fotos de trabajos en bucket público). No hay CRÍTICO. Para desbloquear hace falta arreglar H-01 y H-02; los MEDIO se pueden tomar como tareas nuevas en Linear (fase 5, etiqueta Agente).

## Qué se probó de verdad y qué no

**Probado:**

- Lectura de las 23 migraciones de `supabase/migrations` (4.197 líneas): esquema, políticas, grants y revokes por columna, vistas, funciones `security definer`, triggers de columnas protegidas, Storage, moderación, borrado de cuenta, consentimiento, rate limit.
- Verificación de que las 14 tablas de `public` y `privado.cupos_limite` tienen RLS activado.
- Verificación de que todas las funciones `security definer` tienen `set search_path = ''`. Las que se exponen por API tienen `revoke ... from public` y `anon` donde corresponde. Las de trigger (`privado.reportes_*`) no son invocables por RPC porque Postgres solo las ejecuta como trigger.
- Grep de `crearClienteAdmin` y `SUPABASE_SERVICE_ROLE_KEY` en todo el árbol.
- Grep de `NEXT_PUBLIC_*`: ninguna variable pública contiene un secreto.
- Grep de patrones de claves (JWT, `sk_live`, `AKIA`, claves privadas, `re_`, `phc_`, URL de proyecto Supabase) en el árbol con `git grep` y en el historial con `git log --all -p -G`. Sin coincidencias reales. Ningún `.env.local` ni `.env.ci.local` figura en el historial.
- `pnpm audit --prod` (pnpm 11.22.0): **No known vulnerabilities found**. Dependencias de producción: 155.
- Lectura de `.env.example` (sin valores). **No se leyeron** `.env.local` ni `.env.ci.local` (solo se listaron, sin abrirlos). `.env.ci.example` no se revisó.

**No probado (decir claro):**

- **pgTAP no corrido.** Docker Desktop no tiene el daemon levantado (`dockerDesktopLinuxEngine` no existe) y no hay CLI de Supabase instalada. No se hizo `supabase start` ni `db reset`. Los 19 archivos de `supabase/tests/database` y las políticas no se ejecutaron. Las políticas y grants de este informe son revisión estática, no una prueba en vivo. Hay que correr `pnpm db:test` en un project_id aislado antes de cerrar H-01/H-02.
- **Cabeceras en vivo.** No hay dominio de producción todavía (`docs/operacion.md` usa placeholders). Lo que sigue se verificó solo en el código.
- **Sondeo con la anon key contra la API real.** No se hizo. El script `scripts/sondeo-seguridad.ts` que pide LAB-34 no existe en el repo (ver B-08).
- **Pruebas de lector de pantalla y visuales:** fuera de alcance de este informe (las hace labia-e2e).

## Resumen de hallazgos

| ID | Sev. | Tema | Ubicación principal |
|---|---|---|---|
| H-01 | ALTO | Sin CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy ni X-Content-Type-Options | `next.config.ts:27` |
| H-02 | ALTO | Fotos de trabajos (interior/fachada de la casa del cliente) en bucket público sin expiración ni borrado | `FormularioTrabajo.tsx:83-86`, `storage.sql:12` |
| M-01 | MEDIO | Teléfonos, emails y direcciones se pueden publicar en campos libres públicos | `validaciones/perfil-profesional.ts:89-113`, `postulacion.ts:21-25`, `trabajo.ts:60` |
| M-02 | MEDIO | Enumeración de cuentas en el registro | `auth/registro-cliente.ts:110`, `auth/acciones.ts:44-46`, `registro/profesional.ts:36` |
| M-03 | MEDIO | Lectura anónima masiva sin límite (perfiles, búsqueda, sitemap) y cosecha de WhatsApp con varias cuentas | `buscar_profesionales.sql:143-144`, `perfil_profesional.sql:86-87`, `contactar_profesional.sql:82` |
| M-04 | MEDIO | `resenas_leer` con `using (true)` para anon, con `autor_id` y `trabajo_id` | `politicas.sql:500`, `politicas.sql:695-697` |
| M-05 | MEDIO | Límite de reportes solo por cuenta (evadible creando cuentas) | `moderacion.sql:91-109` |
| B-01 | BAJO | Token de baja en la query string (queda en logs de Vercel) | `api/baja/route.ts:10`, `(publico)/baja/page.tsx:23` |
| B-02 | BAJO | Rutas de desarrollo en producción según variable de entorno | `dev/ui/page.tsx:37`, `dev/error/BotonErrorForzado.tsx:10` |
| B-03 | BAJO | Sesión falsa de desarrollo: depende de no cargar variables en Preview | `auth/sesion-falsa.ts:11-15` |
| B-04 | BAJO | Lista de campos prohibidos de Sentry incompleta | `observabilidad/privacidad.ts:7-19` |
| B-05 | BAJO | Seed con contraseña fija de un admin de prueba | `supabase/seed.sql:21,57` |
| B-06 | BAJO | `privado.objetivo_existe` ejecutable por authenticated (sondeo de existencia de ids) | `moderacion.sql:126-144` |
| B-07 | BAJO | Autor suspendido puede editar su reseña hasta 24 h | `politicas.sql:709-712` |
| B-08 | BAJO | Criterios de LAB-34 sin cumplir: falta `scripts/sondeo-seguridad.ts` y pgTAP no corrido | repo, CI |
| B-09 | BAJO | Cliente de service role creado fuera de `/admin` y jobs | `cuenta/acciones.ts:277` |
| B-10 | BAJO | `RATE_LIMIT_SECRET` sin largo mínimo (`EMAILS_SECRET` exige 32) | `rate-limit-persistente.ts:34-37` |
| B-11 | BAJO | Login con límite solo por IP (cumple la guía, falta límite por cuenta) | `auth/acciones.ts:21,28,75` |
| B-12 | BAJO | Cookies de sesión sin opciones explícitas en el repo | `lib/supabase/servidor.ts`, `lib/supabase/proxy.ts` |
| B-13 | BAJO | Salud pública que consulta la base sin límite | `api/salud/route.ts` |

Sin CRÍTICO.

## Hallazgos detallados

### ALTO

**H-01 · Sin cabeceras de seguridad (CSP, anti-framing, Referrer, Permissions)**

- **Archivo:** `next.config.ts:27-37` (`headers()` solo define `Cache-Control` y `Service-Worker-Allowed` para `/sw.js`). `src/proxy.ts` no agrega cabeceras. En todo el repo no aparece ninguna de estas cadenas: `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`. No hay `vercel.json` con cabeceras (solo tiene `crons`).
- **Escenario:**
  1. Clickjacking: como no hay `frame-ancestors` ni `X-Frame-Options`, cualquier sitio puede enmarcar `/admin/reportes`, `/cuenta/borrar` o `/mis-trabajos/[id]`. Un admin logueado puede ser engañado para clicar "suspender" o "resolver", y un cliente para "elegir postulante" o borrar su cuenta (que pide BORRAR y contraseña, pero el clic inicial queda enmascarado).
  2. Sin CSP, cualquier XSS futuro (hoy no hay `dangerouslySetInnerHTML` con datos de usuario, así que es defensa en profundidad) carga scripts externos y lee las cookies de sesión. Las cookies de `@supabase/ssr` no tienen opciones propias en el repo (ver B-12).
  3. Permissions-Policy: nada restringe cámara, micrófono ni geolocalización a `self`, que es lo que pide LAB-34.
- **Arreglo:** agregar `headers()` global (no solo `/sw.js`):
  - `Content-Security-Policy`: `default-src 'self'`; `script-src 'self'` más hash o nonce de los dos scripts inline (`SCRIPT_TEMA` en `src/lib/tema.ts:65` e `IrABuscarEnEscritorio`); `connect-src 'self'` más el host de Supabase, `*.sentry.io` y el host de PostHog; `img-src 'self' data: blob:` más el host de Supabase Storage; `style-src 'self' 'unsafe-inline'` (Tailwind/next); `font-src 'self'`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`.
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()`.
  - `Strict-Transport-Security` lo emite Vercel en dominios propios; verificarlo con `curl -I` cuando haya dominio.
  - Verificación: `curl -I` contra el preview y test e2e que lea las cabeceras. Revisar que Sentry, PostHog y Supabase sigan funcionando con la CSP.
- **Por qué ALTO:** LAB-34 lo pide explícitamente, el admin panel se puede enmarcar y no hay ninguna capa de defensa si aparece un XSS.

**H-02 · Fotos de trabajos en el bucket público `fotos`, sin expiración ni borrado**

- **Archivo:** `supabase/migrations/20261011200100_storage.sql:12` (bucket `fotos` con `public = true`); `src/components/trabajos/FormularioTrabajo.tsx:83-86` (sube a `trabajos/<trabajo_id>/<i>-<ms>.jpg` en el bucket `fotos`); `src/lib/fotos.ts` (`urlFoto` arma `…/storage/v1/object/public/fotos/<ruta>`); `supabase/migrations/20261014230000_elegir_postulante.sql:213` (`cancelar_trabajo`) y `supabase/migrations/20261015080000_moderacion.sql:338` (`cerrar_trabajo_admin`): al cerrar o cancelar no se borra nada del Storage.
- **Escenario:** el cliente sube fotos de su casa para pedir presupuesto (por ejemplo, la fachada, el baño o un cartel de la calle). Esas fotos quedan con URL pública permanente. Quien tenga la URL (cualquier profesional que haya visto el trabajo, o alguien a quien se la reenvíe) la ve sin sesión, y la CDN la cachea. Cuando el trabajo se cancela o cierra, la foto sigue online. Solo se borra si se elimina la cuenta (`src/lib/cuenta/borrado.ts`). Aplica el criterio "Sin dirección exacta en ningún lado": una foto puede mostrar la dirección.
- **Atenuante honesto:** la ruta tiene un UUID de trabajo, así que no es enumerable. El riesgo es de persistencia y de reenvío por quien ya vio el trabajo, no de scraping masivo.
- **Arreglo:**
  1. Mover `trabajos/*` a un bucket privado (o a `documentos`) y servirlo con URL firmada de corta duración generada en el servidor, solo para el cliente dueño y para profesionales con postulación o trabajo asignado.
  2. Mientras tanto: job que borre las fotos de `trabajos/<id>` al pasar el trabajo a `cancelado` o `cerrado`, y al terminar el trabajo (`marcar_trabajo_terminado`), con un plazo de retención explícito.
  3. Actualizar la Política de privacidad (hoy dice "fotos de tus trabajos" sin aclarar la visibilidad ni el plazo).
- **Por qué ALTO:** datos del interior y del entorno de la casa de una persona, expuestos sin control de acceso ni de vencimiento.

### MEDIO

**M-01 · Teléfonos, emails y direcciones en campos libres públicos**

- **Archivo:** `src/lib/validaciones/perfil-profesional.ts:89-113` (`especialidades`, `descripcion`, `disponibilidad` solo tienen largo máximo); `src/lib/validaciones/postulacion.ts:21-25` (`mensaje`); `src/lib/validaciones/trabajo.ts:60` (`descripcion` de trabajo). `src/lib/observabilidad/privacidad.ts` filtra teléfonos y emails solo en Sentry, no en la app.
- **Escenario:** un profesional escribe su número en `descripcion` o en `disponibilidad`. Ese texto sale en `perfil_profesional` (anon) y en `buscar_profesionales`, con lo que el número queda en el HTML público sin pasar por el contacto del cliente. Lo mismo con un email o una dirección exacta en `trabajos.descripcion` o en el `mensaje` de una postulación. Así se anula la regla de WhatsApp (guía §7.4) y la de dirección (§7.5).
- **Arreglo:** validación Zod compartida (cliente y servidor) que rechace patrones de teléfono, email y dirección en esos campos, con mensaje en castellano. Repetirla en la base con un check constraint o trigger para las RPC que escriben directo. Como complemento, el reporte ya existente.

**M-02 · Enumeración de cuentas en el registro**

- **Archivo:** `src/lib/auth/registro-cliente.ts:110` (`return { emailExistente: true, valores }`); `src/lib/auth/acciones.ts:44-46` (mensaje específico "Ya hay una cuenta con ese email"); `src/lib/registro/profesional.ts:36`.
- **Escenario:** un script registra emails y, según la respuesta, sabe cuáles son usuarios de LabÍA. Con la base de emails filtrados se confirma quién usa la app (y, en el caso de profesionales, quién está verificando). Es el pendiente 1 del pase.
- **Arreglo:** respuesta idéntica en ambos casos ("Revisá tu email para continuar"). Si la cuenta existe, mandar un email al dueño ("ya tenés cuenta, ingresá o recuperá tu contraseña") en lugar de mostrarlo en la pantalla. Revisar también `reenviarConfirmacion` (`registro-cliente.ts:174-177`): hoy responde `demasiado-pronto` según el límite por email (`reenvio:${email}`), lo que filtra si hubo un envío reciente. La respuesta no tiene que depender de que la cuenta exista.

**M-03 · Lectura anónima sin límite y cosecha de WhatsApp con varias cuentas**

- **Archivo:** `supabase/migrations/20261012120000_buscar_profesionales.sql:143-144` y `supabase/migrations/20261014160000_perfil_profesional.sql:86-87` (ejecutables por anon, sin límite); `src/app/sitemap.ts` (lista perfiles con la anon key); `supabase/migrations/20261014200000_contactar_profesional.sql:82` (límite de 20 contactos por día **por cuenta**).
- **Escenario A (scraping):** cualquiera puede recorrer `buscar_profesionales` y `perfil_profesional` con PostgREST y sacar nombre, inicial del apellido, foto, barrio, oficios y reseñas de todos los profesionales publicados. No hay límite por IP ni en la base ni en el borde.
- **Escenario B (cosecha de WhatsApp):** `contactar_profesional` devuelve el WhatsApp del profesional. El límite de 20 por día es por cuenta, y crear cuentas cuesta poco (el registro se limita a 5 por minuto por IP, pero una IP rotativa lo evade). Con 50 cuentas, un actor obtiene 1.000 números por día. Es el pendiente 2 del pase.
- **Arreglo:**
  - Rate limit por IP en las lecturas públicas (`/buscar`, `/profesionales`, `sitemap`) con el limitador persistente, o una regla de WAF en Vercel.
  - En `contactar_profesional`: límite por IP además del de cuenta (el servidor ya tiene la IP vía `x-vercel-forwarded-for`), tope diario global por profesional y, a decidir, verificación de teléfono antes del primer contacto.

**M-04 · `resenas_leer` con `using (true)` para anon, incluyendo `autor_id` y `trabajo_id`**

- **Archivo:** `supabase/migrations/20261011200000_politicas.sql:500` (`grant select on public.resenas to anon, authenticated`) y `:695-697` (`create policy resenas_leer … using (true)`).
- **Problema:** la guía (AGENTS.md, Seguridad) prohíbe `using (true)` en tablas con datos personales. `resenas` tiene `autor_id` (id de la persona que reseña) y `trabajo_id` (id de un trabajo, que es información de cliente), además del texto libre, donde alguien puede escribir datos de terceros. Anon puede correlacionar reseña, autor y trabajo.
- **Atenuante:** el nombre del autor ya es público vía `usuarios_publicos`, y que las reseñas sean públicas es intencional.
- **Arreglo:** vista `resenas_publicas` sin `autor_id` ni `trabajo_id` (el autor se muestra con su nombre desde `usuarios_publicos`), o grant por columna que excluya esos dos campos para anon. Agregar test pgTAP de que anon no lee esas columnas.

**M-05 · Límite de reportes solo por cuenta**

- **Archivo:** `supabase/migrations/20261015080000_moderacion.sql:91-109` (`reportes_limite_diario` cuenta por `autor_id`, 10 por 24 h).
- **Escenario:** un usuario que quiera hostigar a un profesional con reportes falsos crea cuentas nuevas. El límite del registro (5 por minuto por IP) no impide crear decenas por día desde varias IPs. Es el pendiente 5 del pase.
- **Arreglo:** sumar un límite por IP en la Server Action de reportar con `limitarPorIp` (mismo patrón que LAB-49), y un umbral de reportes sobre el mismo objetivo para que el equipo revise antes. Decisión de Emanuel sobre el umbral.

### BAJO

- **B-01 · Token de baja en la URL.** `src/app/api/baja/route.ts:10` toma `t` de `searchParams`, y `src/app/(publico)/baja/page.tsx:23` también. El token tiene el id de la persona y la categoría. Queda en logs de acceso de Vercel y en el historial. Arreglo: aceptarlo por POST desde un formulario (el route handler ya soporta POST) y no en la query.
- **B-02 · Rutas de desarrollo.** `src/app/dev/ui/page.tsx:37` solo oculta `/dev/ui` si `NODE_ENV === production` y `MOSTRAR_DEV_UI !== "1"`. Verificar que `MOSTRAR_DEV_UI` no esté en Vercel Production. `src/app/dev/error/BotonErrorForzado.tsx:10` lleva un DNI y un email de ejemplo en un texto de error; está detrás de un `notFound` en producción, así que es solo higiene. Arreglo: borrar `/dev/*` de la rama principal o compilarlos fuera de producción.
- **B-03 · Sesión falsa.** `src/lib/auth/sesion-falsa.ts:11-15` queda bloqueada en `VERCEL_ENV=production`. En Preview, `NODE_ENV` es `production`, así que solo se habilita si alguien carga `LABIA_PERMITIR_ROL_DEV=1`. Verificar en Vercel (Preview y Production) que ninguna de las tres variables (`LABIA_ROL_DEV`, `LABIA_ID_DEV`, `LABIA_PERMITIR_ROL_DEV`) esté cargada. `.env.example` ya lo advierte.
- **B-04 · Filtro de Sentry incompleto.** `src/lib/observabilidad/privacidad.ts:7-19` borra `dni`, `whatsapp`, `documento`, `email`, `telefono`, `password`, `cookie`, `authorization`. No borra `apellido`, `antecedentes`, `matricula`, `storage_path`, `direccion`. Un error con esos campos en el contexto llegaría a Sentry. Arreglo: sumarlos a `CAMPOS_PROHIBIDOS`.
- **B-05 · Seed con contraseña fija.** `supabase/seed.sql:21` crea un usuario con contraseña `labia-prueba-1234` y `:57` le da rol admin. Solo se aplica en la base local y en CI (`ci.yml:85`, "migraciones + seed desde cero"). Riesgo: que alguien corra `supabase db reset` contra el proyecto remoto. Arreglo: dejar explícito en `supabase/README.md` que el seed es solo local, y no usar `--linked` con reset.
- **B-06 · `objetivo_existe` ejecutable por authenticated.** `supabase/migrations/20261015080000_moderacion.sql:126-144` permite a cualquier cuenta activa sondear si existe un id de perfil, trabajo o reseña. Los uuid no son enumerables, así que el impacto es bajo. Arreglo: limitar la consulta a las cuentas que van a reportar, o aceptar el riesgo y documentarlo.
- **B-07 · Reseña editable por cuenta suspendida.** `supabase/migrations/20261011200000_politicas.sql:709-712` (`resenas_editar_propia`) no chequea `cuenta_activa()`. Un suspendido puede cambiar `puntaje` y `texto` de su reseña hasta 24 h después de publicarla. Arreglo: agregar `privado.cuenta_activa()` a `using` y `with check`.
- **B-08 · Criterios de LAB-34 pendientes.** `scripts/sondeo-seguridad.ts` no existe en el repo (solo `barrios.ts` y `generar-perfiles.ts`). pgTAP no se corrió en este pase (ver "No probado"). El criterio "Script de sondeo de seguridad sin hallazgos" queda sin cumplir. Arreglo: crear el script (lee con la anon key y verifica que `verificaciones`, `contactos`, `usuarios` completos y `documentos` no se puedan leer) y correr `pnpm db:test` en un project_id aislado.
- **B-09 · Service role fuera de la lista cerrada.** `src/lib/cuenta/acciones.ts:277` llama `borrarCuentaDeUsuario(crearClienteAdmin(), …)`. La lista de AGENTS.md permite la clave en `src/lib/cuenta/borrado.ts`, pero acá se instancia desde una Server Action de usuario. La validación de sesión y reautenticación es correcta (`:247-272`), así que no es una falla de acceso, sino una deriva de la regla. Arreglo: que `borrado.ts` cree el cliente admin por sí mismo y reciba solo el uid, como hacen los jobs.
- **B-10 · Secreto de rate limit sin largo mínimo.** `src/lib/rate-limit-persistente.ts:34-35` acepta cualquier `RATE_LIMIT_SECRET` no vacío. `EMAILS_SECRET` exige 32 caracteres (`src/lib/emails/token.ts`). Arreglo: exigir el mismo mínimo.
- **B-11 · Login sin límite por cuenta.** `src/lib/auth/acciones.ts:21` (5 por minuto por IP), `:28`, `:75`. Cumple la guía (§7.7, por IP), pero un atacante con IPs rotativas puede probar contraseñas contra una cuenta. Supabase aplica sus propios límites en el proyecto hosted; verificarlos en el panel. Arreglo a considerar: límite adicional por email.
- **B-12 · Cookies sin configuración explícita.** El repo no fija `httpOnly`, `secure` ni `sameSite` en las cookies de sesión (`src/lib/supabase/servidor.ts`, `src/lib/supabase/proxy.ts`). Se usan los valores por defecto de `@supabase/ssr`, que no se verificaron contra su código en este pase. Arreglo: confirmar los valores por defecto en la versión instalada y fijar `sameSite: 'lax'` y `secure` explícitos.
- **B-13 · Salud pública sin límite.** `src/app/api/salud/route.ts` consulta la base en cada pedido, sin límite. Es un vector barato de carga. Arreglo: cache corto o límite por IP.

## Checklist de la tarea (puntos 1 a 10)

1. **RLS y migraciones:** cumple. RLS en las 14 tablas y `privado.cupos_limite`. Grants por columna para `usuarios`, `perfiles_profesionales`, `trabajos`, `postulaciones`, `resenas`, `reportes`, `verificaciones`. Inserciones y updates directos solo donde hay policy con checks (trabajos, postulaciones, resenas, reportes), y los campos sensibles (`rol`, `whatsapp`, `normas_*`, `estado`, `publicado`, `promedio`, `estado` de verificaciones y de postulaciones) se escriben solo por RPC o por trigger. Funciones `security definer` con `search_path = ''`. Cubierto por pgTAP (no corrido). Hallazgo: M-04.
2. **Storage:** `documentos` privado. El dueño solo inserta, sin select, update ni delete (`20261014210000_panel_verificacion.sql`, policy de insert). Admin sin lectura directa desde la sesión (`drop policy documentos_admin_leer`, `:293`). URLs firmadas de 60 s solo desde `firmarDocumento` (`src/lib/supabase/admin.ts`), con verificación de admin y registro en `accesos_documentos`. Borrado: 1 día para reemplazados y 30 días para decididos (`panel_verificacion.sql:34-36`), job diario `src/app/api/cron/limpiar-documentos`. Bucket `fotos`: público por diseño, pero las fotos de trabajos son el hallazgo H-02.
3. **Auth y sesión:** cumple con los hallazgos B-07 y B-11. Cada Server Action valida sesión, rol y Zod (verificado en `lib/*/acciones.ts`). Cuentas suspendidas: `obtenerSesion` devuelve `null` y el proxy redirige a `/suspendida`. `/admin`: el proxy responde 404 y el layout vuelve a verificar con `sesionAdmin()`. Callback sin open redirect: `volverSeguro` rechaza `//`, `\`, control chars y rutas de visitantes (`src/lib/auth/rutas.ts`).
4. **Service role:** `crearClienteAdmin` aparece en `/admin` (vía `sesionAdmin`), en jobs de cron, en `src/lib/emails/*`, en `src/lib/rate-limit-servicio.ts`, en `src/lib/admin/sesiones.ts` y en `src/lib/verificacion/limpieza.ts`. Fuera de la lista: `src/lib/cuenta/acciones.ts:277` (B-09). `SUPABASE_SERVICE_ROLE_KEY` solo se lee en `src/lib/supabase/admin.ts`. Ningún `NEXT_PUBLIC_` con secretos.
5. **Datos personales:** DNI y antecedentes solo como insignias en pantallas públicas. Sin dirección exacta (distancia entre centros de barrio). WhatsApp solo por `contactar_profesional` (la columna no se concede a anon ni a authenticated fuera del dueño). Exportación (`src/app/api/cuenta/datos/route.ts`) con lista blanca, rate limit y `no-store`. Borrado (`src/lib/cuenta/borrado.ts`): storage primero, luego `auth.users`, reseñas anonimizadas por `on delete set null`. Hallazgos: M-01, B-04, H-02. Retención pendiente (ver decisiones).
6. **Rate limit:** cubiertos con el limitador persistente: registro, ingreso, Google, restablecer, reenvío, documentos, normas, cuenta (y su borrado), postulación (30 por día), reporte (10 por día, por cuenta: M-05), reseñas, contacto, publicar trabajo, preferencias de email, exportación. `RATE_LIMIT_SECRET` obligatorio en producción y preview (`exigeSecretoDeLimite`). Pendientes: B-10 (largo mínimo), B-11 (por cuenta), M-03 (lecturas anónimas).
7. **Cabeceras y configuración:** no cumple (H-01). Cookies sin opciones explícitas (B-12). Secretos fuera del repo (ver "Probado"). `.env.example` sin valores. Ninguna variable `NEXT_PUBLIC_*` contiene un secreto.
8. **Dependencias:** `pnpm audit --prod` sin vulnerabilidades. Dependabot configurado (`.github/dependabot.yml`).
9. **Jobs y cron:** `cronAutorizado` compara con `timingSafeEqual` y exige `CRON_SECRET` no vacío (`src/lib/emails/cron.ts`). Sin el secreto, el endpoint responde 401 (verificado en código). `vercel.json` define los tres crons. Los endpoints `/api/cron/*` no tienen otra ruta de acceso.
10. **Pendientes para decisión de Emanuel:** ver la sección siguiente.

## Pendientes para decisión de Emanuel

1. **Enumeración de emails (M-02).** Confirmado: el registro distingue "ya existe". Recomendación: respuesta uniforme y aviso por email al dueño. Costo: un email extra por intento repetido.
2. **Cosecha de WhatsApp con muchas cuentas (M-03, escenario B).** Hoy el tope es de 20 contactos por día por cuenta, y las cuentas son gratis. Opciones: límite por IP y tope global por profesional (recomendado, sin costo de producto) o verificación de teléfono (costo de proveedor y de fricción).
3. **Sobrescritura de `user_metadata` en signUp.** Revisado: `src/lib/auth/registro-cliente.ts:99-100` manda `rol`, `nombre`, `apellido`, `whatsapp` y `barrio_id` como metadata. No hay escalada: `al_crear_usuario` solo acepta `rol = profesional` y nunca `admin`, y el callback vuelve a validar con Zod antes de escribir. El riesgo residual es que el WhatsApp queda en `auth.users` sin verificar hasta el primer ingreso. Recomendación: no guardar el WhatsApp en metadata. Severidad: BAJO.
4. **Backup de Storage.** Los backups de Supabase cubren la base, no los objetos de Storage en la misma forma. Los documentos de identidad borrados a los 30 días pueden seguir en copias externas que se hagan a mano. Decidir si hay backups de Storage y con qué retención. Relacionado: `accesos_documentos.storage_path` y `acciones_moderacion.objetivo_id` conservan el uuid del titular después del borrado (por auditoría). Decidir si se mantiene.
5. **Límite de reportes solo por cuenta (M-05).** Decidir el umbral y si se agrega límite por IP.

**Derecho de acceso (Ley 25.326):** la exportación no incluye quién accedió a los documentos del titular (`accesos_documentos`). Decidir si se agrega (BAJO, decisión de producto).

## Lo verificado sin hallazgos

- Políticas de `usuarios`, `perfiles_profesionales`, `verificaciones`, `trabajos`, `postulaciones`, `contactos`, `reportes`, `acciones_moderacion`, `accesos_documentos`, `emails_*`, `preferencias_email`: los permisos son mínimos y las escrituras sensibles pasan por RPC.
- Funciones `security definer`: todas con `search_path = ''`. Las expuestas a anon son `perfil_profesional` y `buscar_profesionales` (a propósito) y `distancia_km` (solo lee centros de barrio). Ninguna escribe. `consumir_cupo`, `revocar_sesiones_admin` y `documentos_huerfanos` solo para `service_role`.
- Funciones de moderación y admin (`suspender_cuenta_admin`, `reactivar_cuenta_admin`, `cerrar_trabajo_admin`, `ocultar_resena_admin`, `marcar_reporte_en_revision`, `resolver_reporte`, `decidir_documento`): verifican `privado.es_admin()` adentro del cuerpo. Funciones de flujo de trabajo (`elegir_postulante`, `cambiar_profesional`, `marcar_trabajo_terminado`, `cancelar_trabajo`, `retirar_postulacion`, `reactivar_postulacion`, `trabajos_para_mi`): verifican `auth.uid()`, rol y cuenta activa adentro del cuerpo.
- Trigger `privado.usuarios_proteger_columnas`: impide cambiar `rol`, `whatsapp`, `normas_*`, `datos_sensibles_*` y `estado` a anon y authenticated. `estado` además está revocado a nivel columna (`20261015090000_revocar_estado_usuarios.sql`).
- Rutas de fotos (`usuarios.foto_path`, `perfiles.fotos_trabajos`, `trabajos.fotos`): validadas por check constraint, así que no se puede apuntar a carpetas ajenas.
- Búsqueda: `limit` y `offset` acotados (`greatest(least(…,100),1)`); el orden de `p_orden` es una comparación, no SQL dinámico. No hay `execute` dinámico en ninguna migración.
- Reportes: origen fijado por trigger según `current_user` (no se puede forjar `sistema` desde la API). Autoreporte bloqueado.
- Callback de auth y `/api/baja`: sin redirecciones abiertas; `error_description` no se refleja.
- Cuentas suspendidas: no ven contenido de `(app)`, no pueden contactar, postular ni publicar (RLS con `cuenta_activa()`).
- `dangerouslySetInnerHTML`: solo dos scripts constantes o escapados. Ningún dato de usuario.
- Sentry: sin Session Replay. PostHog: `autocapture: false`, `capture_pageview: false`, `disable_session_recording: true`, `sendDefaultPii: false`.
- Service worker: no cachea respuestas de Supabase ni de otros orígenes.
- CI: `pull_request` (sin secretos para forks); el workflow de migraciones con secretos solo corre en push a `main`.
- Dependencias de producción: sin vulnerabilidades conocidas.

## Recomendación de orden

1. H-01: cabeceras y CSP (cambio chico, en `next.config.ts`, con test e2e de cabeceras).
2. H-02: plan de fotos de trabajos (job de borrado ya, bucket privado con URL firmada después).
3. M-01 y M-02 (validación y respuesta uniforme).
4. M-03 y M-04 (límites en lecturas anónimas y vista de reseñas).
5. M-05, B-01 a B-13 como tareas nuevas en Linear (fase 5, etiqueta Agente).
6. Antes de producción: correr `pnpm db:test` en un proyecto aislado y crear `scripts/sondeo-seguridad.ts` (B-08).
