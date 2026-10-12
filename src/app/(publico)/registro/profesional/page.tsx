import type { Metadata } from "next";

import { PasoRegistro } from "@/components/auth/PasoRegistro";

export const metadata: Metadata = { title: "Crear cuenta de profesional · LabÍA" };

// Registro mínimo de LAB-16. TODO(LAB-18): el formulario completo de profesional reemplaza este.
export default function RegistroProfesional() {
  return <PasoRegistro rol="profesional" />;
}
