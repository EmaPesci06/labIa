"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { TarjetaTrabajo } from "@/components/TarjetaTrabajo";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Chip, GrupoChips } from "@/components/ui/Chip";
import { OFICIOS, type Oficio } from "@/lib/busqueda";
import { comprimirImagen } from "@/lib/imagen";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { adjuntarFotos, publicarTrabajo, type EstadoPublicar } from "@/lib/trabajos/acciones";
import {
  ETIQUETA_OFICIO,
  ETIQUETA_URGENCIA,
  MAX_FOTOS,
  rutaTrabajoPublicado,
  URGENCIAS,
  type UrgenciaTrabajo,
} from "@/lib/validaciones/trabajo";

export type BarrioOpcion = { id: number; nombre: string };

type Foto = { clave: string; blob: Blob; vista: string };

const ESTADO_INICIAL: EstadoPublicar = {};

type Props = {
  barrios: BarrioOpcion[];
  /** Barrios frecuentes (chips), ya filtrados contra `barrios`. */
  frecuentes: BarrioOpcion[];
  barrioInicial: number | null;
  oficioInicial: Oficio | null;
  /** En la sesión falsa de desarrollo no hay Storage: las fotos no se suben. */
  sinAlmacenamiento?: boolean;
};

/**
 * Formulario "Publicar un trabajo" (LAB-26). Server Action + Zod; las fotos se comprimen en el
 * navegador y se suben a `fotos/trabajos/<id>/` una vez creado el trabajo.
 */
