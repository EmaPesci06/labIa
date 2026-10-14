"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { OFICIOS, type Oficio } from "@/lib/busqueda";
import { actualizarPerfilProfesional } from "@/lib/perfil/acciones";
import { ETIQUETA_OFICIO } from "@/lib/perfil/datos";

export type ValoresPerfil = {
  oficios: Oficio[];
  especialidades: string;
  descripcion: string;
  aniosExperiencia: string;
  disponibilidad: string;
  todaLaCiudad: boolean;
  zonas: number[];
};

type Props = {
  valores: ValoresPerfil;
  barrios: readonly { id: number; nombre: string }[];
  /** Perfil público propio, para el enlace "Ver mi perfil". */
  hrefPerfil: string;
};

const CASILLA = "size-5 shrink-0 accent-azul";

/** Edición del perfil profesional: oficios, descripción, años, disponibilidad y zonas. */
export function FormularioPerfil({ valores, barrios, hrefPerfil }: Props) {
  const [estado, accion, pendiente] = useActionState(actualizarPerfilProfesional, ESTADO_INICIAL);
  const [toda, setToda] = useState(valores.todaLaCiudad);
  const errores = estado.errores ?? {};

  return (
    <form action={accion} noValidate className="flex max-w-xl flex-col gap-5">
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errores.oficios ? "e-oficios" : undefined}
      >
        <legend className="mb-1 text-sm font-semibold">Oficios</legend>
        <div className="grid grid-cols-2 gap-2">
          {OFICIOS.map((oficio) => (
            <label
              key={oficio}
              className="flex min-h-11 items-center gap-2.5 rounded-campo border border-borde bg-superficie px-3 text-[15px]"
            >
              <input
                type="checkbox"
                name="oficios"
                value={oficio}
                defaultChecked={valores.oficios.includes(oficio)}
                className={CASILLA}
              />
              {ETIQUETA_OFICIO[oficio]}
            </label>
          ))}
        </div>
        <p className="text-sm text-texto-terciario">
          Para ofrecer gas necesitás la matrícula verificada.
        </p>
        {errores.oficios ? (
          <p id="e-oficios" className="text-sm font-semibold text-error">
            {errores.oficios}
          </p>
        ) : null}
      </fieldset>

      <Campo
        variante="area"
        etiqueta="Contá cómo trabajás"
        name="descripcion"
        maxLength={500}
        defaultValue={valores.descripcion}
        error={errores.descripcion}
      />
      <Campo
        etiqueta="Especialidades"
        name="especialidades"
        defaultValue={valores.especialidades}
        ayuda="Separadas por coma. Por ejemplo: pérdidas de gas, calefactores."
        maxLength={120}
        error={errores.especialidades}
      />
      <Campo
        etiqueta="Años de experiencia"
        name="aniosExperiencia"
        inputMode="numeric"
        defaultValue={valores.aniosExperiencia}
        error={errores.aniosExperiencia}
      />
      <Campo
        etiqueta="Disponibilidad"
        name="disponibilidad"
        defaultValue={valores.disponibilidad}
        ayuda="Por ejemplo: Lun a sáb, 8 a 18 h."
        maxLength={120}
        error={errores.disponibilidad}
      />

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errores.zonas ? "e-zonas" : undefined}
      >
        <legend className="mb-1 text-sm font-semibold">Zonas donde trabajás</legend>
        <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
          <input
            type="checkbox"
            name="todaLaCiudad"
            checked={toda}
            onChange={(e) => setToda(e.target.checked)}
            className={CASILLA}
          />
          Toda la ciudad
        </label>
        {toda ? null : (
          <div
            tabIndex={0}
            role="group"
            aria-label="Barrios"
            className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-campo border border-borde bg-superficie p-2 sm:grid-cols-2"
          >
            {barrios.map((barrio) => (
              <label
                key={barrio.id}
                className="flex min-h-11 items-center gap-2.5 px-1 text-[15px]"
              >
                <input
                  type="checkbox"
                  name="zonas"
                  value={barrio.id}
                  defaultChecked={valores.zonas.includes(barrio.id)}
                  className={CASILLA}
                />
                {barrio.nombre}
              </label>
            ))}
          </div>
        )}
        <p className="text-sm text-texto-terciario">Hasta 10 barrios.</p>
        {errores.zonas ? (
          <p id="e-zonas" className="text-sm font-semibold text-error">
            {errores.zonas}
          </p>
        ) : null}
      </fieldset>

      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      {estado.exito ? (
        <p role="status" className="text-sm font-semibold text-sobre-exito-suave">
          {estado.exito}{" "}
          <Link href={hrefPerfil} className="underline">
            Ver mi perfil
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Boton type="submit" variante="cliente" tamano="grande" cargando={pendiente}>
          Guardar cambios
        </Boton>
        <Boton href={hrefPerfil} variante="secundario" tamano="grande">
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
