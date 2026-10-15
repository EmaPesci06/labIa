# Runbook de puesta en producción · LabÍA

Paso a paso para Emanuel, en el orden en que conviene hacerlos. Cada paso dice si es **manual** (lo hace
Emanuel en un panel) o si ya lo deja hecho el repo. Lo que pide una cuenta paga o un dominio depende de
**LAB-7** (dominio y cuentas de Resend, Sentry y PostHog) y de **LAB-41** (endurecer auth).

Nunca pegues claves en el repo, en Linear ni en el chat. Los valores van solo en los paneles de Supabase,
Vercel, GitHub, Resend, Sentry y PostHog.

---

## 0. Qué ya está en el repo

- `src/app/robots.ts` y `src/app/sitemap.ts`: bloquean `/admin`, `/api`, `/cuenta`, `/inicio`,
  `/mis-trabajos` y `/trabajos`. Los previews de Vercel responden `Disallow: /` para que no se indexen. El
  sitemap usa `NEXT_PUBLIC_SITE_URL` (o la URL de Vercel si falta) y agrega los perfiles publicados.
- `GET /api/salud`: responde `200 {"estado":"ok","base":"ok"}` si la base contesta, y `503` con
  `{"estado":"error","base":"error"}` si no. No devuelve datos, nombres de tablas ni mensajes de error.
- Crons de Vercel en `vercel.json` (`trabajos-cerca`, `pedir-resena`, `limpiar-documentos`,
  `borrar-documentos`). Cada uno exige `Authorization: Bearer $CRON_SECRET`.
- Migraciones a producción en `.github/workflows/migraciones.yml`, detrás de la variable
  `MIGRAR_PRODUCCION` y del entorno `produccion` con aprobación manual.
- Los barrios de Mar del Plata ya viajan en la migración `20261011190100_barrios_mar_del_plata.sql`.
  `supabase/seed.sql` tiene solo datos de prueba y **no** se aplica a producción (el workflow no lo corre).
  Por eso no hizo falta separar el seed.

---

## 1. Base de datos `labia-prod` (manual)

1. En Supabase, activar el plan **Pro** para la organización. Crear el proyecto **`labia-prod`** en la
   región **São Paulo (sa-east-1)**.
2. Guardar la contraseña de la base en un gestor de contraseñas. No va al repo.
3. Anotar el **Project Ref** (Project Settings → General).
4. En Authentication → Providers, dejar **Email** activo.
5. En Authentication → Sign In / Providers → Email: activar **Confirm email**.
6. En Authentication → Sign In / Providers → Email (o Password settings): activar **Secure password change**
   (pide la contraseña actual antes de cambiarla).
7. En Authentication → URL Configuration:
   - **Site URL**: `https://<dominio-propio>` (el dominio que se elija en el paso 2 de Vercel).
   - **Redirect URLs**: `https://<dominio-propio>/**` y `https://www.<dominio-propio>/**`. No agregar
     `localhost` en producción.
8. Plantillas de email de Auth en castellano: ver el paso 3.6.

### 1.1 Migraciones (automático con aprobación)

1. En GitHub, Settings → Secrets and variables → Actions:
   - Secretos: `SUPABASE_PROJECT_REF_PROD` y `SUPABASE_DB_PASSWORD_PROD`. (`SUPABASE_ACCESS_TOKEN` ya existe.)
   - Variable de repositorio: `MIGRAR_PRODUCCION` = `true`. Activarla recién cuando el primer deploy esté listo.
2. Settings → Environments → crear **`produccion`** con **Required reviewers** (Emanuel). Así cada
   `db push` a producción espera una aprobación manual.
3. Al mergear a `main` con migraciones nuevas, el job `produccion` queda esperando aprobación. Revisar y
   aprobar en la pestaña Actions.
4. Verificar en Supabase → Database → Migrations que estén todas las de `supabase/migrations/`.
5. Verificar que la base no tenga usuarios de prueba (`@labia.test`). Debe tener solo la cuenta de Emanuel
   que se crea en la sección 7.

### 1.2 Backups y recuperación

1. Supabase → Project Settings → Database → Backups: confirmar que los **backups diarios** estén activos
   (incluidos en Pro).
2. La recuperación a un punto exacto (PITR) es un complemento pago. Decidir antes del lanzamiento; el
   mínimo es el backup diario.
