/** Primer link de la página: aparece al enfocarlo con Tab y salta la navegación. */
export function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only rounded-campo bg-superficie px-4 py-3 font-bold text-texto focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
    >
      Saltar al contenido
    </a>
  );
}
