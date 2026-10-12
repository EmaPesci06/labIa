# Prototipo de LabÍA (fuente de verdad de la interfaz)

Copia del canvas **"LabÍA · Prototipo MVP"** de Claude: https://claude.ai/artifact/W9zmAprvxnq1u7w9Ey3i4Q

Toda pantalla y componente de la app tiene que verse como su pantalla del prototipo: misma estructura, jerarquía,
textos, espaciados, radios, tamaños de letra e íconos. Si el prototipo y una tarea de Linear se contradicen, manda la
tarea; si el prototipo no cubre algo, seguí el estilo de la pantalla más parecida y dejalo escrito en el PR.

## Cómo leer los archivos

Cada `*.dc.html` es una pantalla: HTML con estilos inline. Lo que importa es el marcado dentro de `<x-dc>` y los datos de
ejemplo del `<script type="text/x-dc">`. `canvas.json` es el índice (título y tamaño de cada pantalla).

- Los hex inline corresponden a los tokens de `src/app/globals.css` (LAB-9). **No copies hex**: usá la clase del token
  (`bg-fondo`, `text-texto-secundario`, `bg-azul`, `bg-naranja-accion`, `bg-exito`, `border-borde`…).
- `/_blob/304edbcb…` es el logo para fondo claro y `/_blob/1ea76704…` el de fondo oscuro: usá `<Logo />`.
- Íconos: SVG de trazo de 2 px, `stroke-linecap/linejoin: round`, como en el prototipo.
- La **cinta métrica** (naranja con marcas azules) aparece en Bienvenida, Resultados y Perfil.
- Los nombres y datos de ejemplo (Martín Gómez, Laura…) son de mentira: no van a producción.

## Pantallas

| Archivo | Pantalla | Ruta |
| --- | --- | --- |
| `Main.dc.html` / `Desk-Bienvenida.dc.html` | Bienvenida | `/` |
| `RegistroCliente.dc.html` / `Desk-RegistroCliente.dc.html` | Registro de cliente | `/registro/cliente` |
| `RegistroProfesional.dc.html` / `Desk-RegistroProfesional.dc.html` | Registro de profesional | `/registro/profesional` |
| `Normas.dc.html` / `Desk-Normas.dc.html` | Normas de seguridad | `/normas` |
| `Inicio.dc.html` | Inicio del cliente (incluye la barra inferior) | `/inicio` |
| `Resultados.dc.html` / `Desk-Buscar.dc.html` | Resultados de búsqueda | `/buscar` |
| `Perfil.dc.html` / `Desk-Perfil.dc.html` | Perfil del profesional + hoja "Antes de contactar" | `/profesionales/[id]` |
| `PublicarTrabajo.dc.html` / `Desk-PublicarTrabajo.dc.html` | Publicar un trabajo | `/trabajos/nuevo` |
| `MisTrabajos.dc.html` / `Desk-MisTrabajos.dc.html` | Mis trabajos y postulantes | `/mis-trabajos` |
| `Trabajos.dc.html` / `Desk-Trabajos.dc.html` | Trabajos disponibles (profesional) | `/trabajos` |
| `DetalleTrabajo.dc.html` | Detalle del trabajo y postulación | `/trabajos/[id]` |
| `Oscuro-*.dc.html` | Inicio, Resultados y Perfil en modo oscuro | — |
| `Paleta.dc.html` | Paleta, botones, chips e insignias en claro y oscuro | `/dev/paleta` |

Celular a 390 px (`Main`, `Inicio`…); escritorio a 1440 px (`Desk-*`).