export function FormularioTrabajo({
  barrios,
  frecuentes,
  barrioInicial,
  oficioInicial,
  sinAlmacenamiento = false,
}: Props) {
  const router = useRouter();
  const entradaFotos = useRef<HTMLInputElement>(null);

  const [oficio, setOficio] = useState<string | null>(oficioInicial);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [barrioId, setBarrioId] = useState<number | null>(barrioInicial);
  const [otroBarrio, setOtroBarrio] = useState(
    barrioInicial !== null && !frecuentes.some((b) => b.id === barrioInicial),
  );
  const [urgencia, setUrgencia] = useState<UrgenciaTrabajo>("lo_antes_posible");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [errorFotos, setErrorFotos] = useState<string | null>(null);

  // Si el barrio del cliente no es frecuente, aparece como primer chip.
  const chipsBarrio = [...frecuentes];
  const propio = barrios.find((b) => b.id === barrioInicial);
  if (propio && !chipsBarrio.some((b) => b.id === propio.id)) chipsBarrio.unshift(propio);

  const [estado, accion, pendiente] = useActionState(
    async (anterior: EstadoPublicar, datos: FormData): Promise<EstadoPublicar> => {
      datos.set("cantidadFotos", String(fotos.length));
      const nuevo = await publicarTrabajo(anterior, datos);
      const id = nuevo.trabajoId;
      if (!id) return nuevo;

      // El trabajo ya existe: se suben las fotos a su carpeta y se guardan las rutas.
      if (!sinAlmacenamiento) {
        const supabase = crearClienteNavegador();
        const rutas: string[] = [];
        for (const [i, foto] of fotos.entries()) {
          const ruta = `trabajos/${id}/${i}-${Date.now()}.jpg`;
          const { error } = await supabase.storage
            .from("fotos")
            .upload(ruta, foto.blob, { contentType: "image/jpeg" });
          if (!error) rutas.push(ruta);
        }
        if (rutas.length > 0) await adjuntarFotos(id, rutas);
      }
      router.push(rutaTrabajoPublicado(id));
      return nuevo;
    },
    ESTADO_INICIAL,
  );
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {};

  useEffect(() => {
    const vistas = fotos.map((f) => f.vista);
    return () => vistas.forEach((v) => URL.revokeObjectURL(v));
  }, [fotos]);

  async function agregarFotos(archivos: FileList | null) {
    if (!archivos) return;
    setErrorFotos(null);
    const nuevas: Foto[] = [];
    try {
      for (const archivo of Array.from(archivos)) {
        if (fotos.length + nuevas.length >= MAX_FOTOS) {
          setErrorFotos("Podés subir hasta 4 fotos.");
          break;
        }
        const blob = await comprimirImagen(archivo);
        nuevas.push({
          clave: `${Date.now()}-${nuevas.length}`,
          blob,
          vista: URL.createObjectURL(blob),
        });
      }
    } catch (error) {
      setErrorFotos(error instanceof Error ? error.message : "No pudimos leer esa foto.");
    }
    if (nuevas.length) setFotos((actuales) => [...actuales, ...nuevas]);
    if (entradaFotos.current) entradaFotos.current.value = "";
  }

  const barrioElegido = barrios.find((b) => b.id === barrioId);
  const opcionesOficio = OFICIOS.map((o) => ({ valor: o, etiqueta: ETIQUETA_OFICIO[o] }));
  const opcionesUrgencia = URGENCIAS.map((u) => ({ valor: u, etiqueta: ETIQUETA_URGENCIA[u] }));

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <form
        action={accion}
        noValidate
        className="flex min-w-0 flex-1 flex-col gap-[18px] lg:rounded-[22px] lg:bg-superficie lg:p-8"
      >
        <input type="hidden" name="oficio" value={oficio ?? ""} />
        <input type="hidden" name="barrioId" value={barrioId ?? ""} />
        <input type="hidden" name="urgencia" value={urgencia} />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-texto">
            ¿Qué oficio necesitás?
          </legend>
          <GrupoChips
            tipo="unica"
            etiqueta="Oficio"
            opciones={opcionesOficio}
            valor={oficio}
            onChange={setOficio}
          />
          {errores.oficio ? (
            <p role="alert" className="text-sm font-semibold text-error">
              {errores.oficio}
            </p>
          ) : null}
        </fieldset>

        <Campo
          etiqueta="Título"
          name="titulo"
          placeholder="Ej.: Olor a gas en la cocina"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={80}
          error={errores.titulo}
          required
        />

        <Campo
          variante="area"
          etiqueta="Contá qué pasa"
          name="descripcion"
          placeholder="Desde cuándo pasa, qué ya probaste, cualquier dato que ayude a presupuestar"
          rows={5}
          maxLength={1000}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          error={errores.descripcion}
          required
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-texto">Barrio</legend>
          <div role="radiogroup" aria-label="Barrio" className="flex flex-wrap gap-x-2">
            {chipsBarrio.map((b) => (
              <Chip
                key={b.id}
                modo="radio"
                seleccionado={!otroBarrio && barrioId === b.id}
                onClick={() => {
                  setOtroBarrio(false);
                  setBarrioId(b.id);
                }}
              >
                {b.nombre}
              </Chip>
            ))}
            <Chip modo="radio" seleccionado={otroBarrio} onClick={() => setOtroBarrio(true)}>
              Otro barrio
            </Chip>
          </div>
          {otroBarrio ? (
            <Campo
              variante="seleccion"
              etiqueta="Elegí el barrio"
              value={barrioId ?? ""}
              onChange={(e) => setBarrioId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Elegí un barrio</option>
              {barrios.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </Campo>
          ) : null}
          {errores.barrioId ? (
            <p role="alert" className="text-sm font-semibold text-error">
              {errores.barrioId}
            </p>
          ) : (
            <p className="text-sm text-texto-terciario">
              Tu dirección exacta la pasás recién cuando elijas a alguien.
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-texto">¿Para cuándo?</legend>
          <GrupoChips
            tipo="unica"
            etiqueta="¿Para cuándo?"
            opciones={opcionesUrgencia}
            valor={urgencia}
            onChange={(v) => setUrgencia(v as UrgenciaTrabajo)}
          />
        </fieldset>

        <div className="flex flex-col gap-2">
          <input
            ref={entradaFotos}
            id="fotos-trabajo"
            aria-label="Agregar fotos del trabajo"
            tabIndex={-1}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => void agregarFotos(e.target.files)}
          />
          {fotos.length < MAX_FOTOS ? (
            <button
              type="button"
              onClick={() => entradaFotos.current?.click()}
              className="flex min-h-[72px] items-center justify-center gap-2 rounded-boton border-[1.5px] border-dashed border-borde bg-superficie text-[15px] font-semibold text-texto hover:bg-azul-suave"
            >
              <ImagePlus aria-hidden strokeWidth={2} className="size-[22px] text-azul" />
              Agregar fotos (opcional)
            </button>
          ) : null}
          {fotos.length > 0 ? (
            <ul className="grid grid-cols-4 gap-2" aria-label="Fotos del trabajo">
              {fotos.map((foto, i) => (
                <li key={foto.clave} className="relative aspect-square">
                  <Image
                    src={foto.vista}
                    alt={`Foto ${i + 1} del trabajo`}
                    fill
                    unoptimized
                    sizes="96px"
                    className="rounded-campo object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Quitar foto ${i + 1}`}
                    onClick={() => setFotos((f) => f.filter((x) => x.clave !== foto.clave))}
                    className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-azul text-sobre-azul"
                  >
                    <X aria-hidden strokeWidth={2} className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm text-texto-terciario">Hasta 4 fotos del problema.</p>
          {errorFotos ? (
            <p role="alert" className="text-sm font-semibold text-error">
              {errorFotos}
            </p>
          ) : null}
        </div>

        <Campo
          variante="pesos"
          etiqueta="Presupuesto estimado (opcional)"
          name="presupuesto"
          ayuda="Si tenés una idea de cuánto querés gastar"
          placeholder="0"
          defaultValue={valores.presupuesto}
          error={errores.presupuesto}
        />

        {estado.mensaje ? (
          <p role="alert" className="text-sm font-semibold text-error">
            {estado.mensaje}
          </p>
        ) : null}

        <Boton
          type="submit"
          variante="cliente"
          tamano="grande"
          cargando={pendiente}
          className="w-full lg:w-auto lg:self-start lg:px-7"
        >
          Publicar trabajo
        </Boton>
      </form>

      <aside className="hidden min-w-0 flex-col gap-4 lg:flex lg:w-[380px] lg:shrink-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-azul">Así lo van a ver los profesionales</h2>
          <TarjetaTrabajo
            oficio={(oficio as Oficio | null) ?? "gas"}
            barrio={barrioElegido?.nombre ?? "Tu barrio"}
            titulo={titulo}
            descripcion={descripcion}
            urgencia={urgencia}
            postulantes={0}
          />
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-superficie p-[22px]">
          <h2 className="text-lg font-bold text-texto">Consejos para un buen pedido</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-snug text-texto-secundario">
            <li>Sumá fotos del problema.</li>
            <li>Contá desde cuándo pasa.</li>
            <li>No pongas tu dirección exacta: solo el barrio.</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-[20px] bg-azul-suave p-[22px]">
          <h2 className="text-lg font-bold text-sobre-azul-suave">Qué pasa después</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-snug text-texto">
            <li>Los profesionales de tu zona ven el trabajo.</li>
            <li>Se postulan con un mensaje y un precio estimado.</li>
            <li>Elegís a uno y coordinan por WhatsApp.</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
