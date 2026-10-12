/**
 * Marcador de una pantalla que todavía no se construyó. Existe para que la navegación de LAB-13
 * no lleve a un 404; cada tarea de pantalla (LAB-23, 24, 26, 27, 29, 33…) reemplaza su página.
 */
export function PantallaPendiente({
  titulo,
  children,
}: {
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-titulo text-[28px] lg:text-4xl">{titulo}</h1>
      <p className="text-texto-secundario">Esta pantalla llega pronto.</p>
      {children}
    </div>
  );
}
