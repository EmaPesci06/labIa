"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import { BotonGoogle, SeparadorO } from "@/components/auth/BotonGoogle";
import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { AvisoPantalla } from "@/components/ui/AvisoPantalla";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Combobox } from "@/components/ui/Combobox";
import { GrupoChips } from "@/components/ui/Chip";
import { comprimirImagen } from "@/lib/imagen";
import { registrarEvento } from "@/lib/metricas";
import { guardarFotosPerfil, guardarPerfilProfesional } from "@/lib/registro/profesional";
import { tiposVigentes } from "@/lib/registro/documentos-estado";
import { subirDocumentos } from "@/lib/registro/subir-documentos";
import { MENSAJE_CONSENTIMIENTO } from "@/lib/validaciones/consentimiento";
import {
  documentosFaltantes,
  mensajeDocumentosFaltantes,
  type TipoDocumento,
} from "@/lib/validaciones/documentos";
import type {
  BarrioOpcion,
  BorradorPerfil,
  EstadoPerfil,
  ItemVerificacion,
  SesionRegistro,
} from "@/lib/registro/tipos";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { erroresPorCampo } from "@/lib/validaciones/auth";
import {
  esquemaCuentaNueva,
  esquemaPerfilProfesional,
  leerPerfilProfesional,
  MAX_DESCRIPCION,
  MAX_FOTOS_TRABAJOS,
  MAX_TEXTO_CORTO,
  OFICIOS,
  separarNombre,
} from "@/lib/validaciones/perfil-profesional";

import { CargaFotoPerfil, CargaFotosTrabajos, type FotoLocal } from "./CargaFotos";
import { EncabezadoRegistro } from "./EncabezadoRegistro";
import { PasoDocumentosProfesional } from "./PasoDocumentosProfesional";
import { SelectorZonas, type ZonasElegidas } from "./SelectorZonas";

const ID_FORMULARIO = "perfil-profesional";
const DESTINO_SIGUIENTE = "/registro/profesional/normas";

type Props = {
  sesion: SesionRegistro;
  borrador: BorradorPerfil;
  barrios: BarrioOpcion[];
  /** URLs públicas de las fotos ya subidas, por ruta. */
  urls: Record<string, string>;
  verificaciones?: ItemVerificacion[];
  pasoInicial?: 1 | 2;
};

const nuevoId = () => crypto.randomUUID();

function fotoDeRuta(ruta: string, urls: Record<string, string>): FotoLocal | null {
  const vista = urls[ruta];
  return vista ? { id: ruta, ruta, blob: null, vista } : null;
}

/** "Marta Rodríguez" → "Marta R." para mostrar el ejemplo vivo bajo el nombre. */
function nombreVisibleCorto(completo: string): string {
  const { nombre, apellido } = separarNombre(completo);
  if (!nombre) return "Marta R.";
  return apellido ? `${nombre} ${apellido[0]}.` : nombre;
}

/** Validación del navegador con los mismos esquemas que usa el servidor. */
function validarEnNavegador(datos: FormData, conCuenta: boolean): EstadoPerfil | null {
  const errores: Record<string, string> = {};
  const perfil = esquemaPerfilProfesional.safeParse(leerPerfilProfesional(datos));
  if (!perfil.success) Object.assign(errores, erroresPorCampo(perfil.error));
  if (conCuenta) {
    const cuenta = esquemaCuentaNueva.safeParse({
      email: String(datos.get("email") ?? ""),
      contrasena: String(datos.get("contrasena") ?? ""),
    });
    if (!cuenta.success) Object.assign(errores, erroresPorCampo(cuenta.error));
  }
  return Object.keys(errores).length > 0
    ? { errores, mensaje: "Revisá los campos marcados en rojo." }
    : null;
}

const suscribirNada = () => () => undefined;

/**
 * Pasos 1 y 2 del registro de profesional (`App-ProPerfil` y `App-ProDocumentos`):
 * el paso 1 arma el perfil y valida los datos; el paso 2 carga DNI, antecedentes y matrícula y
 * guarda todo antes de pasar al paso 3 (normas).
 */
