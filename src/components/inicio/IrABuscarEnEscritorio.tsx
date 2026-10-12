/**
 * En escritorio (≥ 1024 px) el inicio no existe: la búsqueda es la pantalla principal. El servidor
 * no conoce el ancho de la ventana, así que esta redirección corre en el navegador apenas se
 * lee el HTML, antes de que se pueda interactuar (por eso es un script en línea y no un efecto).
 * `destino` sale siempre de `urlBusqueda`, con un barrio validado.
 */
export function IrABuscarEnEscritorio({ destino }: { destino: string }) {
  const codigo = `if(window.matchMedia("(min-width: 1024px)").matches)window.location.replace(${JSON.stringify(destino).replace(/</g, "\\u003c")})`;
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />;
}