3. **Probar la restauración una vez** (criterio de aceptación de LAB-37):
   1. Supabase → Backups → elegir el backup diario más reciente → restaurar en un **proyecto nuevo
      temporal** (p. ej. `labia-restore-prueba`). Así no se toca `labia-prod`.
   2. Esperar a que levante y comprobar que existen las tablas, que los barrios están cargados y que no
      hay cuentas de prueba.
   3. Borrar el proyecto temporal al terminar.
   4. Anotar la fecha en la sección 8.

### 1.3 pg_cron

El borrado de documentos corre con Vercel Cron (`/api/cron/borrar-documentos`), no con `pg_cron`. No hace
falta activar `pg_cron` salvo que se agregue un job dentro de la base.

---

## 2. Vercel producción (manual)

1. Vercel → proyecto `labia` → Settings → Environment Variables. Para cada variable marcar **Production**
   (salvo que se indique otra cosa):
   - `NEXT_PUBLIC_SITE_URL` = `https://<dominio-propio>` (sin barra final).
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` = las de **`labia-prod`**.
   - `SUPABASE_SERVICE_ROLE_KEY` = la de `labia-prod` (solo servidor).
   - `CRON_SECRET` = generar uno nuevo con `openssl rand -base64 32`. Distinto del de Preview y del de
     desarrollo. Vercel lo manda solo como `Authorization: Bearer` a los crons.
   - `EMAILS_SECRET` = `openssl rand -base64 32`, distinto del de desarrollo.
   - `RESEND_API_KEY`, `EMAIL_REMITENTE` (`LabÍA <hola@<dominio>>`), `EMAIL_SOPORTE` (LAB-7).
   - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (LAB-7).
   - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (LAB-7).
   - `NEXT_PUBLIC_LEGALES_REVISADOS` = `true` solo después de la revisión legal (LAB-36).
2. **Verificar que las variables de sesión falsa no existan en Production ni en Preview.** Son
   `LABIA_ROL_DEV`, `LABIA_ID_DEV` y `LABIA_PERMITIR_ROL_DEV`. Si alguna aparece, borrarla. Con `LABIA_ROL_DEV`
   cargada, la app simula un usuario sin Supabase.
3. Preview: las variables de Preview apuntan a `labia-dev`, no a `labia-prod`. Revisar que
   `NEXT_PUBLIC_SITE_URL` esté vacía en Preview (la usa `src/lib/sitio.ts`).
4. Settings → Domains: agregar `<dominio-propio>` y `www.<dominio-propio>`. Configurar `www` como
   **redirect** hacia el dominio principal. HTTPS lo emite Vercel solo.
5. DNS en el proveedor del dominio: usar los registros exactos que muestre Vercel en Settings → Domains.
   Esperar la propagación y verificar el candado en el navegador.
6. Settings → Git → Production Branch: `main`.
7. Después del primer deploy de producción, confirmar en Vercel → Settings → Cron Jobs que aparecen los
   cuatro crons. Ver la última ejecución en Logs.
8. Deploy: mergear a `main` o usar "Redeploy" sobre el último deploy de `main`.

---

## 3. Dominio y correo (manual)

1. **Resend → Domains → Add domain**: `<dominio-propio>`.
2. Cargar en el DNS los registros que muestra Resend:
   - **SPF**: TXT en el dominio raíz, con el valor que indique Resend.
   - **DKIM**: TXT o CNAME con el selector que indique Resend.
   - **DMARC** (recomendado): TXT en `_dmarc` con `v=DMARC1; p=none; rua=mailto:<casilla>`.
3. Esperar a que Resend marque el dominio como **Verified**.
4. Poner la API key de producción en Vercel (`RESEND_API_KEY`) y `EMAIL_REMITENTE` con el dominio verificado.
5. **SMTP para los mails de auth**: Supabase (labia-prod) → Authentication → SMTP Settings → Enable custom
   SMTP. Host `smtp.resend.com`, puerto 465 (o 587), usuario `resend`, contraseña = API key de Resend de
   producción, remitente `hola@<dominio-propio>`. Probar con el registro de la sección 9.
6. Plantillas de Auth en castellano (Authentication → Email Templates): revisar asunto y cuerpo de
   "Confirm signup", "Reset password" y "Magic link". Deben nombrar a LabÍA y usar `{{ .ConfirmationURL }}`.

---

## 4. Sentry (manual + alertas)

1. Sentry → crear proyecto para Next.js (`labia`). Copiar el DSN (no es secreto).
2. Cargar `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` (mismo valor) en Vercel Production. Cargar también
   `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN` para subir los source maps en el build.
3. Alertas (Alerts → Create Alert):
   - **Error nuevo**: "A new issue is created", con email a Emanuel.
   - **Pico de errores**: "Number of errors" mayor a 20 en 1 hora, con email a Emanuel.
4. Verificar que un error llegue a Sentry sin datos personales (sin emails, DNI ni WhatsApp). Probarlo en
   local con `/dev/error`, que no existe en producción.

---

## 5. PostHog (manual)

1. PostHog → crear proyecto `labia`. Elegir región (`us.i.posthog.com` o `eu.i.posthog.com`).
2. Cargar `NEXT_PUBLIC_POSTHOG_KEY` (la **Project API key**, `phc_…`, pública) y `NEXT_PUBLIC_POSTHOG_HOST`
   en Vercel Production.
3. Verificar en PostHog → Activity que lleguen eventos anónimos y que no haya emails ni nombres en las
   propiedades.

---

## 6. Monitor de disponibilidad (manual)

1. Crear una cuenta gratuita en **UptimeRobot** o **Better Stack**.
2. Monitor HTTP(S): URL `https://<dominio-propio>/api/salud`, intervalo de 5 minutos, con palabra clave
   `"estado":"ok"` (así también detecta un 503 con cuerpo de error).
