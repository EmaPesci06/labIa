# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Vecinos de Mar del Plata que necesitan un oficio, en dos situaciones que pesan lo mismo:

- **Urgencia:** algo se rompió (pierde la canilla, saltó la térmica, se quedaron afuera, hay olor a gas) y necesitan un profesional confiable rápido, casi siempre desde el celular.
- **Trabajo planificado:** quieren pintar, hacer carpintería o una instalación y comparan con tiempo.

Del otro lado, **profesionales de oficio** (carpintería, plomería, cerrajería, gas, pintura, mecánica, electricidad) que quieren conseguir clientes de su zona. Hay además un rol `admin` interno que verifica documentos y modera reportes.

Una cuenta tiene un solo rol: `cliente`, `profesional` o `admin`.

## Product Purpose

Conectar a vecinos con profesionales de oficio verificados y cercanos, para que contratar a alguien que entra a tu casa deje de depender del boca a boca. Éxito: el cliente encuentra a alguien confiable y le escribe por WhatsApp; el profesional consigue trabajos en su barrio.

## Positioning

Cuatro cosas juntas que Google, Facebook o un conocido no dan:

1. **Verificación:** cada profesional mostró DNI (frente y dorso) y antecedentes, y los gasistas también su matrícula, antes de aparecer en búsquedas. En pantalla solo se ven insignias, nunca los documentos.
2. **Cerca, por barrio:** se busca por barrio y se muestra la distancia entre centros de barrio; nunca se pide ni guarda la dirección exacta.
3. **Directo por WhatsApp:** sin chat interno ni pagos en la app; el contacto y el arreglo son entre las partes.
4. **Trabajos publicados:** el cliente publica lo que necesita y los profesionales se postulan; el cliente elige.

## Operating Context

- Uso mayoritario en celular (diseño a 390 px; escritorio desde 1024 px, pensado a 1440 px).
- Solo Mar del Plata en el MVP.
- El contacto sale de la app hacia WhatsApp (`wa.me`).
- Avisos por email (React Email + Resend).
- Instalable como PWA.

## Capabilities and Constraints

- Rutas: `/`, `/ingresar`, `/registro` (cliente y profesional), `/normas`, `/inicio`, `/buscar`, `/profesionales/[id]`, `/trabajos`, `/trabajos/nuevo`, `/trabajos/[id]`, `/mis-trabajos`, `/cuenta`, `/admin/verificaciones`, `/admin/reportes`, `/terminos`, `/privacidad`.
- Reseñas, reportes, borrado de cuenta, preferencias de email.
- Next.js 16, React 19, Tailwind 4, Supabase; componentes base de shadcn (Base UI) que no se editan a mano.
- Pre-lanzamiento: todavía sin profesionales reales en producción.

## Brand Commitments

- Nombre: **Oficio Seguro** (antes LabÍA).
- Logo fijo: insignia de verificado de 12 ondas con una llave inglesa adentro, naranja obra `#E0592A`, llave en arena `#F6F4EF`; nombre en Space Grotesk ("Oficio" 700, "Seguro" 400). Archivos en `docs/marca/`.
- Voz: español rioplatense con voseo ("Buscá", "Publicá tu trabajo"), clara y cercana.
- Evitar parecer una aseguradora (sin escudos, paraguas ni azul de banco como protagonista).

## Evidence on Hand

Nada todavía: no hay fotos reales de profesionales, ni profesionales piloto publicados, ni reseñas, testimonios o métricas. No inventar personas, números, reseñas ni fotos; usar marcadores honestos o estados vacíos.

## Product Principles

1. La confianza se demuestra, no se promete: la verificación se ve en cada profesional, como insignia.
2. Resolver en pocos toques desde el celular, tanto la urgencia como el trabajo planificado.
3. Lo cercano primero: barrio y distancia antes que listas infinitas.
4. La app conecta y se corre: el arreglo pasa por WhatsApp, sin intermediar.
5. Privacidad por defecto: nunca direcciones exactas ni documentos a la vista.

## Accessibility & Inclusion

WCAG AA: táctiles de 44 px, `label` en todos los campos, foco visible de 3 px, errores asociados con `aria-describedby`, `prefers-reduced-motion`, modo claro y oscuro. Público amplio de todas las edades, incluidos usuarios mayores y con poca experiencia digital.
