"use client";

import { useActionState, useState, type FormEvent } from "react";

import { CampoContrasena } from "@/components/auth/CampoContrasena";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/lib/auth/estado";
import { cambiarContrasena, cambiarEmail, guardarDatos } from "@/lib/cuenta/acciones";
import { erroresPorCampo, esquemaNuevaContrasena } from "@/lib/validaciones/auth";
import {
  esquemaCambiarEmail,
  esquemaContrasenaActual,
  esquemaDatosCuenta,
} from "@/lib/validaciones/cuenta";
import { BARRIOS_FRECUENTES, type BarrioOpcion } from "@/lib/validaciones/registro-cliente";

function Resultado({ estado }: { estado: EstadoFormulario }) {
  if (estado.mensaje) {
    return (
      <p role="alert" className="text-sm font-bold text-error">
        {estado.mensaje}
      </p>
    );
  }
  if (estado.exito) {
    return (
      <p role="status" className="text-sm font-bold text-texto">
        {estado.exito}
      </p>
    );
  }
  return null;
}

/** Valida en el navegador con el mismo esquema Zod y, si falla, no manda el formulario. */
function useValidacion<T>(
  validar: (
    datos: FormData,
  ) => { success: true; data: T } | { success: false; errores: Record<string, string | undefined> },
) {
  const [locales, setLocales] = useState<Record<string, string | undefined>>({});
  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    const resultado = validar(new FormData(evento.currentTarget));
    if (resultado.success) {
      setLocales({});
      return;
    }
    evento.preventDefault();
    setLocales(resultado.errores);
  }
  const limpiar = (campo: string) => setLocales((a) => ({ ...a, [campo]: undefined }));
  return { locales, alEnviar, limpiar };
}

const valor = (datos: FormData, clave: string) => {
  const v = datos.get(clave);
  return typeof v === "string" ? v : "";
};

type PropsDatos = {
  barrios: BarrioOpcion[];
  inicial: { nombreCompleto: string; whatsapp: string; barrio: string };
};

/** Nombre, WhatsApp y barrio. Valida igual que el registro. */
export function FormularioDatos({ barrios, inicial }: PropsDatos) {
  const [estado, accion, pendiente] = useActionState(guardarDatos, ESTADO_INICIAL);
  const { locales, alEnviar, limpiar } = useValidacion((datos) => {
    const r = esquemaDatosCuenta.safeParse({
      nombreCompleto: valor(datos, "nombreCompleto"),
      whatsapp: valor(datos, "whatsapp"),
      barrio: valor(datos, "barrio"),
    });
    return r.success
      ? { success: true, data: r.data }
      : { success: false, errores: erroresPorCampo(r.error) };
  });
  const errores = { ...estado.errores, ...locales };
  const v = estado.valores ?? inicial;
  const opcionesBarrios = barrios.length > 0 ? barrios : BARRIOS_FRECUENTES;

  return (
    <form
      action={accion}
      onSubmit={alEnviar}
      onChange={(e) =>
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) &&
        limpiar(e.target.name)
      }
      noValidate
      className="flex flex-col gap-3 rounded-tarjeta bg-superficie p-4 text-texto"
    >
      <Campo
        etiqueta="Nombre y apellido"
        name="nombreCompleto"
        autoComplete="name"
        defaultValue={v.nombreCompleto}
        error={errores.nombreCompleto}
        required
      />
      <Campo
        variante="telefono"
        etiqueta="WhatsApp"
        name="whatsapp"
        placeholder="223 555 0123"
        defaultValue={v.whatsapp}
        error={errores.whatsapp}
        required
      />
      <Campo
        variante="seleccion"
        etiqueta="Barrio"
        name="barrio"
        defaultValue={v.barrio}
        error={errores.barrio}
      >
        <option value="">Elegí tu barrio</option>
        {opcionesBarrios.map((b) => (
          <option key={b.id} value={String(b.id)}>
            {b.nombre}
          </option>
        ))}
      </Campo>
      <Resultado estado={estado} />
      <Boton type="submit" bloque cargando={pendiente}>
        Guardar
      </Boton>
    </form>
  );
}

