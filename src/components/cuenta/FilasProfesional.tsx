import { FilaEnlace } from "@/components/cuenta/FilaCuenta";

/**
 * Filas de /cuenta solo para profesionales (LAB-43): su perfil público (/cuenta/perfil) y la
 * verificación de documentos (/cuenta/verificacion). Van dentro de un `GrupoCuenta`.
 */
export function FilasProfesional() {
  return (
    <>
      <FilaEnlace href="/cuenta/perfil">Mi perfil público</FilaEnlace>
      <FilaEnlace href="/cuenta/verificacion">Mi verificación</FilaEnlace>
    </>
  );
}
