# Prototipo nuevo de LabÍA: "Verano en la costa"

Copia del lienzo de Claude **"LabÍA · Exploración de UI nueva"**, página "Verano en la costa":
https://claude.ai/artifact/BCphX9KfTW2pSMyupZXBwc (privado; esta carpeta es la copia que leen los agentes).

Este prototipo **reemplaza** a `docs/prototipo/`. La interfaz actual se rehace entera con este diseño. La lógica, los
datos, la seguridad y las rutas no cambian: solo cambian el marcado, los estilos y los textos de pantalla.

Cómo se pasa un boceto a código: [`CONSTRUCCION.md`](CONSTRUCCION.md). Las tareas están en Linear, milestone
**Fase 7 · Interfaz nueva** (LAB-67 a LAB-81); la tabla "Tareas" de más abajo dice cuál es cada una.

## Cómo leer los archivos

Cada `*.dc.html` es una pantalla: HTML con estilos inline. Importa el marcado dentro de `<x-dc>`; el resto es andamiaje
del lienzo.

| Prefijo | Qué es | Tamaño |
| --- | --- | --- |
| `App-*` | Pantalla de celular en modo claro | 390×844 |
| `Oscuro-*` | La misma pantalla en modo oscuro (mismo nombre que su `App-*`) | 390×844 |
| `App-Escritorio`, `Esc-*` | Pantalla de escritorio en modo claro | 1440×900, fluida |
| `Email-*` | Email | 600×760 |
| `Sistema-Tokens` | Colores y piezas base en claro y oscuro | 880×844 |

- **No copies hex.** Cada color inline corresponde a un token (tabla de abajo). Los tokens se definen una sola vez en
  `src/app/globals.css` y los componentes usan la clase del token.
- Las pantallas `Oscuro-*` salen de aplicar los tokens oscuros a su `App-*`: si una pantalla usa bien los tokens, el
  modo oscuro sale solo. Sirven para comparar, no para escribir estilos aparte.
- Los nombres y datos (Marta R., Carla, La Perla) son de ejemplo.
- Las fotos son recuadros con la palabra "Foto": en la app van con `next/image`.

## Sistema de diseño

Tipografías: **Baloo 2** (700 y 800) para títulos, nombres y la marca; **Nunito Sans** (400 y 700) para todo lo demás.
Reemplazan a Archivo, Atkinson Hyperlegible Next e IBM Plex Mono.

| Token (nombre sugerido) | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `fondo` | `#FFF3D6` arena | `#0B2730` mar de noche | Fondo de página |
| `superficie` | `#FFFFFF` | `#17485A` | Tarjetas, barra inferior, pies |
| `texto` | `#123B4A` | `#FFF3D6` | Texto y bordes de campos |
| `accion` | `#0E7C86` turquesa | `#45C4CC` | Botón principal, enlaces, tildes |
| `sobre-accion` | `#FFFFFF` | `#0B2730` | Texto sobre el botón principal |
| `encabezado` | `#0E7C86` | `#0E7C86` (igual) | Encabezados de pantalla, texto blanco |
| `sol` | `#F7C948` | `#F7C948` (igual) | Elegido, distancia, avisos; texto siempre `#123B4A` |
| `coral` | `#F25C54` | `#F25C54` | Solo adorno (toldos), nunca texto |
| `error` | `#A62B24` | `#FF9A8F` | Errores, borrar, suspender |
| `equipo` | `#123B4A` | `#17485A` | Encabezado del panel de administración |

Piezas (ver `Sistema-Tokens.dc.html`):

- Botón principal: alto 56, radio 18, sin borde. Secundario: alto 52, borde de 3 px color `texto`, fondo transparente.
- Chip: alto 46, radio 23. Elegido en `sol`, sin elegir en `superficie`.
- Campo: alto 52, radio 16, borde de 2 px color `texto`, fondo `superficie` en claro y `fondo` en oscuro.
- Tarjeta: radio 22, sin sombra ni borde.
- Encabezado de pantalla: bloque `encabezado` con esquinas inferiores de radio 28 (40 en escritorio).
- Toldo: franja rayada de 14 a 26 px (`repeating-linear-gradient`) arriba de las tarjetas de oficio y de los avisos.
- Avatar: círculo con inicial y borde `sol`.
- Foco: `outline: 3px solid`, color `texto` en claro y `sol` en oscuro, `outline-offset: 2px`.
- Íconos: SVG de trazo de 3 a 3,5 px. Sin emojis.

