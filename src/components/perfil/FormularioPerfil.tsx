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
  /** Perfil público propio, para el enlace "Ver cómo se ve". */
  hrefPerfil: string;
};

const PASTILLA_CASILLA =
  "flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full bg-superficie px-3.5 text-base text-texto has-checked:bg-encabezado has-checked:font-bold has-checked:text-sobre-encabezado has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco";
const CASILLA = "size-5 shrink-0 accent-accion";

/** Edición del perfil profesional: descripción, barrios, oficios y datos adicionales. */
export function FormularioPerfil({ valores, barrios, hrefPerfil }: Props) {
  const [estado, accion, pendiente] = useActionState(actualizarPerfilProfesional, ESTADO_INICIAL);
  const [toda, setToda] = useState(valores.todaLaCiudad);
  const errores = estado.errores ?? {};

  return (
    <form action={accion} noValidate className="flex flex-col gap-3.5">
      <Campo
        variante="area"
        etiqueta="Qué arreglás"
        name="descripcion"
        rows={3}
        maxLength={500}
        defaultValue={valores.descripcion}
        ayuda="Sin teléfonos, emails ni direcciones: te escriben por WhatsApp desde el botón."
        error={errores.descripcion}
      />

      <fieldset
        className="m-0 flex flex-col gap-1.5 border-0 p-0"
        aria-describedby={errores.zonas ? "e-zonas" : undefined}
      >
        <legend className="mb-1.5 p-0 text-base font-bold text-texto">
          Barrios donde trabajás
        </legend>
        <div className="flex flex-wrap gap-2">
          <label className={PASTILLA_CASILLA}>
            <input
              type="checkbox"
              name="todaLaCiudad"
              checked={toda}
              onChange={(e) => setToda(e.target.checked)}
              className={CASILLA}
            />
            Toda la ciudad
          </label>
          {toda
            ? null
            : barrios.map((barrio) => (
                <label key={barrio.id} className={PASTILLA_CASILLA}>
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
        <p className="text-sm text-texto">Hasta 10 barrios.</p>
        {errores.zonas ? (
          <p id="e-zonas" className="text-[15px] font-bold text-error">
            {errores.zonas}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        className="m-0 flex flex-col gap-1.5 border-0 p-0"
        aria-describedby={errores.oficios ? "e-oficios" : undefined}
      >
        <legend className="mb-1.5 p-0 text-base font-bold text-texto">Oficios</legend>
        <div className="flex flex-wrap gap-2">
          {OFICIOS.map((oficio) => (
            <label key={oficio} className={PASTILLA_CASILLA}>
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
        <p className="text-sm leading-snug text-texto">
          Para ofrecer gas necesitás la matrícula verificada.
        </p>
        {errores.oficios ? (
          <p id="e-oficios" className="text-[15px] font-bold text-error">
            {errores.oficios}
          </p>
        ) : null}
      </fieldset>

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

      {estado.mensaje ? (
        <p role="alert" className="text-sm font-bold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      {estado.exito ? (
        <p role="status" className="text-sm font-bold text-texto">
          {estado.exito}{" "}
          <Link href={hrefPerfil} className="underline">
            Ver cómo se ve
          </Link>
        </p>
      ) : null}

      <div className="rounded-t-[28px] bg-superficie px-5 pt-2.5 pb-4 lg:rounded-tarjeta lg:p-4">
        <Boton type="submit" tamano="grande" bloque cargando={pendiente}>
          Guardar cambios
        </Boton>
      </div>
    </form>
  );
}