3. Alerta por email a Emanuel cuando el monitor esté caído por más de dos chequeos seguidos.
4. Probar la alerta con una URL inexistente en un monitor de prueba.
5. **Rate limit en el firewall de Vercel para `/api/salud`** (recomendado al activar el dominio): Vercel →
   proyecto `labia` → Firewall → Rules → Rate limiting. Regla sobre la ruta `/api/salud`, límite por IP
   (p. ej. 60 pedidos por minuto) y acción `deny` o `challenge`. El monitor hace un pedido cada 5 minutos, así
   que no se ve afectado. El límite evita que alguien use el endpoint para consumir conexiones a la base.

---

## 7. Primer admin (manual, no va al repo)

1. Registrarse en producción con la cuenta de Emanuel (como cliente).
2. En Supabase (labia-prod) → SQL Editor, ejecutar el siguiente SQL reemplazando el email. **No guardar el
   email en el repo ni en Linear:**

   ```sql
   update public.usuarios set rol = 'admin'
   where id = (select id from auth.users where email = '<email-de-emanuel>');
   ```

   El alta nunca crea admins: por eso se promueve a mano.

3. Cerrar sesión y volver a entrar. `/admin/verificaciones` tiene que abrir.

---

## 8. Registro de lo ejecutado

| Paso                                          | Fecha | Responsable | Notas |
| --------------------------------------------- | ----- | ----------- | ----- |
| Proyecto `labia-prod` creado (Pro, sa-east-1) |       |             |       |
| Migraciones aplicadas con aprobación          |       |             |       |
| Restauración probada en proyecto temporal     |       |             |       |
| Dominio y HTTPS                               |       |             |       |
| Resend verificado (SPF/DKIM)                  |       |             |       |
| SMTP de Auth configurado                      |       |             |       |
| Sentry con alertas                            |       |             |       |
| PostHog recibiendo eventos                    |       |             |       |
| Monitor de `/api/salud`                       |       |             |       |
| Primer admin                                  |       |             |       |

---

## 9. Prueba de humo en producción

1. Registrar un cliente de prueba con un email propio y confirmarlo desde el link que llega por Resend.
2. Buscar un oficio en `/buscar`. Si no hay perfiles publicados, la búsqueda debe mostrar el estado vacío
   sin errores.
3. Borrar esa cuenta desde `/cuenta` (borrado de cuenta, LAB-33).
4. Abrir `https://<dominio-propio>/api/salud`: debe responder `{"estado":"ok","base":"ok"}`.
5. Abrir `https://<dominio-propio>/robots.txt` y `/sitemap.xml`: sin `/admin`, `/cuenta` ni `/api`.

---

## 10. Checklist de lanzamiento

