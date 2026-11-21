> **Referencia vieja.** Este prototipo es del diseño "Verano en la costa" (turquesa, sol y coral; Baloo 2 y Nunito Sans; toldo), retirado.
> La identidad vigente es "Papelería sellada" de Oficio Seguro: paleta en `src/app/globals.css`, tipografías en `src/app/fuentes.ts`,
> motivos `Sello`, `FranjaRubro` (`trama`) y `corte-cupon`. Sigue valiendo solo para la estructura de las pantallas
> (qué lleva cada una, flujos y rutas); colores, tipografías, toldo y nombres de tokens (`sol`, `coral`, `turquesa`) no.

# Cómo construir una pantalla de la interfaz nueva

Guía para los constructores de los dos orquestadores (Claude y Gemini). Leela junto con `README.md` de esta carpeta:
el README dice **qué** pantalla es cada boceto y de quién es; esta guía dice **cómo** se pasa a código.

## 1. Cómo es el diseño

"Verano en la costa": un balneario de Mar del Plata. Arena de fondo, turquesa de mar para lo que se toca, amarillo de
sol para lo elegido, toldos rayados como adorno. Letras gordas y redondas, formas grandes, cero sombras.

Lo que define el estilo, en orden de importancia:

1. **Bloques de color plano.** Cada pantalla abre con un encabezado turquesa de esquinas inferiores redondeadas. Debajo,
   fondo arena con tarjetas blancas. No hay sombras, degradados ni bordes finos grises.
2. **Radios grandes.** Tarjetas 22, botones 18, campos 16, chips y pastillas completamente redondos.
3. **Títulos en Baloo 2 800**, grandes y apretados (`line-height` 1 a 1,1). El texto corrido va en Nunito Sans, de 15
   a 18 px. Negrita (700) para etiquetas y acciones; nunca 500 ni 600.
4. **Una sola acción principal por pantalla**, en turquesa, ancha, de 56 px de alto, abajo. Las secundarias van con
   borde de 3 px o como enlace en negrita.
5. **Amarillo = elegido o dato clave** (chip activo, distancia, aviso). Siempre con texto azul oscuro, en los dos modos.
6. **Coral solo como adorno** en los toldos. El rojo oscuro (`error`) es solo para errores y acciones destructivas.
7. **Voz:** voseo, frases cortas, concretas ("¿Qué se rompió?", "Escribirle por WhatsApp"). Sin signos de admiración
   de más ni emojis.

## 2. Del boceto al código

Abrí el `App-*.dc.html` de la pantalla y mirá solo lo que está dentro de `<x-dc>`. Es HTML con estilos inline: usalo
como plano de medidas, no lo copies.

| En el boceto | En el código |
| --- | --- |
| `background: #FFF3D6`, `color: #123B4A`… | Clase del token (`bg-fondo`, `text-texto`…). Nunca el hex. |
| `<header style="background: #0E7C86 …">` | `<Encabezado>` de `src/components/ui/` (variantes en la tabla de abajo) |
| Botón turquesa de 56 px | `<Boton>` principal (capa fina sobre `Button` de shadcn) |
| Botón con borde de 3 px | `<Boton variante="secundario">` |
| `<input>`, `<select>`, `<textarea>` con borde de 2 px | `<Campo>` (trae `label`, ayuda y error) |
| Pastilla amarilla o blanca | `<Chip>` |
| Bloque blanco de radio 22 | `<Tarjeta>` |
| Círculo con inicial y borde amarillo | `<Avatar>` |
| Franja `repeating-linear-gradient` | `<Toldo color="accion|sol|texto|coral" alto={14|18|22|26}>` |
| Header con bloque de color, volver y título | `<Encabezado variante="turquesa|equipo|sol|plano" titulo volver>`; los chips elegidos dentro de `sol` cambian solos a azul noche |
| Pantalla completa de aviso (ícono, título, texto, botón) | `<AvisoPantalla titulo texto accion>` |
| Pastilla amarilla con la distancia ("a 1,2 km") | `<Distancia km sufijo>` |
| Cinta de distancia o cinta de pasos | No existe más: `<Distancia>` para la distancia; los pasos se muestran como lista de texto |
| `<section role="dialog">` que sube desde abajo | `<Hoja>` (sobre `Sheet` de shadcn) |
| `<nav aria-label="Principal">` de abajo | Ya está en el layout: no la repitas en la página |
| Recuadro con la palabra "Foto" | `next/image` |
| Grilla de fotos que abre a pantalla completa | `<VisorFotos>` (`Dialog` y `Carousel` de shadcn) |
| `width: 390px; height: 844px; overflow: hidden` | Nada: es el marco del boceto. La página real crece y hace scroll. |

Los componentes de `src/components/shadcn/` no se editan: las piezas de `ui/` que tienen equivalente en shadcn son capas finas sobre él (variantes, 44 px, tokens) y las que no (Encabezado, Toldo, Logo, Distancia, EtiquetaMono, Estrellas) son propias, con `cn()`. Radios: campo `rounded-xl`, botón `rounded-2xl`, tarjeta `rounded-3xl` (los del boceto, 16, 18 y 22 px, se aproximan con los de shadcn).

