"use client";

import { Hammer, MessageCircle, Star } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Avatar } from "@/components/ui/Avatar";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { GrupoChips } from "@/components/ui/Chip";
import { CintaBienvenida, CintaDistancia, CintaPasos } from "@/components/ui/cinta-metrica";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Estrellas } from "@/components/ui/Estrellas";
import { HojaInferior } from "@/components/ui/HojaInferior";
import { Insignia } from "@/components/ui/Insignia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Vacio } from "@/components/ui/Vacio";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-[13px] font-semibold tracking-[0.4px] text-texto-secundario uppercase">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

const OFICIOS = [
  { valor: "gas", etiqueta: "Gas" },
  { valor: "pintura", etiqueta: "Pintura" },
  { valor: "electricidad", etiqueta: "Electricidad" },
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
        <div className="flex flex-wrap gap-2.5">
          <Boton variante="cliente">Buscar profesionales</Boton>
          <Boton variante="profesional">Postularme</Boton>
          <Boton variante="exito">
            <MessageCircle aria-hidden strokeWidth={2} className="size-5" />
            WhatsApp
          </Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="fantasma">Fantasma</Boton>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Boton variante="cliente" tamano="grande">
            Crear cuenta
          </Boton>
          <Boton variante="cliente" cargando>
            Guardando
          </Boton>
          <Boton variante="cliente" disabled>
            Deshabilitado
          </Boton>
          <Boton href="/dev/ui" variante="secundario">
            Como enlace
          </Boton>
        </div>
        <Boton variante="exito" tamano="grande" bloque onClick={() => setHoja(true)}>
          Contactar por WhatsApp
        </Boton>
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
          opciones={[
            { valor: "matriculados", etiqueta: "Solo matriculados" },
            { valor: "calificados", etiqueta: "Mejor calificados" },
            { valor: "ciudad", etiqueta: "Toda la ciudad" },
          ]}
          valor={filtros}
          onChange={setFiltros}
        />
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

      <Seccion titulo="Tarjeta, avatar, estrellas y cinta de distancia">
        <Tarjeta como="article" className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <Avatar nombre="Martín Gómez" />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold">Martín Gómez</p>
              <p className="text-sm text-texto-secundario">Gasista · 12 años · La Perla</p>
            </div>
            <span className="flex items-center gap-1 text-sm font-bold">
              <Star
                aria-hidden
                strokeWidth={1.5}
                className="size-4 fill-current text-naranja-marca"
              />
              4,9
            </span>
          </div>
          <CintaDistancia km={1.2} />
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
          <p className="text-sm font-semibold">Tu puntaje</p>
          <Estrellas valor={puntaje} onChange={setPuntaje} etiqueta="Tu puntaje" />
        </div>
      </Seccion>

      <Seccion titulo="Cinta métrica">
        <div className="space-y-3">
          <CintaDistancia km={0.1} />
          <CintaDistancia km={2.8} />
          <CintaDistancia km={9} />
        </div>
        <CintaPasos pasos={["Datos", "Oficios", "Documentos", "Normas"]} actual={2} />
        <div className="space-y-2.5">
          <CintaBienvenida />
          <EtiquetaMono className="text-xs tracking-[0.6px]">
            Carpintería · Plomería · Cerrajería · Gas
          </EtiquetaMono>
        </div>
      </Seccion>

      <Seccion titulo="Aviso y estado vacío">
        <Aviso>Se comprometió con las normas de seguridad de LabÍA.</Aviso>
        <Tarjeta>
          <Vacio
            icono={Hammer}
            titulo="Todavía no publicaste trabajos"
            descripcion="Contá qué necesitás y los profesionales de tu zona se postulan."
            accion={<Boton variante="cliente">Publicar un trabajo</Boton>}
          />
        </Tarjeta>
      </Seccion>

      <HojaInferior abierta={hoja} onCambioAbierta={setHoja} titulo="Antes de contactar">
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-snug">
          <li>Pedí el presupuesto por escrito.</li>
          <li>Pasá tu dirección exacta recién cuando haya acuerdo.</li>
          <li>Al llegar, confirmá que es la persona del perfil.</li>
          <li>Acordá la seña y dejala escrita.</li>
        </ul>
        <Boton variante="exito" tamano="grande" bloque onClick={() => setHoja(false)}>
          Abrir WhatsApp
        </Boton>
        <Boton variante="fantasma" bloque onClick={() => setHoja(false)}>
          Cancelar
        </Boton>
      </HojaInferior>
    </div>
  );
}