- [ ] `labia-prod` en Pro, São Paulo, con backups diarios y restauración probada (sección 8).
- [ ] Migraciones aplicadas con aprobación manual en el entorno `produccion`.
- [ ] La base de producción no tiene cuentas `@labia.test` ni datos de prueba.
- [ ] Confirm email y Secure password change activos.
- [ ] Site URL y Redirect URLs con el dominio propio. Google OAuth con el dominio de producción.
- [ ] `CRON_SECRET`, `EMAILS_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` nuevos y solo en Production.
- [ ] `LABIA_ROL_DEV`, `LABIA_ID_DEV` y `LABIA_PERMITIR_ROL_DEV` no existen en Preview ni en Production.
- [ ] Dominio con HTTPS, `www` redirige al dominio principal.
- [ ] Resend verificado (SPF, DKIM) y SMTP de Auth activo. Los mails llegan desde el dominio propio.
- [ ] Sentry recibe errores y las dos alertas están creadas.
- [ ] PostHog recibe eventos sin datos personales.
- [ ] Monitor de `/api/salud` activo con alerta.
- [ ] Primer admin asignado (sección 7).
- [ ] Prueba de humo completa (sección 9).
- [ ] Textos legales revisados por abogado (LAB-36) antes de quitar el aviso de borrador.

---

# Parte 2 · Operación del día a día

Las secciones 11 a 16 sirven después del lanzamiento. Cuando un paso necesita la cuenta `labia-prod`, el dominio o una cuenta de servicio, lleva la marca **[PENDIENTE LAB-7]**. Los demás pasos se pueden seguir con lo que ya existe en el repo.

## 11. Desplegar

1. Abrir un PR contra `main`. La CI tiene que pasar: lint, typecheck, test, build, pgTAP si hay migraciones y e2e si toca un flujo.
2. Vercel crea un preview por PR con las variables de Preview (que apuntan a `labia-dev`). Probar ahí.
3. Si el PR trae migraciones, el workflow `migraciones.yml` las aplica primero a `labia-dev` y después espera la aprobación del entorno `produccion` para aplicarlas a `labia-prod`. **[PENDIENTE LAB-7]** (requiere `labia-prod`).
4. Las migraciones tienen que ser compatibles con el código que sigue corriendo mientras se despliega. Si un cambio renombra o borra columnas, se hace en dos PR: primero agregar lo nuevo y desplegar, después quitar lo viejo.
5. Squash-merge a `main`. Vercel despliega producción solo. Si el deploy sale antes de que se apruebe la migración, aprobarla en la pestaña Actions en cuanto aparezca.
6. Verificar después del deploy: `https://<dominio-propio>/api/salud` responde `{"estado":"ok","base":"ok"}` y la home carga. **[PENDIENTE LAB-7]** (dominio).

## 12. Revertir un deploy de la app

1. Vercel → proyecto `labia` → **Deployments** → elegir el último deploy bueno de Production → menú `…` → **Instant Rollback** (o "Promote to Production" sobre ese deploy). Vercel lo deja activo sin recompilar. Si el nombre del botón cambió, buscar la acción equivalente en ese menú.
2. Verificar `/api/salud` y la home.
3. Las variables de entorno **no** vuelven atrás con el rollback. Si la falla viene de una variable, corregirla en Settings → Environment Variables y redeployar.
4. Arreglar la causa en un PR nuevo. No volver a mergear el cambio malo.

## 13. Revertir una migración

Regla: una migración mergeada en `main` nunca se edita ni se borra. Para revertir se escribe una migración nueva hacia adelante.

- **Migración inversa** cuando el cambio no destruyó datos (agregar una columna, un índice, una política, una función). Se escribe la inversa (`drop policy`, `drop function`, `drop index`, etc.) con timestamp posterior a la última, con su test pgTAP, y pasa por PR como cualquier otra.
- **Restaurar un backup** (sección 14) cuando la migración borró o alteró datos (un `drop` de tabla o columna con datos, un `update` masivo mal hecho) y no se puede reconstruir. Se pierden los cambios hechos entre el backup y el incidente. Con PITR se elige el instante justo antes de la migración.
- Nunca correr `supabase db reset` contra producción. Nunca editar una migración ya aplicada: la CLI no tiene "down" y el workflow no la vuelve a aplicar.

Pasos: (1) si la falla afecta a usuarios, revertir el deploy de la app (sección 12) primero; (2) diagnosticar con `supabase migration list` contra `labia-prod` **[PENDIENTE LAB-7]**; (3) elegir migración inversa o restauración; (4) PR, aprobación en el entorno `produccion` y verificación.

## 14. Restaurar un backup de la base

Supabase Pro hace backups diarios. Se activan y se miran en Project Settings → Database → Backups **[PENDIENTE LAB-7]**. Hay dos opciones:

- **Backup diario**: restaurar reemplaza la base del proyecto. Sirve para un desastre total. La retención en Pro es de 7 días (verificar en el panel).
- **PITR (Point in Time Recovery)**: restaurar a un instante exacto. Es un complemento pago de Pro. La decisión de contratarlo está en la sección 1.2 **[PENDIENTE LAB-7]**.

