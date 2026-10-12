# emails

Plantillas de React Email para los envíos con Resend (LAB-30). Una por archivo, con `export default`
y `PreviewProps`; el diseño común (marca, botón, pie con baja) está en `src/lib/emails/Layout.tsx`.

- Vista previa: `pnpm email:dev` (http://localhost:3001).
- Envío: `enviarEmail` en `src/lib/emails/enviar.ts` (nunca lanza; sin `RESEND_API_KEY` no hace nada).
- Los flujos no mandan emails a mano: llaman a las funciones de `src/lib/emails/avisos.ts`
  (`avisarBienvenidaCliente(usuarioId)`, `avisarNuevaPostulacion(postulacionId)`, …).
- Ningún email lleva DNI, teléfonos ni direcciones: solo nombres, barrios y links.
- Los hex de la marca viven en `Layout.tsx` (los clientes de correo no soportan variables CSS).