/** Sección "Cómo ingresás" con resumen de email y contraseña y despliegue de los formularios. */
export function SeccionComoIngresas({
  emailActual,
  conContrasena,
}: {
  emailActual: string;
  conContrasena: boolean;
}) {
  const [abierto, setAbierto] = useState<"email" | "contrasena" | null>(null);

  return (
    <Tarjeta como="section" aria-labelledby="acceso" className="flex flex-col gap-2.5">
      <h2 id="acceso" className="font-titulo text-[22px] leading-tight">
        Cómo ingresás
      </h2>
      <div className="flex items-center gap-2.5">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm">Email</span>
          <span className="truncate text-base font-bold">{emailActual || "—"}</span>
        </span>
        {conContrasena ? (
          <button
            type="button"
            aria-expanded={abierto === "email"}
            aria-label={abierto === "email" ? "Cerrar cambio de email" : "Cambiar email"}
            onClick={() => setAbierto((a) => (a === "email" ? null : "email"))}
            className="min-h-11 rounded-[14px] border-2 border-texto bg-transparent px-3.5 text-[15px] font-bold text-texto hover:bg-fondo"
          >
            {abierto === "email" ? "Cerrar" : "Cambiar"}
          </button>
        ) : null}
      </div>
      {abierto === "email" && conContrasena ? <FormularioEmail emailActual={emailActual} /> : null}

      <div className="flex items-center gap-2.5">
        <span className="flex flex-1 flex-col">
          <span className="text-sm">Contraseña</span>
          <span className="text-base font-bold">
            {conContrasena ? "Configurada" : "Cuenta de Google"}
          </span>
        </span>
        {conContrasena ? (
          <button
            type="button"
            aria-expanded={abierto === "contrasena"}
            aria-label={
              abierto === "contrasena" ? "Cerrar cambio de contraseña" : "Cambiar contraseña"
            }
            onClick={() => setAbierto((a) => (a === "contrasena" ? null : "contrasena"))}
            className="min-h-11 rounded-[14px] border-2 border-texto bg-transparent px-3.5 text-[15px] font-bold text-texto hover:bg-fondo"
          >
            {abierto === "contrasena" ? "Cerrar" : "Cambiar"}
          </button>
        ) : null}
      </div>
      {abierto === "contrasena" && conContrasena ? <FormularioContrasena /> : null}

      <p className="text-sm leading-snug">
        Si ingresás con Google, el email y la contraseña se manejan desde tu cuenta de Google.
      </p>
    </Tarjeta>
  );
}

/** Cambio de email con confirmación por mail. */
export function FormularioEmail({ emailActual }: { emailActual: string }) {
  const [estado, accion, pendiente] = useActionState(cambiarEmail, ESTADO_INICIAL);
  const { locales, alEnviar, limpiar } = useValidacion((datos) => {
    const r = esquemaCambiarEmail.safeParse({
      email: valor(datos, "email"),
      actual: valor(datos, "actual"),
    });
    return r.success
      ? { success: true, data: r.data }
      : { success: false, errores: erroresPorCampo(r.error) };
  });
  const errores = { ...estado.errores, ...locales };

  return (
    <form
      action={accion}
      onSubmit={alEnviar}
      onChange={(e) => e.target instanceof HTMLInputElement && limpiar(e.target.name)}
      noValidate
      className="flex flex-col gap-3 border-t-2 border-fondo pt-3"
    >
      <Campo
        etiqueta="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={estado.valores?.email ?? emailActual}
        ayuda="Te mandamos un mail a la dirección nueva para confirmar el cambio."
        error={errores.email}
        required
      />
      <CampoContrasena
        etiqueta="Tu contraseña actual"
        name="actual"
        autoComplete="current-password"
        error={errores.actual}
        required
      />
      <Resultado estado={estado} />
      <Boton type="submit" variante="secundario" bloque cargando={pendiente}>
        Guardar email
      </Boton>
    </form>
  );
}

/** Cambio de contraseña. */
export function FormularioContrasena() {
  const [estado, accion, pendiente] = useActionState(cambiarContrasena, ESTADO_INICIAL);
  const { locales, alEnviar, limpiar } = useValidacion((datos) => {
    const r = esquemaNuevaContrasena.safeParse({
      contrasena: valor(datos, "contrasena"),
      repetir: valor(datos, "repetir"),
    });
    const actual = esquemaContrasenaActual.safeParse({ actual: valor(datos, "actual") });
    if (r.success && actual.success) return { success: true, data: r.data };
    return {
      success: false,
      errores: {
        ...(actual.success ? {} : erroresPorCampo(actual.error)),
        ...(r.success ? {} : erroresPorCampo(r.error)),
      },
    };
  });
  const errores = { ...estado.errores, ...locales };

  return (
    <form
      action={accion}
      onSubmit={alEnviar}
      onChange={(e) => e.target instanceof HTMLInputElement && limpiar(e.target.name)}
      noValidate
      className="flex flex-col gap-3 border-t-2 border-fondo pt-3"
    >
      <CampoContrasena
        etiqueta="Tu contraseña actual"
        name="actual"
        autoComplete="current-password"
        error={errores.actual}
        required
      />
      <CampoContrasena
        etiqueta="Contraseña nueva"
        name="contrasena"
        autoComplete="new-password"
        ayuda="Al menos 8 caracteres."
        error={errores.contrasena}
        required
      />
      <CampoContrasena
        etiqueta="Repetí la contraseña nueva"
        name="repetir"
        autoComplete="new-password"
        error={errores.repetir}
        required
      />
      <Resultado estado={estado} />
      <Boton type="submit" variante="secundario" bloque cargando={pendiente}>
        Guardar contraseña
      </Boton>
    </form>
  );
}