**Prueba de restauración** (una vez antes del lanzamiento y después de cambios grandes de esquema):

1. Elegir un backup diario en el panel de `labia-prod`.
2. Restaurar en un **proyecto temporal**, nunca sobre `labia-prod`. Si el panel solo restaura sobre el mismo proyecto, bajar un dump lógico con `pg_dump` usando la cadena de conexión del panel (no se guarda en el repo) y cargarlo en el temporal con `psql` o `pg_restore`. **[PENDIENTE LAB-7]**
3. Verificar en el temporal: `select count(*) from public.barrios;` (debe ser mayor que cero), `select count(*) from public.usuarios;` (sin cuentas `@labia.test`) y `supabase migration list` contra el temporal (todas aplicadas).
4. Borrar el proyecto temporal y anotar la fecha en la sección 8.

**Restauración real sobre `labia-prod`**: solo con Emanuel presente. Antes: avisar a las personas usuarias si el corte es visible, congelar los deploys y guardar una copia del estado actual.

**Límite conocido**: el backup de la base no incluye los archivos del bucket `documentos` ni `fotos` (Storage). Esos archivos necesitan su propia estrategia de respaldo. Decidir antes del lanzamiento y anotarlo en Linear **[PENDIENTE LAB-7]**.

## 15. Rotar claves

Orden general para cualquier clave:

1. Generar la clave nueva en el panel del proveedor. No revocar la anterior todavía.
2. Cargarla en Vercel (Production) y, si la usa GitHub Actions, con `gh secret set <NOMBRE>`. Redeployar.
3. Verificar con la comprobación de la tabla.
4. Revocar la clave anterior.

Los valores nunca se pegan en el chat, en Linear ni en el repo. Para generar secretos: `openssl rand -base64 32`. Las comprobaciones se hacen con una variable local de la shell, sin imprimirla.

| Clave                                               | Dónde se genera                                                                               | Dónde se carga                                                                         | Verificación                                                                                                                          | Notas                                                                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`                         | Supabase → `labia-prod` → Project Settings → API (o "API Keys" si el panel usa claves nuevas) | Vercel Production                                                                      | `/admin/verificaciones` carga para un admin; `/api/cron/limpiar-documentos` con Bearer responde 200                                   | Solo servidor. **[PENDIENTE LAB-7]**                                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                     | Mismo panel                                                                                   | Vercel Production                                                                      | `/api/salud` responde `ok`                                                                                                            | Es pública. Rotar solo si hace falta. **[PENDIENTE LAB-7]**                                                               |
| `CRON_SECRET`                                       | `openssl rand -base64 32`                                                                     | Vercel Production, luego redeploy                                                      | `curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/limpiar-documentos` responde 200; sin el header responde 401 | Vercel manda el valor nuevo a los crons después del redeploy. **[PENDIENTE LAB-7]**                                       |
| `RESEND_API_KEY`                                    | Resend → API Keys                                                                             | Vercel Production **y** Supabase → Authentication → SMTP Settings (usa la misma clave) | Un registro de prueba recibe el mail de bienvenida                                                                                    | Revocar la anterior recién después. **[PENDIENTE LAB-7]**                                                                 |
| `EMAILS_SECRET`                                     | `openssl rand -base64 32`                                                                     | Vercel Production, luego redeploy                                                      | Un email nuevo trae un link de baja que funciona                                                                                      | Rotarla invalida los links de baja de emails ya enviados. Hacerlo solo si hay sospecha de filtración, y avisar en Linear. |
| `SENTRY_AUTH_TOKEN`                                 | Sentry → Settings → Auth Tokens                                                               | Vercel Production                                                                      | Build con source maps sin error                                                                                                       | Solo lo usa el build. **[PENDIENTE LAB-7]**                                                                               |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`             | Sentry → Client Keys                                                                          | Vercel Production (mismo valor en las dos)                                             | Un error de prueba llega a Sentry                                                                                                     | Son públicos. Rotar solo si hay abuso.                                                                                    |
| `NEXT_PUBLIC_POSTHOG_KEY`                           | PostHog (Project API key)                                                                     | Vercel Production                                                                      | Llegan eventos en Activity                                                                                                            | Es pública. Rotar solo si hay abuso; consultar con soporte de PostHog.                                                    |
| Contraseña de la base (`SUPABASE_DB_PASSWORD_PROD`) | Supabase → Database settings → Reset database password                                        | GitHub: `gh secret set SUPABASE_DB_PASSWORD_PROD`                                      | El workflow `migraciones.yml` conecta                                                                                                 | Rotarla no afecta a la app, que usa las claves de API. **[PENDIENTE LAB-7]**                                              |