Los nombres exactos de tokens, componentes y props son los que queden en `src/app/globals.css` y `src/components/ui/`
al cerrar la base (LAB-68, LAB-69, LAB-70). Miralos ahí antes de empezar; `/dev/ui` y `/dev/paleta` los muestran todos.

Reglas:

- **Sin hex ni estilos inline** en componentes ni páginas. Si un color del boceto no tiene token, no lo inventes:
  pedilo en la tarea.
- **Las medidas del boceto mandan** (paddings, gaps, tamaños de letra, altos). Pasalas a la escala de Tailwind más
  cercana; si no hay una a menos de 2 px, usá el valor arbitrario (`text-[34px]`).
- **Los textos del boceto mandan**, salvo normas y legales, que no se reescriben, y los mensajes de error que hoy no
  revelan información (por ejemplo, si un email existe).
- **Los datos son de ejemplo.** Marta R., Carla y La Perla no van al código: cada dato sale de donde sale hoy.
- Si el boceto muestra un dato que la app no tiene, la pantalla sale sin ese dato y lo anotás en el PR.
- Si la app tiene un estado que el boceto no muestra (vacío, cargando, error, sin permisos), resolvelo con las mismas
  piezas y mostralo en una captura.

## 3. Modo oscuro

No se escribe aparte. Los tokens cambian de valor con la clase `dark` y la pantalla cambia sola.

- No uses `dark:` en las páginas. Si te hace falta, es que estás usando un color fijo en vez de un token.
- Excepciones ya resueltas dentro de los componentes base: el botón principal pasa a turquesa claro con texto oscuro;
  los campos usan el fondo de página; el amarillo y el encabezado turquesa no cambian.
- El `Oscuro-*.dc.html` de tu pantalla es el resultado esperado: comparalo con tu captura en oscuro. Si no coinciden,
  el problema casi siempre es un color fijo.

## 4. Escritorio (desde `lg`, 1024 px)

Hay cuatro bocetos: `App-Escritorio` (inicio), `Esc-Buscar`, `Esc-Perfil` y `Esc-MiTrabajo`. Para el resto, este
patrón:

- La barra inferior desaparece; la navegación va en la barra superior blanca (ya está en el layout).
- Contenido centrado, ancho máximo 1200 px, 32 px de margen lateral.
- El encabezado turquesa ocupa todo el ancho, con esquinas inferiores de radio 40 y título de 56 a 72 px.
- **Listas y detalles:** dos columnas. La principal ancha y una lateral de 320 a 380 px con la acción principal o la
  ayuda (como en `Esc-Buscar` y `Esc-Perfil`).
- **Formularios:** una columna de hasta 560 px. No se estiran los campos a todo el ancho.
- **Texto largo** (normas, legales): una columna de hasta 720 px.
- **Hojas inferiores:** diálogo centrado de hasta 560 px.
- La barra fija de acción de abajo pasa a la columna lateral, pegada arriba (`position: sticky`).

Se diseña a 390 px y se sube: estilos base para celular, `lg:` para escritorio.

## 5. Accesibilidad (no se negocia)

- Táctiles de 44 px o más.
- Todo campo con `label`; errores al lado del campo, en castellano, unidos con `aria-describedby`.
- Foco visible con el `outline` de 3 px de la base. No lo quites ni lo reemplaces por una sombra.
- Botones y enlaces reales (`<button>`, `<a>`): nunca un `div` con `onClick`.
- Íconos decorativos con `aria-hidden`; botones de solo ícono con `aria-label`.
- Un `h1` por pantalla, jerarquía de títulos sin saltos.
- `aria-current="page"` en la sección actual; `aria-pressed` en chips que se eligen.
- Respetar `prefers-reduced-motion`.
- Contraste AA. Los pares de la tabla de tokens ya lo cumplen; turquesa sobre arena y coral con texto **no**.

## 6. Qué no se toca

Esta fase cambia cómo se ve la app, no qué hace.

- Server Actions, esquemas Zod, consultas, migraciones, políticas RLS, rate limit, uso de la service role.
- Rutas y redirecciones.
- Reglas de producto de `AGENTS.md`: contacto por WhatsApp, barrio en vez de dirección, insignias en vez de documentos.
- `src/app/globals.css`, `src/components/ui/` y la navegación, una vez cerrada la base: solo los cambia Claude.
- Tests: se actualizan los selectores y textos que cambien; no se borran ni se saltean casos.

Si para que una pantalla quede como el boceto hace falta cambiar algo de esta lista, frená y escribilo en la tarea.

## 7. Antes de abrir el PR

- [ ] Captura a 390 px y a 1440 px, en claro y en oscuro, al lado del boceto.
- [ ] Recorrida completa con teclado.
- [ ] Ningún hex, `style=` ni `dark:` en lo que tocaste (`git diff` y buscá `#`).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:e2e` en verde.
- [ ] En el PR: qué estados no estaban en el boceto y cómo los resolviste; qué datos del boceto no existen en la app.
