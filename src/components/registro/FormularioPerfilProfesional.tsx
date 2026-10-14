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
  type ReactNode,
} from "react";

import { BotonGoogle, SeparadorO } from "@/components/auth/BotonGoogle";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
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
} from "@/lib/validaciones/perfil-profesional";

import { BloqueVerificacion } from "./BloqueVerificacion";
import { CargaFotoPerfil, CargaFotosTrabajos, type FotoLocal } from "./CargaFotos";
import { SelectorZonas, type ZonasElegidas } from "./SelectorZonas";
import { VistaPreviaPerfil } from "./VistaPreviaPerfil";

const ID_FORMULARIO = "perfil-profesional";
const DESTINO_SIGUIENTE = "/registro/profesional/normas";

type Props = {
  sesion: SesionRegistro;
  borrador: BorradorPerfil;
  barrios: BarrioOpcion[];
  /** URLs públicas de las fotos ya subidas, por ruta. */
  urls: Record<string, string>;
  verificaciones?: ItemVerificacion[];
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h2
        id={id}
        className="font-mono text-[13px] font-semibold tracking-[0.6px] text-texto-terciario uppercase lg:font-sans lg:text-lg lg:font-bold lg:tracking-normal lg:text-texto lg:normal-case"
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

const nuevoId = () => crypto.randomUUID();

function fotoDeRuta(ruta: string, urls: Record<string, string>): FotoLocal | null {
  const vista = urls[ruta];
  return vista ? { id: ruta, ruta, blob: null, vista } : null;
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
 * Paso 1 del registro de profesional: el perfil que van a ver los clientes. A la izquierda el
 * formulario; en escritorio, a la derecha, la vista previa en vivo, la verificación y el botón.
 */
export function FormularioPerfilProfesional({
  sesion,
  borrador,
  barrios,
  urls,
  verificaciones = [],
}: Props) {
  const router = useRouter();
  const formulario = useRef<HTMLFormElement>(null);
  const [nombre, setNombre] = useState(borrador.nombreCompleto);
  const [oficios, setOficios] = useState<string[]>(borrador.oficios);
  const [zonas, setZonas] = useState<ZonasElegidas>({
    todaLaCiudad: borrador.todaLaCiudad,
    zonas: borrador.zonas,
  });
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
    // Sin DNI y antecedentes (y matrícula si es gasista) no se pasa al paso 2. El servidor lo
    // vuelve a exigir en el paso 2.
    const documentos = faltantes().length > 0 ? mensajeDocumentosFaltantes(tieneGas) : undefined;
    if (conErrores) return { ...conErrores, documentos };
    if (documentos) return { documentos };
    const hayArchivos = Object.values(documentosLocales).some(Boolean);
    if (hayArchivos && !consentido) return { documentos: MENSAJE_CONSENTIMIENTO };

    const resultado = await guardarPerfilProfesional(anterior, datos);
    if (!resultado.guardado) return resultado;

    const errorSubida = await subirFotosPendientes(resultado.guardado.uid);
    if (errorSubida) return { mensaje: errorSubida };

    const errorDocs = await subirDocumentosPendientes(resultado.guardado.uid);
    if (errorDocs) return { mensaje: errorDocs };

    router.push(DESTINO_SIGUIENTE);
    return resultado;
  }

  const [estado, despachar, pendiente] = useActionState(accion, {});
  const errores = estado.errores ?? {};

  useEffect(() => {
    if (!estado.errores) return;
    const primero = formulario.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-grupo-invalido]',
    );
    primero?.focus();
  }, [estado]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
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

  const oficiosTexto = OFICIOS.filter((o) => oficios.includes(o.valor))
    .map((o) => o.etiqueta)
    .join(", ");
  const zonasTexto = zonas.todaLaCiudad
    ? "Toda la ciudad"
    : zonas.zonas
        .map((id) => barrios.find((b) => b.id === id)?.nombre ?? `Barrio ${id}`)
        .join(", ");

  const botonSiguiente = (clases: string) => (
    <Boton
      type="submit"
      form={ID_FORMULARIO}
      variante="profesional"
      tamano="grande"
      bloque
      cargando={pendiente}
      disabled={!hidratado}
      className={clases}
    >
      Siguiente: normas de seguridad
    </Boton>
  );

  if (estado.exito) {
    return (
      <p
        role="status"
        className="rounded-campo bg-exito-suave p-4 text-[15px] font-semibold text-sobre-exito-suave"
      >
        {estado.exito}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col gap-[22px] lg:gap-7">
        <div className="flex flex-col gap-1.5 lg:gap-2">
          <h1 className="font-titulo text-[30px] leading-tight lg:text-[40px]">
            Contanos qué sabés hacer
          </h1>
          <p className="text-[15px] text-texto-secundario lg:text-[17px]">
            Esto es lo que van a ver los clientes en tu perfil.
          </p>
        </div>

        {conCuenta ? (
          <div className="flex flex-col gap-3.5">
            <BotonGoogle rol="profesional" />
            <SeparadorO />
          </div>
        ) : null}

        <form
          id={ID_FORMULARIO}
          ref={formulario}
          onSubmit={enviar}
          noValidate
          className="flex flex-col gap-[22px] lg:gap-7"
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

          <Seccion titulo="Tus datos">
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 lg:grid-cols-3 lg:gap-x-3.5">
              <Campo
                etiqueta="Nombre y apellido"
                name="nombreCompleto"
                autoComplete="name"
                placeholder="Martín Gómez"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                error={errores.nombreCompleto}
                className="col-span-2 lg:col-span-1"
                required
              />
              <Campo
                variante="telefono"
                etiqueta="WhatsApp"
                name="whatsapp"
                placeholder="223 555-0000"
                defaultValue={borrador.whatsapp}
                error={errores.whatsapp}
                required
              />
              {conCuenta ? (
                <Campo
                  etiqueta="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="martin@email.com"
                  error={errores.email}
                  required
                />
              ) : null}
              {conCuenta ? (
                <Campo
                  etiqueta="Contraseña"
                  name="contrasena"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  error={errores.contrasena}
                  className="col-span-2 lg:col-span-1"
                  required
                />
              ) : null}
              <Campo
                variante="seleccion"
                etiqueta="Tu barrio"
                name="barrioId"
                defaultValue={borrador.barrioId}
                ayuda="Se usa para calcular distancias. Nunca mostramos tu dirección."
                error={errores.barrioId}
                className="col-span-2 lg:col-span-1"
                required
              >
                <option value="">Elegí tu barrio</option>
                {barrios.map((barrio) => (
                  <option key={barrio.id} value={barrio.id}>
                    {barrio.nombre}
                  </option>
                ))}
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Tus oficios">
            <p className="text-sm text-texto-secundario">Elegí uno o varios.</p>
            <div
              data-grupo-invalido={errores.oficios ? "" : undefined}
              tabIndex={errores.oficios ? -1 : undefined}
              aria-describedby={errores.oficios ? "error-oficios" : undefined}
            >
              <GrupoChips
                tipo="multiple"
                etiqueta="Oficios"
                opciones={OFICIOS.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
                valor={oficios}
                onChange={setOficios}
              />
            </div>
            {errores.oficios ? (
              <p id="error-oficios" className="text-sm font-semibold text-error">
                {errores.oficios}
              </p>
            ) : null}
            <Campo
              etiqueta="Especialidades (opcional)"
              name="especialidades"
              placeholder="Ej: calefactores, termotanques"
              defaultValue={borrador.especialidades}
              maxLength={MAX_TEXTO_CORTO}
              error={errores.especialidades}
            />
          </Seccion>

          <Seccion titulo="Dónde trabajás">
            <SelectorZonas
              valor={zonas}
              onChange={setZonas}
              barrios={barrios}
              error={errores.zonas}
            />
          </Seccion>

          <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 lg:grid-cols-3 lg:gap-x-3.5">
            <Campo
              etiqueta="Años de experiencia"
              name="aniosExperiencia"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              placeholder="12"
              defaultValue={borrador.aniosExperiencia}
              error={errores.aniosExperiencia}
            />
            <Campo
              etiqueta={tieneGas ? "Matrícula (obligatoria)" : "Matrícula"}
              name="matricula"
              placeholder={tieneGas ? "N° de matrícula" : "Si tenés"}
              defaultValue={borrador.matricula}
              maxLength={40}
              ayuda={
                tieneGas && !errores.matricula
                  ? "La matrícula es obligatoria para gasistas."
                  : undefined
              }
              error={errores.matricula}
              required={tieneGas}
            />
            <Campo
              etiqueta="Disponibilidad"
              name="disponibilidad"
              placeholder="Lun a sáb, 8 a 18 h"
              defaultValue={borrador.disponibilidad}
              maxLength={MAX_TEXTO_CORTO}
              error={errores.disponibilidad}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <Campo
            variante="area"
            etiqueta="Contá cómo trabajás"
            name="descripcion"
            placeholder="Gasista matriculado. Instalaciones, reparaciones y pruebas de hermeticidad. Paso presupuesto por escrito."
            defaultValue={borrador.descripcion}
            maxLength={MAX_DESCRIPCION}
            error={errores.descripcion}
          />

          <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 lg:gap-x-3.5">
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
            <CargaFotosTrabajos
              fotos={fotosTrabajos}
              ocupado={procesando}
              error={errorFotos.trabajos ?? errores.fotosTrabajos}
              onElegir={elegirFotosTrabajos}
              onQuitar={quitarFotoTrabajo}
            />
          </div>

          <BloqueVerificacion
            className="lg:hidden"
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
            <p role="alert" className="text-sm font-semibold text-error lg:hidden">
              {estado.mensaje}
            </p>
          ) : null}
          {botonSiguiente("lg:hidden")}
        </form>
      </div>

      <aside className="hidden min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:flex">
        <VistaPreviaPerfil
          nombre={nombre}
          oficios={oficiosTexto}
          zonas={zonasTexto}
          foto={fotoPerfil?.vista ?? null}
        />
        <BloqueVerificacion
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
          <p role="alert" className="text-sm font-semibold text-error">
            {estado.mensaje}
          </p>
        ) : null}
        {botonSiguiente("")}
      </aside>
    </div>
  );
}