Rotar el **JWT secret** de Supabase invalida todas las sesiones y todas las claves. Solo se hace ante una filtración confirmada, y avisando a las personas usuarias.

## 16. Dar de baja a un usuario

Hay dos casos distintos. No se mezclan.

### A. Baja voluntaria (la persona quiere borrar su cuenta)

- **Camino preferido**: la persona entra y borra su cuenta en `/cuenta/borrar` (LAB-33). Tiene que escribir `BORRAR` y reautenticarse (contraseña, o un ingreso con Google). Después el sistema corre `borrarCuentaDeUsuario` (`src/lib/cuenta/borrado.ts`): borra sus fotos y documentos del bucket, luego `auth.users`. La cascada borra `usuarios` y lo que cuelga de ahí. Las reseñas que escribió quedan anónimas y los trabajos asignados a un profesional se cancelan. En `acciones_moderacion` queda solo el id y la fecha.
- **Si no puede entrar**: responder el pedido desde el **mismo email registrado** (si llega desde otra casilla, pedir confirmación desde la registrada). No pedir DNI, contraseña ni otros datos sensibles por mail.
- **Si el pedido llega por email y la persona no puede entrar**: no hay una acción de borrado en la app para el equipo (LAB-32 es de moderación, no de borrado). El borrado manual con SQL no se hace sin autorización escrita de Emanuel y sin dejar registro. Si hace falta, se abre una tarea nueva.

### B. Suspensión (cortar el acceso sin borrar)

Se usa por reportes confirmados o por incumplimiento de las normas. El efecto ya está en la base y en la app, aunque la acción de admin llega con LAB-32:

- `usuarios.estado = 'suspendida'`. La app trata la sesión como inexistente (`src/lib/sesion.ts`). Las políticas de RLS dejan de mostrar su perfil y sus trabajos (`privado.usuario_activo`). Si la cuenta es un admin, pierde sus facultades (`privado.es_admin` exige `estado = 'activa'`).
- **Con LAB-32 mergeado**: la suspensión y la reactivación se hacen desde `/admin/reportes`. **[PENDIENTE LAB-32]** (PR #37 abierto, sin mergear).
- **Hasta entonces**, solo con autorización de Emanuel, en el SQL Editor de `labia-prod`: `update public.usuarios set estado = 'suspendida' where id = '<uuid>';`. Anotar el motivo y la fecha en la tarea de Linear correspondiente, porque este cambio no deja registro en `acciones_moderacion`. **[PENDIENTE LAB-7]**
- Reactivar: `estado = 'activa'`, con el mismo registro.

### Datos de quien se va

Los documentos (DNI, antecedentes) se borran con la cuenta. Los documentos ya revisados y los huérfanos los limpian los crons de la sección 17. Las fotos de perfil y de trabajos salen del bucket `fotos` en el mismo borrado.

## 17. Crons y mantenimiento

Configurados en `vercel.json`. Cada uno exige `Authorization: Bearer $CRON_SECRET`:

| Ruta                           | Horario (UTC) | Qué hace                                                                                   |
| ------------------------------ | ------------- | ------------------------------------------------------------------------------------------ |
| `/api/cron/trabajos-cerca`     | 11:00 diario  | Avisos de trabajos cerca a profesionales (ver la ruta)                                     |
| `/api/cron/pedir-resena`       | 12:00 diario  | Pide reseñas 24 h después de terminar un trabajo y manda avisos de postulaciones agrupados |
| `/api/cron/limpiar-documentos` | 06:00 diario  | Borra documentos vencidos y huérfanos del bucket `documentos` (LAB-21)                     |
| `/api/cron/borrar-documentos`  | 06:00 diario  | Borra documentos revisados hace más de 30 días y huérfanos de más de 24 h (LAB-42)         |

Ver ejecuciones: Vercel → proyecto `labia` → Cron Jobs y Logs. Si un cron falla, revisar el log y el estado de `CRON_SECRET` (sección 15). **[PENDIENTE LAB-7]** para ver ejecuciones reales de producción.

Nota: `pg_cron` no se usa. El borrado de documentos corre con Vercel Cron.
