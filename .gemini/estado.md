# Estado de LabÍA · traspaso del 2026-10-14

Foto al momento de pasar de Claude Code a Gemini. Confirmá contra Linear y `gh pr list` antes de actuar: puede haber cambiado.

## En main (Done)

LAB-5, 6, 8 a 30, 33, 35, 40 y 43. Lo último que entró: LAB-29 (mis trabajos del cliente: ver postulantes y elegir a uno, PR #34, commit 70c52a2).

## Tareas en desarrollo activo en paralelo (Subagentes)

- LAB-42: Borrar documentos de verificación 30 días después de revisados (subagente Backend Security Dev).
- LAB-31: Reseñas de clientes a profesionales (subagente Fullstack Dev).
- LAB-32: Reportes y moderación: reportar perfiles, trabajos y reseñas, y suspender cuentas (subagente Fullstack Dev).

## Próximas tareas pendientes

- LAB-34 (QA final, accesibilidad y rendimiento).
- LAB-41 (rate limit persistente y helpers de auth) antes de producción (LAB-37).

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
