import Link from "next/link";

// Aviso mínimo de analítica (LAB-15). El texto legal completo llega con LAB-35 en /privacidad.
export function PieLegal() {
  return (
    <footer className="px-4 py-3 text-center text-sm">
      <p>
        Usamos métricas anónimas para mejorar LabÍA.{" "}
        {/* Sin prefetch: es un link poco usado y /privacidad recién existe con LAB-35. */}
        <Link
          href="/privacidad"
          prefetch={false}
          className="inline-block py-3 underline underline-offset-2"
        >
          Privacidad
        </Link>
      </p>
    </footer>
  );
}