Lo que **se va** del diseño anterior: el naranja `#D45F3A`, la cinta métrica y las tres tipografías viejas.
`AGENTS.md` todavía los nombra: se actualiza en la fase 0.

## Fases y reparto

La fase 0 la hace un solo orquestador y se mergea antes de empezar el resto: todas las pantallas dependen de ella.
Después, cada orquestador toma flujos completos, así nadie toca los archivos del otro.

### Fase 0 · Base (Claude)

Sin esto no arranca nadie. Un PR por punto, en este orden.

1. Tokens claros y oscuros en `src/app/globals.css`, tipografías nuevas con `next/font`, logo de texto "LabÍA" en
   Baloo 2. Actualizar `AGENTS.md` (sección Diseño y regla de foco).
2. Componentes base de `src/components/ui/` con el estilo nuevo: `Boton`, `Campo`, `Chip`, `Insignia`, `Tarjeta`,
   `HojaInferior`. Piezas nuevas: `Encabezado`, `Toldo`, `Avatar`. Se retira `CintaMetrica`.
3. Navegación: barra inferior de celular y barra superior de escritorio (referencias: pie de `App-Buscar` y cabecera
   de `App-Escritorio`). `/dev/paleta` y `/dev/ui` actualizadas para revisar las piezas.

### Fase 1 · Pantallas, en paralelo

#### Claude (12 pantallas y 10 emails)

| Pantalla | Ruta | Claro | Oscuro | Escritorio |
| --- | --- | --- | --- | --- |
| Inicio del cliente | `/inicio` | `App-Inicio` | `Oscuro-Inicio` | `App-Escritorio` |
| Buscar | `/buscar` | `App-Buscar` | `Oscuro-Buscar` | `Esc-Buscar` |
| Perfil del profesional | `/profesionales/[id]` | `App-Perfil` | `Oscuro-Perfil` | `Esc-Perfil` |
| Contactar por WhatsApp (hoja) | `/profesionales/[id]` | `App-Contacto` | `Oscuro-Contacto` | sin dibujar |
| Reportar (hoja) | `/profesionales/[id]` | `App-Reportar` | `Oscuro-Reportar` | sin dibujar |
| Publicar un trabajo | `/trabajos/nuevo` | `App-Publicar` | `Oscuro-Publicar` | sin dibujar |
| Mis trabajos | `/mis-trabajos` | `App-MisTrabajos` | `Oscuro-MisTrabajos` | sin dibujar |
| Mi trabajo y sus postulaciones | `/mis-trabajos/[id]` | `App-MiTrabajo` | `Oscuro-MiTrabajo` | `Esc-MiTrabajo` |
| Dejar una reseña (hoja) | desde `/mis-trabajos/[id]` | `App-Resena` | `Oscuro-Resena` | sin dibujar |
| Admin: verificaciones | `/admin/verificaciones` | `App-AdminVerificaciones` | `Oscuro-AdminVerificaciones` | sin dibujar |
| Admin: revisar a un profesional | `/admin/verificaciones/[usuarioId]` | `App-AdminRevision` | `Oscuro-AdminRevision` | sin dibujar |
| Admin: reportes y moderación | `/admin/reportes` | `App-AdminReportes` | `Oscuro-AdminReportes` | sin dibujar |

Emails (`src/lib/emails/Layout.tsx` primero, después las plantillas de `src/emails/`):

