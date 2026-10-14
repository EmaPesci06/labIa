# Estado de LabÍA · traspaso del 2026-10-14

Foto al momento de pasar de Claude Code a Gemini. Confirmá contra Linear y `gh pr list` antes de actuar: puede haber cambiado.

## En main (Done)

LAB-5, 6, 8 a 28, 30, 33, 35, 40 y 43. Lo último que entró: LAB-28 (detalle del trabajo y postulación con precio y seña, 6be1f9c).

## PRs abiertos

Ninguno. Todos los PRs previos (LAB-43 #28, LAB-21 #30, LAB-27 #32, LAB-28 #33) fueron integrados en `main` con CI en verde.

## Próximas tareas (Todo)

- LAB-29 (mis trabajos del cliente: ver postulantes y elegir a uno): destrabada tras LAB-28.
- LAB-32 (reportes y moderación): destrabada por LAB-21.
- Después: LAB-31 (reseñas de clientes a profesionales), LAB-42 (borrado de documentos a 30 días), LAB-34 (QA final).
- LAB-41 (rate limit persistente y helpers de auth) está en Backlog: hacerlo antes de producción (LAB-37).

## Decisiones tomadas que no están en las tareas

- Los documentos aprobados se borran a los 30 días; la insignia queda (minimizar datos sensibles).
- Se puede volver de profesional a cliente mientras la cuenta no tenga datos (LAB-40).
- El consentimiento de datos sensibles lo exige la base: política del bucket y RPC `registrar_documento` (LAB-43).

## Pendientes de Emanuel

- LAB-7 (dominio y cuentas de Resend, Sentry y PostHog) y LAB-36 (revisión legal).
- Activar "Secure password change" en el Supabase de producción.
- Decidir la defensa contra la cosecha de números de WhatsApp con muchas cuentas de cliente (hoy: 20 contactos por día
  por cuenta). Mínimo: email confirmado obligatorio en producción.
- Docker Desktop no arranca: sin él no hay base local.
