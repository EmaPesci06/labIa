# components/ui

Componentes base del sistema de diseño "Papelería sellada" de Oficio Seguro (paleta LAB-93, tipografías LAB-94, motivos LAB-95). La fuente de verdad es el código: `src/app/globals.css` (tokens: `accion` terracota, `encabezado` tinta, `destacado`, `adorno`) y `src/app/fuentes.ts` (Archivo y Archivo Narrow). `docs/prototipo-nuevo/` queda solo como referencia de la estructura de las pantallas:

- Boton (principal, secundario, peligro, enlace), Campo (texto, área, selección), Chip (y GrupoChips), Insignia, Tarjeta, Hoja (sobre `Sheet` de shadcn).
- Encabezado (variantes `turquesa` —nombre heredado, hoy tinta y es la de por defecto—, `equipo`, `destacado` y `plano`), Sello, FranjaRubro, Avatar, Aviso (nota), AvisoPantalla (pantalla completa), Vacio.
- Distancia (pastilla destacado con la distancia), EtiquetaMono, Estrellas, Logo.

Los que no tienen equivalente en shadcn (Encabezado, Sello, FranjaRubro, Logo, Distancia, EtiquetaMono, Estrellas) son propios: `cn()`, tokens y `Badge` donde sirve (Distancia). VisorFotos usa `Dialog` y `Carousel` de shadcn. Radios: `rounded-xl` (campo), `rounded-2xl` (botón) y `rounded-3xl` (tarjeta); no hay tokens propios de radio salvo `rounded-hoja`.

Sin lógica de dominio ni acceso a datos. Los colores salen solo de los tokens de `src/app/globals.css`.

## Capa fina sobre shadcn (LAB-84, LAB-86)

Boton, Campo (texto, área y selección sobre `Select`), Combobox (sobre `Popover` + `Command`), Tarjeta, Chip y GrupoChips, Insignia, Avatar, Aviso y Vacio se apoyan en los componentes de `src/components/shadcn/` (no se editan) y conservan su nombre y sus props. Cada capa traduce sus variantes y fija con `className`: los 44 px de alto como mínimo, el borde visible de los campos (token `borde`, ≥3:1) y un solo foco. `globals.css` dibuja el outline de 3 px en `[data-slot]:focus-visible` y `foco.ts` apaga el anillo (`ring`) de shadcn. Los radios son los de shadcn. `GrupoChips` arma el grupo con `Chip` (sobre `Toggle`) y no con `ToggleGroup`: su foco itinerante cambiaría el Tab y no tiene el rol `radio`.

## Motivos (LAB-95)

El toldo se retiró. Los motivos de "Papelería sellada" son: `Sello` (sello rotado, decorativo, único movimiento de estampado y sin animación con `prefers-reduced-motion`), `FranjaRubro` (franja de la credencial con la utilidad `trama`, líneas onduladas finas) y la utilidad `corte-cupon` (borde punteado entre cabecera y cuerpo de los cupones). Los tres están definidos en `globals.css` o `ui/` y usan solo tokens.
