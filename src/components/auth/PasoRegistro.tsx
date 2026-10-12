import Link from "next/link";
import { Suspense } from "react";

import { Boton } from "@/components/ui/Boton";
import { inicioDelRol } from "@/lib/auth/rutas";
import { obtenerSesion } from "@/lib/sesion";

import { BotonGoogle, SeparadorO } from "./BotonGoogle";
import { EncabezadoAuth } from "./EncabezadoAuth";
import { FormularioRegistro } from "./FormularioRegistro";

const TEXTOS = {
  cliente: {
    contexto: "Quiero contratar",
    titulo: "Creá tu cuenta",
    bajada: "Con tu contacto, los profesionales pueden responderte por WhatsApp.",
  },
  profesional: {
    contexto: "Ofrezco mis servicios",
    titulo: "Creá tu cuenta de profesional",
    bajada: "Mostrá tu oficio y encontrá trabajos en tu zona.",
  },
} as const;

async function Cuerpo({ rol }: { rol: "cliente" | "profesional" }) {
  // Si ya hay sesión (volvió de Google, o confirmó el email), no se pide crear la cuenta de nuevo.
  const sesion = await obtenerSesion();
  if (sesion) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-campo bg-exito-suave p-4 text-[15px] font-semibold text-sobre-exito-suave"
        >
          Tu cuenta ya está creada. Muy pronto vas a poder completar tus datos desde acá.
        </p>
        <Boton
          href={inicioDelRol(sesion.rol)}
          variante={rol === "profesional" ? "profesional" : "cliente"}
          tamano="grande"
          bloque
        >
          Seguir a LabÍA
        </Boton>
      </div>
    );
  }
  return (
    <>
      <BotonGoogle rol={rol} />
      <SeparadorO />
      <FormularioRegistro rol={rol} />
    </>
  );
}

/** Pantalla de registro de un camino (cliente o profesional) con Google y email. */
export function PasoRegistro({ rol }: { rol: "cliente" | "profesional" }) {
  const t = TEXTOS[rol];
  return (
    <div className="flex flex-col gap-[18px]">
      <EncabezadoAuth titulo={t.titulo} bajada={t.bajada} contexto={t.contexto} />
      <Suspense fallback={null}>
        <Cuerpo rol={rol} />
      </Suspense>
      <p className="text-center text-[15px] text-texto-secundario">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/ingresar"
          className="inline-block py-3 font-bold text-azul underline underline-offset-2"
        >
          Ingresar
        </Link>
      </p>
    </div>
  );
}
