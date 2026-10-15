"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Boton } from "@/components/ui/Boton";
import type { ResenaPropia } from "@/lib/resenas/acciones";

import { HojaResena } from "./HojaResena";

type Props = {
  profesionalId: string;
  nombreProfesional: string;
  resenaPropia: ResenaPropia | null;
  className?: string;
};

/**
 * Botón "Dejar reseña" o "Editar mi reseña" en el perfil público del profesional (LAB-31).
 * Si la URL contiene el hash #resena, abre automáticamente la hoja de reseña.
 */
export function BotonDejarResena({
  profesionalId,
  nombreProfesional,
  resenaPropia,
  className,
}: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const botonRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && window.location.hash === "#resena") {
        setAbierta(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const esEdicion = Boolean(resenaPropia);

  return (
    <>
      <Boton
        type="button"
        variante="secundario"
        tamano="normal"
        className={className}
        aria-haspopup="dialog"
        onClick={(e) => {
          botonRef.current = e.currentTarget;
          setAbierta(true);
        }}
      >
        <Star aria-hidden className="size-4 text-naranja-marca" />
        {esEdicion ? "Editar mi reseña" : "Dejar reseña"}
      </Boton>
      <HojaResena
        abierta={abierta}
        onCambioAbierta={setAbierta}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
        resenaExistente={resenaPropia}
        devolverFocoA={botonRef}
        alGuardar={() => {
          router.refresh();
        }}
      />
    </>
  );
}
