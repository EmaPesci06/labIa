# Estado de LabÍA · traspaso del 2026-10-14

Foto al momento de pasar de Claude Code a Gemini. Confirmá contra Linear y `gh pr list` antes de actuar: puede haber cambiado.

## En main (Done)

LAB-5, 6, 8 a 20, 22 a 26, 30, 33, 35 y 40. Lo último que entró: LAB-25 (contacto por WhatsApp, 6e39329).

## PRs abiertos

| Tarea                                                                       | PR  | Estado                                                                               | Próximo paso                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LAB-43 · Cabos de verificación (consentimiento, normas, enlaces de /cuenta) | #28 | Corregido tras un BLOQUEADO de seguridad; esperando la segunda revisión de seguridad | Seguridad, revisión, merge. Migración `20261014205000`. Va **antes** que LAB-21                                                                                                                                |
| LAB-21 · Panel de verificación para el equipo                               | #30 | Corregidos 2 ALTO de seguridad y el bug del visor; falta CI verde                    | Cuando LAB-43 esté en main: actualizar y recrear `documentos_subir_propios` con **consentimiento + cuota** (ver comentario 6178519406 del PR). Después seguridad, revisión y merge. Migración `20261014210000` |

## Próximas tareas (Todo)

- LAB-27 (lista de trabajos para profesionales): se destraba con LAB-21.
- LAB-32 (reportes y moderación): se destraba con LAB-21.
- Después: LAB-28 → LAB-29 → LAB-31, LAB-42 (borrado de documentos a 30 días; revisar si LAB-21 ya lo cubre), LAB-34 (QA final).
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