| Plantilla | Boceto |
| --- | --- |
| `Layout.tsx` (molde común) | cualquiera de los `Email-*` |
| `bienvenida_cliente.tsx` | `Email-BienvenidaCliente` |
| `bienvenida_profesional.tsx` | `Email-BienvenidaProfesional` |
| `perfil_publicado.tsx` | `Email-PerfilPublicado` |
| `documento_rechazado.tsx` | `Email-DocumentoRechazado` |
| `nueva_postulacion.tsx` | `Email-NuevaPostulacion` |
| `te_eligieron.tsx` | `Email-Elegido` |
| `eligieron_a_otro.tsx` | `Email-EligieronAOtro` |
| `pedir_resena.tsx` | `Email-PedirResena` |
| `trabajos_cerca.tsx` | `Email-TrabajosCerca` |
| `cuenta_suspendida.tsx` | `Email-CuentaSuspendida` |

Los emails se dibujaron solo en claro. En el código van con tablas y estilos inline de React Email, colores fijos (los
clientes de correo no leen variables CSS) y Baloo 2 con una tipografía de sistema de respaldo.

#### Gemini (21 pantallas)

| Pantalla | Ruta | Claro | Oscuro |
| --- | --- | --- | --- |
| Bienvenida | `/` | `App-Bienvenida` | `Oscuro-Bienvenida` |
| Ingresar | `/ingresar` | `App-Ingresar` | `Oscuro-Ingresar` |
| Restablecer contraseña | `/restablecer` | `App-Restablecer` | `Oscuro-Restablecer` |
| Registro de cliente | `/registro/cliente` y `/registro/cliente/completar` | `App-RegistroCliente` | `Oscuro-RegistroCliente` |
| Registro profesional: perfil | `/registro/profesional` | `App-ProPerfil` | `Oscuro-ProPerfil` |
| Registro profesional: documentos | `/registro/profesional` | `App-ProDocumentos` | `Oscuro-ProDocumentos` |
| Registro profesional: normas | `/registro/profesional/normas` y `/normas/aceptar` | `App-ProNormas` | `Oscuro-ProNormas` |
| Registro profesional: listo | `/registro/profesional/listo` | `App-ProListo` | `Oscuro-ProListo` |
| Trabajos para vos | `/trabajos` | `App-Trabajos` | `Oscuro-Trabajos` |
| Detalle del trabajo y postulación | `/trabajos/[id]` | `App-TrabajoDetalle` | `Oscuro-TrabajoDetalle` |
| Mis postulaciones | a confirmar: hoy no tiene página propia | `App-Postulaciones` | `Oscuro-Postulaciones` |
| Cuenta | `/cuenta` | `App-Cuenta` | `Oscuro-Cuenta` |
| Mis datos | `/cuenta/datos` | `App-CuentaDatos` | `Oscuro-CuentaDatos` |
| Editar mi perfil | `/cuenta/perfil` | `App-CuentaPerfil` | `Oscuro-CuentaPerfil` |
| Preferencias de email | `/cuenta/emails` | `App-CuentaEmails` | `Oscuro-CuentaEmails` |
| Mi verificación | `/cuenta/verificacion` | `App-CuentaVerificacion` | `Oscuro-CuentaVerificacion` |
| Borrar mi cuenta | `/cuenta/borrar` | `App-CuentaBorrar` | `Oscuro-CuentaBorrar` |
| Normas de seguridad | `/normas` | `App-Normas` | `Oscuro-Normas` |
| Términos y privacidad | `/terminos` y `/privacidad` | `App-Legal` | `Oscuro-Legal` |
| Cuenta suspendida | `/suspendida` | `App-Suspendida` | `Oscuro-Suspendida` |
| Avisos de pantalla completa | `/sin-conexion`, `/baja`, `/cuenta-eliminada` | `App-Aviso` | `Oscuro-Aviso` |

Ninguna de las pantallas de Gemini tiene boceto de escritorio.

### Tareas

