"use client";

import { Hammer, MessageCircle, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { AvisoPantalla } from "@/components/ui/AvisoPantalla";
import { Avatar } from "@/components/ui/Avatar";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Distancia } from "@/components/ui/Distancia";
import { Encabezado } from "@/components/ui/Encabezado";
import { GrupoChips } from "@/components/ui/Chip";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Estrellas } from "@/components/ui/Estrellas";
import { HojaInferior } from "@/components/ui/HojaInferior";
import { Insignia } from "@/components/ui/Insignia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Toldo } from "@/components/ui/Toldo";
import { Vacio } from "@/components/ui/Vacio";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-bold tracking-[0.4px] text-texto uppercase">{titulo}</h3>
      {children}
    </section>
  );
}

const OFICIOS = [
  { valor: "gas", etiqueta: "Gas" },
  { valor: "pintura", etiqueta: "Pintura" },
  { valor: "electricidad", etiqueta: "Electricidad" },
];

const FILTROS = [
  { valor: "matriculados", etiqueta: "Solo matriculados" },
  { valor: "calificados", etiqueta: "Mejor calificados" },
  { valor: "ciudad", etiqueta: "Toda la ciudad" },
];

/** Todos los componentes base en sus variantes. Se dibuja una vez por tema. */
export function MuestraComponentes() {
  const [oficio, setOficio] = useState<string | null>("gas");
  const [filtros, setFiltros] = useState<string[]>(["matriculados"]);
  const [puntaje, setPuntaje] = useState(4);
  const [hoja, setHoja] = useState(false);

  return (
    <div className="space-y-7">
      <Seccion titulo="Botones">
        <Boton tamano="grande" bloque onClick={() => setHoja(true)}>
          Contactar por WhatsApp
        </Boton>
        <div className="flex flex-wrap gap-2.5">
          <Boton>Principal normal</Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="peligro">Cancelar trabajo</Boton>
          <Boton variante="enlace">Enlace de texto</Boton>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Boton tamano="grande">Crear cuenta</Boton>
          <Boton cargando>Guardando</Boton>
          <Boton disabled>Deshabilitado</Boton>
          <Boton href="/dev/ui" variante="secundario">
            Como enlace
          </Boton>
          <Boton href="/dev/ui" variante="enlace">
            Enlace de texto
          </Boton>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Boton variante="principal" tamano="grande" aria-label="Escribir por WhatsApp">
            <MessageCircle aria-hidden strokeWidth={2.5} className="size-5" />
            WhatsApp
          </Boton>
        </div>
      </Seccion>

      <Seccion titulo="Campos">
        <div className="space-y-3.5">
          <Campo etiqueta="Nombre y apellido" placeholder="Laura Fernández" />
          <Campo variante="telefono" etiqueta="Celular de WhatsApp" placeholder="223 555-0000" />
          <Campo
            variante="pesos"
            etiqueta="Presupuesto estimado"
            ayuda="Es opcional. Se acuerda por WhatsApp."
          />
          <Campo
            etiqueta="Email"
            defaultValue="laura@"
            error="Ingresá un email válido, por ejemplo laura@email.com."
          />
          <Campo
            variante="area"
            etiqueta="Contá qué necesitás"
            maxLength={500}
            placeholder="Se me rompió la llave de paso…"
          />
          <Campo variante="seleccion" etiqueta="Tu barrio" defaultValue="La Perla">
            <option>La Perla</option>
            <option>Centro</option>
            <option>Chauvín</option>
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Chips">
        <GrupoChips
          tipo="unica"
          etiqueta="Oficio"
          opciones={OFICIOS}
          valor={oficio}
          onChange={setOficio}
        />
        <GrupoChips
          tipo="multiple"
          etiqueta="Filtros"
          opciones={FILTROS}
          valor={filtros}
          onChange={setFiltros}
        />
        <Encabezado
          variante="sol"
          titulo="Chips dentro de un encabezado sol"
          className="rounded-tarjeta"
        >
          <GrupoChips
            tipo="unica"
            etiqueta="Oficio sobre sol"
            opciones={OFICIOS}
            valor={oficio}
            onChange={setOficio}
          />
        </Encabezado>
      </Seccion>

      <Seccion titulo="Encabezados">
        <Encabezado
          titulo="Turquesa"
          descripcion="Por defecto, con volver."
          volver={{ href: "/dev/ui" }}
        />
        <Encabezado
          nivel={2}
          variante="equipo"
          titulo="Equipo"
          descripcion="Panel de administración."
        />
        <Encabezado nivel={2} variante="sol" titulo="Sol" descripcion="Texto azul noche." />
        <Encabezado
          variante="plano"
          titulo="Plano"
          descripcion="Sin bloque de color, sobre arena."
        />
      </Seccion>

      <Seccion titulo="Toldos">
        <Toldo color="accion" alto={14} />
        <Toldo color="sol" alto={18} />
        <Toldo color="texto" alto={22} />
        <Toldo color="coral" alto={26} />
      </Seccion>

      <Seccion titulo="Insignias">
        <div className="flex flex-wrap gap-1.5">
          <Insignia variante="verificada" />
          <Insignia variante="antecedentes" />
          <Insignia variante="matriculado" />
          <Insignia variante="urgencia" />
          <Insignia variante="exito" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Insignia variante="verificada" tamano="grande" conIcono />
          <Insignia variante="matriculado" tamano="grande" conIcono />
        </div>
      </Seccion>

      <Seccion titulo="Tarjeta, avatar, distancia y estrellas">
        <Tarjeta como="article" className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <Avatar nombre="Martín Gómez" />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold">Martín Gómez</p>
              <p className="text-sm text-texto">Gasista · 12 años · La Perla</p>
            </div>
            <span className="text-sm font-bold">4,9</span>
          </div>
          <div>
            <Distancia km={1.2} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Insignia variante="verificada" />
            <Insignia variante="antecedentes" />
            <Insignia variante="matriculado" />
          </div>
        </Tarjeta>
        <Tarjeta borde className="flex items-center gap-4">
          <Avatar nombre="Martín Gómez" tamano={84} />
          <div className="space-y-1">
            <Estrellas valor={4.5} />
            <EtiquetaMono partes={["Gas", "La Perla", "hace 20 min", "a 0,8 km"]} />
          </div>
        </Tarjeta>
        <div className="space-y-1">
          <p className="text-sm font-bold">Tu puntaje</p>
          <Estrellas valor={puntaje} onChange={setPuntaje} etiqueta="Tu puntaje" />
        </div>
      </Seccion>

      <Seccion titulo="Avisos y estado vacío">
        <Aviso>Se comprometió con las normas de seguridad de LabÍA.</Aviso>
        <Tarjeta>
          <Vacio
            icono={Hammer}
            titulo="Todavía no publicaste trabajos"
            descripcion="Contá qué necesitás y los profesionales de tu zona se postulan."
            accion={<Boton>Publicar un trabajo</Boton>}
          />
        </Tarjeta>
        <Tarjeta borde>
          <AvisoPantalla
            icono={ShieldCheck}
            titulo="Te quedaste sin conexión"
            texto="Revisá tu internet y volvé a intentar. Lo que estabas escribiendo no se perdió."
            accion={
              <Boton tamano="grande" bloque>
                Reintentar
              </Boton>
            }
          />
        </Tarjeta>
      </Seccion>

      <HojaInferior abierta={hoja} onCambioAbierta={setHoja} titulo="Antes de contactar">
        <ul className="list-disc space-y-2 pl-5 text-base leading-snug">
          <li>Pedí el presupuesto por escrito.</li>
          <li>Pasá tu dirección exacta recién cuando haya acuerdo.</li>
          <li>Al llegar, confirmá que es la persona del perfil.</li>
          <li>Acordá la seña y dejala escrita.</li>
        </ul>
        <Boton tamano="grande" bloque onClick={() => setHoja(false)}>
          Abrir WhatsApp
        </Boton>
        <Boton variante="enlace" bloque onClick={() => setHoja(false)}>
          Cancelar
        </Boton>
      </HojaInferior>
    </div>
  );
}