export function FormularioPerfilProfesional({
  sesion,
  borrador,
  barrios,
  urls,
  verificaciones = [],
  pasoInicial = 1,
}: Props) {
  const router = useRouter();
  const formulario = useRef<HTMLFormElement>(null);
  const idErrorOficios = useId();
  const [paso, setPaso] = useState<1 | 2>(pasoInicial);

  const [nombre, setNombre] = useState(borrador.nombreCompleto);
  const [whatsapp, setWhatsapp] = useState(borrador.whatsapp);
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [barrioId, setBarrioId] = useState(borrador.barrioId);
  const [oficios, setOficios] = useState<string[]>(borrador.oficios);
  const [especialidades, setEspecialidades] = useState(borrador.especialidades);
  const [zonas, setZonas] = useState<ZonasElegidas>({
    todaLaCiudad: borrador.todaLaCiudad,
    zonas: borrador.zonas,
  });
  const [aniosExperiencia, setAniosExperiencia] = useState(borrador.aniosExperiencia);
  const [matricula, setMatricula] = useState(borrador.matricula);
  const [disponibilidad, setDisponibilidad] = useState(borrador.disponibilidad);
  const [descripcion, setDescripcion] = useState(borrador.descripcion);

  const [fotoPerfil, setFotoPerfil] = useState<FotoLocal | null>(() =>
    borrador.fotoPerfil ? fotoDeRuta(borrador.fotoPerfil, urls) : null,
  );
  const [fotosTrabajos, setFotosTrabajos] = useState<FotoLocal[]>(() =>
    borrador.fotosTrabajos.flatMap((ruta) => fotoDeRuta(ruta, urls) ?? []),
  );
  const [documentosLocales, setDocumentosLocales] = useState<
    Partial<Record<TipoDocumento, File | null>>
  >({});
  // Consentimiento expreso para datos sensibles (LAB-43): sin tildar, no se suben documentos.
  const [consentido, setConsentido] = useState(false);
  const [subidosAhora, setSubidosAhora] = useState<Partial<Record<TipoDocumento, boolean>>>({});
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorFotos, setErrorFotos] = useState<{ perfil?: string; trabajos?: string }>({});
  const [erroresPaso1, setErroresPaso1] = useState<Partial<Record<string, string>> | null>(null);
  const [mensajePaso1, setMensajePaso1] = useState<string | null>(null);

  // Fotos ya subidas que la persona quitó: se borran del bucket al guardar.
  const quitadas = useRef<string[]>([]);
  const urlsLocales = useRef<string[]>([]);

  // El botón se habilita recién cuando React tomó el control del formulario: antes, un envío
  // nativo mandaría la contraseña por la URL.
  const hidratado = useSyncExternalStore(
    suscribirNada,
    () => true,
    () => false,
  );

  useEffect(() => {
    registrarEvento("registro_iniciado", { rol: "profesional" });
  }, []);

  useEffect(() => {
    const locales = urlsLocales.current;
    return () => locales.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const tieneGas = oficios.includes("gas");
  const conCuenta = sesion === null;

  async function subirFotosPendientes(uid: string): Promise<string | null> {
    const hayNuevas = fotoPerfil?.blob || fotosTrabajos.some((f) => f.blob);
    if (!hayNuevas && quitadas.current.length === 0) return null;

    const almacen = crearClienteNavegador().storage.from("fotos");
    const marca = Date.now();
    let rutaPerfil = fotoPerfil?.ruta ?? null;
    const rutasTrabajos: string[] = [];
    try {
      if (fotoPerfil?.blob) {
        rutaPerfil = `perfiles/${uid}/${marca}.jpg`;
        const { error } = await almacen.upload(rutaPerfil, fotoPerfil.blob, {
          contentType: "image/jpeg",
        });
        if (error) throw error;
      }
      let indice = 0;
      for (const foto of fotosTrabajos) {
        if (foto.ruta) {
          rutasTrabajos.push(foto.ruta);
        } else if (foto.blob) {
          const ruta = `trabajos-hechos/${uid}/${marca}-${indice}.jpg`;
          indice += 1;
          const { error } = await almacen.upload(ruta, foto.blob, { contentType: "image/jpeg" });
          if (error) throw error;
          rutasTrabajos.push(ruta);
        }
      }
    } catch {
      return "Guardamos tu perfil, pero no pudimos subir las fotos. Probá de nuevo.";
    }

    const guardado = await guardarFotosPerfil({
      fotoPerfil: rutaPerfil,
      fotosTrabajos: rutasTrabajos,
    });
    if (!guardado.ok) return guardado.mensaje ?? "No pudimos guardar las fotos.";

    if (quitadas.current.length > 0) {
      // Si falla el borrado queda un archivo suelto, sin consecuencias para la persona.
      await almacen.remove(quitadas.current);
      quitadas.current = [];
    }
    return null;
  }

  const elegirDocumento = (tipo: TipoDocumento, archivo: File) => {
    setDocumentosLocales((prev) => ({ ...prev, [tipo]: archivo }));
  };

  const quitarDocumento = (tipo: TipoDocumento) => {
    setDocumentosLocales((prev) => ({ ...prev, [tipo]: null }));
  };

  /** Documentos obligatorios que no están ni elegidos, ni subidos, ni registrados sin rechazo. */
  function faltantes(): TipoDocumento[] {
    const presentes = tiposVigentes(verificaciones);
    for (const tipo of Object.keys(subidosAhora) as TipoDocumento[]) {
      if (subidosAhora[tipo]) presentes.add(tipo);
    }
    for (const tipo of Object.keys(documentosLocales) as TipoDocumento[]) {
      if (documentosLocales[tipo]) presentes.add(tipo);
    }
    return documentosFaltantes(tieneGas, presentes);
  }

  async function subirDocumentosPendientes(uid: string): Promise<string | null> {
    const entradas = (Object.entries(documentosLocales) as [TipoDocumento, File | null][]).filter(
      (entrada): entrada is [TipoDocumento, File] => Boolean(entrada[1]),
    );
    if (entradas.length === 0) return null;

    const resultado = await subirDocumentos(
      uid,
      entradas,
      (hechos, total) => setProgreso({ hechos, total }),
      consentido,
    );
    setProgreso(null);
    if (resultado.subidos.length > 0) {
      // Lo que ya quedó subido no se vuelve a subir en un reintento.
      setSubidosAhora((previos) => ({
        ...previos,
        ...Object.fromEntries(resultado.subidos.map((tipo) => [tipo, true])),
      }));
      setDocumentosLocales((previos) => ({
        ...previos,
        ...Object.fromEntries(resultado.subidos.map((tipo) => [tipo, null])),
      }));
    }
    if (!resultado.ok) return resultado.mensaje;
    registrarEvento("documentos_enviados");
    return null;
  }

  async function accion(anterior: EstadoPerfil, datos: FormData): Promise<EstadoPerfil> {
    const conErrores = validarEnNavegador(datos, conCuenta);
    // Sin DNI y antecedentes (y matrícula si es gasista) no se pasa al paso 3. El servidor lo
    // vuelve a exigir en el paso 3.
    const documentos = faltantes().length > 0 ? mensajeDocumentosFaltantes(tieneGas) : undefined;
    if (conErrores) {
      setPaso(1);
      return { ...conErrores, documentos };
    }
    if (documentos) return { documentos };
    const hayArchivos = Object.values(documentosLocales).some(Boolean);
    if (hayArchivos && !consentido) return { documentos: MENSAJE_CONSENTIMIENTO };

    const resultado = await guardarPerfilProfesional(anterior, datos);
    if (!resultado.guardado) {
      if (resultado.errores && Object.keys(resultado.errores).length > 0) setPaso(1);
      return resultado;
    }

    const errorSubida = await subirFotosPendientes(resultado.guardado.uid);
    if (errorSubida) return { mensaje: errorSubida };

    const errorDocs = await subirDocumentosPendientes(resultado.guardado.uid);
    if (errorDocs) return { mensaje: errorDocs };

    router.push(DESTINO_SIGUIENTE);
    return resultado;
  }

  const [estado, despachar, pendiente] = useActionState(accion, {});
  const errores = erroresPaso1 ?? estado.errores ?? {};

  useEffect(() => {
    if (!estado.errores || Object.keys(estado.errores).length === 0) return;
    requestAnimationFrame(() => {
      const primero = formulario.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-grupo-invalido]',
      );
      primero?.focus();
    });
  }, [estado]);

  function enfocarPrimerError() {
    requestAnimationFrame(() => {
      const primero = formulario.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-grupo-invalido]',
      );
      primero?.focus();
    });
  }

  function avanzarADocumentos() {
    if (!formulario.current) return;
    const datos = new FormData(formulario.current);
    const conErrores = validarEnNavegador(datos, conCuenta);
    if (conErrores) {
      setErroresPaso1(conErrores.errores ?? {});
      setMensajePaso1(conErrores.mensaje ?? null);
      enfocarPrimerError();
      return;
    }
    setErroresPaso1({});
    setMensajePaso1(null);
    setPaso(2);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso === 1) {
      avanzarADocumentos();
      return;
    }
    setErroresPaso1(null);
    setMensajePaso1(null);
    const datos = new FormData(evento.currentTarget);
    // En el paso 2 los campos de cuenta ya no están montados: se suman en memoria, sin
    // dejar la contraseña como atributo de un `<input type="hidden">` legible por extensiones.
    if (conCuenta) {
      datos.set("email", email);
      datos.set("contrasena", contrasena);
    }
    startTransition(() => despachar(datos));
  }

  async function elegirFotoPerfil(archivo: File) {
    setProcesando(true);
    setErrorFotos((previos) => ({ ...previos, perfil: undefined }));
    try {
      const blob = await comprimirImagen(archivo, { cuadrada: true });
      const vista = URL.createObjectURL(blob);
      urlsLocales.current.push(vista);
      if (fotoPerfil?.ruta) quitadas.current.push(fotoPerfil.ruta);
      setFotoPerfil({ id: nuevoId(), ruta: null, blob, vista });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No pudimos usar esa foto.";
      setErrorFotos((previos) => ({ ...previos, perfil: mensaje }));
    } finally {
      setProcesando(false);
    }
  }

  async function elegirFotosTrabajos(archivos: File[]) {
    setProcesando(true);
    setErrorFotos((previos) => ({ ...previos, trabajos: undefined }));
    const lugar = MAX_FOTOS_TRABAJOS - fotosTrabajos.length;
    const nuevas: FotoLocal[] = [];
    let mensaje: string | undefined =
      archivos.length > lugar
        ? `Podés subir hasta ${MAX_FOTOS_TRABAJOS} fotos: sumamos solo las primeras ${lugar}.`
        : undefined;
    for (const archivo of archivos.slice(0, lugar)) {
      try {
        const blob = await comprimirImagen(archivo);
        const vista = URL.createObjectURL(blob);
        urlsLocales.current.push(vista);
        nuevas.push({ id: nuevoId(), ruta: null, blob, vista });
      } catch (error) {
        mensaje = error instanceof Error ? error.message : "No pudimos usar una de las fotos.";
      }
    }
    setFotosTrabajos((previas) => [...previas, ...nuevas].slice(0, MAX_FOTOS_TRABAJOS));
    setErrorFotos((previos) => ({ ...previos, trabajos: mensaje }));
    setProcesando(false);
  }

  function quitarFotoTrabajo(id: string) {
    const foto = fotosTrabajos.find((f) => f.id === id);
    if (foto?.ruta) quitadas.current.push(foto.ruta);
    setFotosTrabajos((previas) => previas.filter((f) => f.id !== id));
  }

  if (estado.exito) {
    return (
      <div className="flex flex-1 flex-col">
        <SaltarAlContenido />
        <main id="contenido" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          <AvisoPantalla
            titulo="Revisá tu email"
            texto={estado.exito}
            accion={
              <Boton href="/ingresar" tamano="grande" bloque>
                Ir a ingresar
              </Boton>
            }
          />
        </main>
      </div>
    );
  }

  const tituloEncabezado = paso === 1 ? "Armá tu perfil" : "Mostranos quién sos";
  const descripcionEncabezado =
    paso === 1
      ? "Es lo que ven los vecinos cuando te encuentran."
      : "Los ve solo nuestro equipo. En tu perfil aparece la insignia, nunca el documento.";

  return (
    <div className="flex flex-1 flex-col">
      <SaltarAlContenido />
      <EncabezadoRegistro
        paso={paso}
        titulo={tituloEncabezado}
        descripcion={descripcionEncabezado}
      />

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3.5 px-5 pt-3.5 pb-6 focus:outline-none lg:px-8 lg:py-8"
      >
        {paso === 1 && conCuenta ? (
          <div className="flex flex-col gap-3">
            <BotonGoogle rol="profesional" />
            <SeparadorO />
          </div>
        ) : null}

        <form
          id={ID_FORMULARIO}
          ref={formulario}
          onSubmit={enviar}
          noValidate
          className="flex flex-1 flex-col gap-3.5"
        >
          <input type="hidden" name="fotoPerfil" value={fotoPerfil?.ruta ?? ""} />
          {fotosTrabajos.map((foto) =>
            foto.ruta ? (
              <input key={foto.id} type="hidden" name="fotosTrabajos" value={foto.ruta} />
            ) : null,
          )}
          {oficios.map((valor) => (
            <input key={valor} type="hidden" name="oficios" value={valor} />
          ))}

          {paso === 1 ? (
            <>
              <CargaFotoPerfil
                foto={fotoPerfil}
                ocupado={procesando}
                error={errorFotos.perfil}
                onElegir={elegirFotoPerfil}
                onQuitar={() => {
                  if (fotoPerfil?.ruta) quitadas.current.push(fotoPerfil.ruta);
                  setFotoPerfil(null);
                }}
              />

              <Campo
                etiqueta="Nombre y apellido"
                name="nombreCompleto"
                autoComplete="name"
                placeholder="Marta Rodríguez"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                ayuda={`En tu perfil se muestra como “${nombreVisibleCorto(nombre)}”`}
                error={errores.nombreCompleto}
                required
              />

              <Campo
                variante="telefono"
                etiqueta="WhatsApp"
                name="whatsapp"
                placeholder="223 555-0000"
                value={whatsapp}
                onChange={(evento) => setWhatsapp(evento.target.value)}
                error={errores.whatsapp}
                required
              />

              {conCuenta ? (
                <>
                  <Campo
                    etiqueta="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="marta@ejemplo.com"
                    value={email}
                    onChange={(evento) => setEmail(evento.target.value)}
                    error={errores.email}
                    required
                  />
                  <Campo
                    etiqueta="Contraseña"
                    name="contrasena"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={contrasena}
                    onChange={(evento) => setContrasena(evento.target.value)}
                    error={errores.contrasena}
                    required
                  />
                </>
              ) : null}

              <fieldset className="flex flex-col">
                <legend className="mb-1.5 text-base font-bold text-texto">
                  ¿Qué oficios hacés?
                </legend>
                <div
                  data-grupo-invalido={errores.oficios ? "" : undefined}
                  tabIndex={errores.oficios ? -1 : undefined}
                  aria-describedby={errores.oficios ? idErrorOficios : undefined}
                >
                  <GrupoChips
                    tipo="multiple"
                    etiqueta="Oficios"
                    opciones={OFICIOS.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
                    valor={oficios}
                    onChange={setOficios}
                  />
                </div>
                <p className="mt-1.5 text-sm text-texto">Para gas te vamos a pedir la matrícula.</p>
                {errores.oficios ? (
                  <p id={idErrorOficios} className="mt-1 text-[15px] font-bold text-error">
                    {errores.oficios}
                  </p>
                ) : null}
              </fieldset>

              <Campo
                etiqueta={tieneGas ? "Matrícula (obligatoria)" : "Matrícula"}
                name="matricula"
                placeholder={tieneGas ? "N° de matrícula" : "Si tenés"}
                value={matricula}
                onChange={(evento) => setMatricula(evento.target.value)}
                maxLength={40}
                ayuda={
                  tieneGas && !errores.matricula
                    ? "La matrícula es obligatoria para gasistas."
                    : undefined
                }
                error={errores.matricula}
                required={tieneGas}
              />

              <Combobox
                etiqueta="Barrio desde donde salís"
                name="barrioId"
                opciones={barrios.map((barrio) => ({
                  valor: String(barrio.id),
                  etiqueta: barrio.nombre,
                }))}
                value={barrioId}
                onValueChange={setBarrioId}
                placeholder="Elegí tu barrio"
                placeholderBusqueda="Buscá tu barrio…"
                sinResultados="No encontramos ese barrio."
                ayuda="Se usa para calcular distancias. Nunca mostramos tu dirección."
                error={errores.barrioId}
                required
              />

              <fieldset className="flex flex-col gap-2">
                <legend className="text-base font-bold text-texto">Dónde trabajás</legend>
                <SelectorZonas
                  valor={zonas}
                  onChange={setZonas}
                  barrios={barrios}
                  error={errores.zonas}
                />
              </fieldset>

              <Campo
                variante="area"
                etiqueta="Contá qué arreglás"
                name="descripcion"
                placeholder="Pérdidas, destapaciones, termotanques y cambio de cañerías."
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                maxLength={MAX_DESCRIPCION}
                error={errores.descripcion}
              />

              <Campo
                etiqueta="Especialidades (opcional)"
                name="especialidades"
                placeholder="Ej: calefactores, termotanques"
                value={especialidades}
                onChange={(evento) => setEspecialidades(evento.target.value)}
                maxLength={MAX_TEXTO_CORTO}
                error={errores.especialidades}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <Campo
                  etiqueta="Años de experiencia"
                  name="aniosExperiencia"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  placeholder="12"
                  value={aniosExperiencia}
                  onChange={(evento) => setAniosExperiencia(evento.target.value)}
                  error={errores.aniosExperiencia}
                />
                <Campo
                  etiqueta="Disponibilidad"
                  name="disponibilidad"
                  placeholder="Lun a sáb, 8 a 18 h"
                  value={disponibilidad}
                  onChange={(evento) => setDisponibilidad(evento.target.value)}
                  maxLength={MAX_TEXTO_CORTO}
                  error={errores.disponibilidad}
                />
              </div>

              <CargaFotosTrabajos
                fotos={fotosTrabajos}
                ocupado={procesando}
                error={errorFotos.trabajos ?? errores.fotosTrabajos}
                onElegir={elegirFotosTrabajos}
                onQuitar={quitarFotoTrabajo}
              />

              {mensajePaso1 || estado.mensaje ? (
                <p role="alert" className="text-[15px] font-bold text-error">
                  {mensajePaso1 || estado.mensaje}
                </p>
              ) : null}

              <div
                key="paso-1-acciones"
                className="-mx-5 mt-auto -mb-6 rounded-t-hoja bg-superficie px-5 pt-3 pb-4 lg:mx-0 lg:mt-2 lg:mb-0 lg:rounded-tarjeta lg:p-5"
              >
                <Boton
                  key="btn-avanzar"
                  type="button"
                  tamano="grande"
                  bloque
                  disabled={!hidratado}
                  onClick={avanzarADocumentos}
                >
                  Seguir con los documentos
                </Boton>
              </div>
            </>
          ) : (
            <>
              {/* Campos del paso 1 en oculto para que el envío mande el perfil completo. */}
              <input type="hidden" name="nombreCompleto" value={nombre} />
              <input type="hidden" name="whatsapp" value={whatsapp} />
              {/* El email y la contraseña no van en el DOM: se suman al FormData al enviar. */}
              <input type="hidden" name="barrioId" value={barrioId} />
              <input type="hidden" name="especialidades" value={especialidades} />
              <input
                type="hidden"
                name="todaLaCiudad"
                value={zonas.todaLaCiudad ? "true" : "false"}
              />
              {zonas.zonas.map((id) => (
                <input key={id} type="hidden" name="zonas" value={id} />
              ))}
              <input type="hidden" name="aniosExperiencia" value={aniosExperiencia} />
              <input type="hidden" name="matricula" value={matricula} />
              <input type="hidden" name="disponibilidad" value={disponibilidad} />
              <input type="hidden" name="descripcion" value={descripcion} />

              <PasoDocumentosProfesional
                tieneGas={tieneGas}
                verificaciones={verificaciones}
                documentosLocales={documentosLocales}
                onElegirDocumento={elegirDocumento}
                onQuitarDocumento={quitarDocumento}
                subidosAhora={subidosAhora}
                progreso={progreso}
                error={estado.documentos}
                ocupado={procesando || pendiente}
                consentimiento={{ tildado: consentido, onCambio: setConsentido }}
              />

              {estado.mensaje ? (
                <p role="alert" className="text-[15px] font-bold text-error">
                  {estado.mensaje}
                </p>
              ) : null}

              <div
                key="paso-2-acciones"
                className="-mx-5 mt-auto -mb-6 flex flex-col rounded-t-hoja bg-superficie px-5 pt-3 pb-4 lg:mx-0 lg:mt-2 lg:mb-0 lg:rounded-tarjeta lg:p-5"
              >
                <Boton
                  key="btn-enviar"
                  type="submit"
                  tamano="grande"
                  bloque
                  cargando={pendiente}
                  disabled={!hidratado}
                >
                  Seguir con las normas
                </Boton>
                <button
                  type="button"
                  onClick={() => {
                    setPaso(1);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                  className="inline-flex min-h-11 items-center justify-center self-center px-3 text-[15px] font-bold text-texto underline decoration-2 underline-offset-4"
                >
                  Volver al perfil
                </button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