| Tarea | Qué | Quién | Espera a |
| --- | --- | --- | --- |
| LAB-67 | Prototipo en el repo y guía de construcción | Claude | — |
| LAB-68 | Base 1: tokens, tipografías y logo | Claude | LAB-67 |
| LAB-69 | Base 2: componentes base | Claude | LAB-68 |
| LAB-70 | Base 3: navegación | Claude | LAB-69 |
| LAB-71 | Inicio del cliente y buscar | Claude | LAB-70 |
| LAB-72 | Perfil, contactar y reportar | Claude | LAB-70 |
| LAB-73 | Trabajos del cliente | Claude | LAB-70 |
| LAB-74 | Administración | Claude | LAB-70 |
| LAB-75 | Emails | Claude | LAB-68 |
| LAB-76 | Bienvenida, ingresar, restablecer y registro de cliente | Gemini | LAB-70 |
| LAB-77 | Registro profesional | Gemini | LAB-70 |
| LAB-78 | Trabajos del profesional | Gemini | LAB-70 |
| LAB-79 | Cuenta | Gemini | LAB-70 |
| LAB-80 | Normas, legales, suspendida y avisos | Gemini | LAB-70 |
| LAB-81 | Pase final de accesibilidad y limpieza | Claude | LAB-71 a LAB-80 |

Mientras Claude hace la base, Gemini puede revisar LAB-67 a LAB-70 (revisión cruzada) y leer los bocetos de sus
tareas. Orden sugerido para Gemini: LAB-80 (las más simples, prueban la base), LAB-76, LAB-79, LAB-77 y LAB-78.

### Por qué este corte

- Claude hace la base y por eso toma menos pantallas (12 contra 21).
- Claude se queda con administración y emails porque tocan la service role (`/admin`, `src/lib/emails/*`), la zona con
  más reglas de seguridad de `AGENTS.md`.
- Cada flujo queda entero de un lado: buscar y contratar (Claude); entrar, registrarse, trabajar como profesional,
  cuenta y legales (Gemini).

## Reglas para no pisarse

- Vale el protocolo de LAB-63: se mergea de a uno y hay revisión cruzada.
- Después de la fase 0, `src/app/globals.css`, `src/components/ui/` y la navegación solo los toca Claude. Si a Gemini
  le falta una pieza o un token, lo pide en la tarea; no lo agrega por su cuenta ni usa hex sueltos.
- Componentes de dominio compartidos (`TarjetaProfesional`, `TarjetaTrabajo`): los rehace el primero que los necesita
  y el otro los reutiliza. `TarjetaProfesional` es de Claude (buscar); `TarjetaTrabajo` es de Gemini (trabajos del
  profesional) y Claude la reutiliza en "Mis trabajos".
- Un PR por pantalla o por grupo chico de pantallas del mismo flujo, con capturas a 390 y a 1440, en claro y oscuro.
- No se cambian Server Actions, esquemas Zod, consultas ni políticas. Si un boceto pide un dato que hoy no existe, se
  anota en el PR y la pantalla sale sin ese dato.

## Qué falta decidir o dibujar

- **Escritorio:** solo hay cuatro bocetos (inicio, buscar, perfil, mi trabajo). Para el resto, seguir su patrón: barra
  superior blanca, contenido centrado con ancho máximo de 1200 px, encabezado turquesa de ancho completo y dos columnas
  (principal ancha y lateral de 320 a 380 px). Los formularios van en una columna de hasta 560 px.
- **Escritorio en modo oscuro:** no está dibujado; sale de los tokens.
- **Mis postulaciones:** el boceto existe, pero la app no tiene una página propia. Hay que decidir si es una ruta nueva
  o una pestaña de `/trabajos`.
- **Textos nuevos:** varios bocetos cambian textos de la app (por ejemplo "¿Qué se rompió?" en el inicio). Los textos
  de los bocetos mandan, salvo los legales y las normas, que no se reescriben.
- **Inicio:** "¿Qué se rompió?" traduce problemas frecuentes a un oficio. Esa tabla problema → oficio es nueva y fija
  (sin base de datos); se define en la tarea del inicio.
- **Fondo de las hojas** (contactar, reportar, reseña) en oscuro: usa `#05161B`, un tono fuera de la tabla. Si se
  mantiene, pasa a ser el token `velo`.
