import type { Metadata } from "next";

import { PasoRegistro } from "@/components/auth/PasoRegistro";

export const metadata: Metadata = { title: "Crear cuenta · LabÍA" };

// Registro mínimo de LAB-16. TODO(LAB-17): el formulario completo de cliente reemplaza este.
export default function RegistroCliente() {
  return <PasoRegistro rol="cliente" />;
}
