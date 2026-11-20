# components/ui

Componentes base del sistema de diseño "Verano en la costa" (`docs/prototipo-nuevo/README.md`, sección "Piezas"):

- Boton (principal, secundario, peligro, enlace), Campo (texto, área, selección), Chip (y GrupoChips), Insignia, Tarjeta, HojaInferior.
- Encabezado (turquesa, equipo, sol, plano), Toldo, Avatar, Aviso (nota), AvisoPantalla (pantalla completa), Vacio.
- Distancia (pastilla sol con la distancia), EtiquetaMono, Estrellas, Logo.

Sin lógica de dominio ni acceso a datos. Los colores salen solo de los tokens de `src/app/globals.css`.

## Capa fina sobre shadcn (LAB-86)

Boton, Campo (texto y área), Tarjeta, Chip y GrupoChips, Insignia, Avatar, Aviso y Vacio se apoyan en los componentes de `src/components/shadcn/` (no se editan) y conservan su nombre y sus props. Cada capa traduce sus variantes y fija con `className`: los 44 px de alto como mínimo, el borde visible de los campos (token `borde`, ≥3:1) y un solo foco. `globals.css` dibuja el outline de 3 px en `[data-slot]:focus-visible` y `foco.ts` apaga el anillo (`ring`) de shadcn. Los radios son los de shadcn. El `Campo` de selección sigue con su `<select>` nativo hasta LAB-84. `GrupoChips` arma el grupo con `Chip` (sobre `Toggle`) y no con `ToggleGroup`: su foco itinerante cambiaría el Tab y no tiene el rol `radio`.
