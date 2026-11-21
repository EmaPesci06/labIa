import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Boton } from "@/components/ui/Boton";
import { Vacio } from "@/components/ui/Vacio";
import { PerfilProfesional } from "@/components/perfil/PerfilProfesional";
import { RegistrarVistaPerfil } from "@/components/perfil/RegistrarVistaPerfil";
import { bloqueoLecturaPublica } from "@/lib/limites";
import {
  distanciaEntreBarrios,
  esIdValido,
  obtenerPerfil,
  obtenerResenas,
} from "@/lib/perfil/cargar";
import { RESENAS_INICIALES, descripcionCorta, tituloPerfil } from "@/lib/perfil/datos";
import { consultarElegibilidadResena } from "@/lib/resenas/acciones";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

type Props = { params: Promise<{ id: string }> };

// El perfil y los metadatos comparten una sola consulta por pedido.
const perfilDelPedido = cache(async (id: string) => {
  if (!supabaseConfigurado() || !esIdValido(id)) return null;
  const supabase = await crearClienteServidor();
  return obtenerPerfil(supabase, id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // Con el tope por IP cumplido no se lee el perfil (M-03): mismo chequeo que la página, cacheado.
  if (await bloqueoLecturaPublica("perfil"))
    return { title: "Perfil · Oficio Seguro", robots: { index: false } };
  const perfil = await perfilDelPedido(id).catch(() => null);
  if (!perfil) return { title: "Perfil no encontrado · Oficio Seguro" };

  const titulo = tituloPerfil(perfil.nombre, perfil.oficios);
  const descripcion = descripcionCorta(perfil.nombre, perfil.oficios, perfil.descripcion);
  return {
    title: titulo,
    description: descripcion,
    // Perfiles de personas: que no se indexen con el nombre completo ni las fotos.
    robots: { index: false },
    openGraph: {
      title: titulo,
      description: descripcion,
      type: "profile",
      ...(perfil.fotoUrl ? { images: [{ url: perfil.fotoUrl }] } : {}),
    },
  };
}

export default async function PerfilDelProfesional({ params }: Props) {
  const { id } = await params;
  const bloqueo = await bloqueoLecturaPublica("perfil");
  if (bloqueo) {
    return (
      <div role="alert">
        <Vacio
          titulo={bloqueo}
          accion={
            <Boton href="/buscar" variante="secundario">
              Volver a buscar
            </Boton>
          }
        />
      </div>
    );
  }
  const perfil = await perfilDelPedido(id);
  // No existe, no está publicado o la cuenta está suspendida (salvo para el dueño y los admins).
  if (!perfil) notFound();

  const [supabase, sesion] = await Promise.all([crearClienteServidor(), obtenerSesion()]);

  // La distancia es entre centros de barrio y solo se muestra a un cliente con sesión. El barrio
  // de la cuenta ya viene en la sesión; reseñas, elegibilidad y distancia no dependen entre sí
  // y se piden juntas (LAB-88).
  const calcularDistancia =
    sesion?.rol === "cliente" && esIdValido(sesion.usuario.id)
      ? distanciaEntreBarrios(supabase, sesion.barrioId ?? null, perfil.barrioId)
      : Promise.resolve<number | null>(null);
  const [distanciaKm, resenas, elegibilidad] = await Promise.all([
    calcularDistancia,
    obtenerResenas(supabase, perfil.id, 0, RESENAS_INICIALES),
    consultarElegibilidadResena(perfil.id),
  ]);

  return (
    <>
      {perfil.esPropio ? null : <RegistrarVistaPerfil oficio={perfil.oficios[0] ?? "plomeria"} />}
      <PerfilProfesional
        perfil={perfil}
        resenas={resenas}
        distanciaKm={distanciaKm}
        puedeContactar={sesion?.rol === "cliente"}
        puedeResenar={elegibilidad.puedeResenar}
        resenaPropia={elegibilidad.resenaPropia}
        hrefIngreso={
          sesion
            ? undefined
            : `/ingresar?volver=${encodeURIComponent(`/profesionales/${perfil.id}`)}`
        }
      />
    </>
  );
}
