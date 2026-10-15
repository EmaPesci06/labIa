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
