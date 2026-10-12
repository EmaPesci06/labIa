import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { navegacionPara } from "@/lib/navegacion";

import { BarraInferior } from "./BarraInferior";
import { BarraSuperior } from "./BarraSuperior";
import { Bloque, EsqueletoPagina } from "./Esqueleto";
import { MenuAvatar } from "./MenuAvatar";

const ruta = vi.hoisted(() => ({ path: "/inicio", query: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => ruta.path,
  useSearchParams: () => new URLSearchParams(ruta.query),
}));

beforeEach(() => {
  ruta.path = "/inicio";
  ruta.query = "";
});

describe("BarraInferior", () => {
  const cliente = navegacionPara("cliente", "x");
  const profesional = navegacionPara("profesional", "abc");

  it("muestra los 3 destinos del cliente en una navegación con nombre", () => {
    render(<BarraInferior destinos={cliente.celular} rol="cliente" />);
    const nav = screen.getByRole("navigation", { name: "Navegación" });
    const textos = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(textos).toEqual(["Inicio", "Mis trabajos", "Mi cuenta"]);
  });

  it("marca solo el ítem de la ruta actual con aria-current y en azul", () => {
    ruta.path = "/mis-trabajos";
    render(<BarraInferior destinos={cliente.celular} rol="cliente" />);
    const activo = screen.getByRole("link", { name: "Mis trabajos" });
    expect(activo).toHaveAttribute("aria-current", "page");
    expect(activo).toHaveClass("text-azul", "font-bold");
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current");
  });

  it("en el profesional el activo va en naranja de acción", () => {
    ruta.path = "/trabajos";
    render(<BarraInferior destinos={profesional.celular} rol="profesional" />);
    expect(screen.getByRole("link", { name: "Trabajos" })).toHaveClass("text-naranja-accion");
  });

  it("distingue Trabajos de Postulaciones por ?vista=mias", () => {
    ruta.path = "/trabajos";
    ruta.query = "vista=mias";
    render(<BarraInferior destinos={profesional.celular} rol="profesional" />);
    expect(screen.getByRole("link", { name: "Postulaciones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Trabajos" })).not.toHaveAttribute("aria-current");
  });

  it("es solo de celular y respeta el área segura", () => {
    render(<BarraInferior destinos={cliente.celular} rol="cliente" />);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("lg:hidden", "fixed", "bottom-0");
    expect(nav.className).toContain("env(safe-area-inset-bottom)");
    expect(screen.getAllByRole("link")[0]).toHaveClass("min-h-12");
  });
});

describe("BarraSuperior", () => {
  it("cliente: links, botón Publicar trabajo y menú de cuenta; solo en escritorio", () => {
    ruta.path = "/buscar";
    const { container } = render(
      <BarraSuperior
        navegacion={navegacionPara("cliente", "x")}
        rol="cliente"
        nombre="Laura Fernández"
      />,
    );
    expect(container.querySelector("header")).toHaveClass("hidden", "lg:flex", "h-[72px]");
    const principal = screen.getByRole("navigation", { name: "Principal" });
    const textos = within(principal)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(textos).toEqual(["Buscar profesionales", "Publicar un trabajo", "Mis trabajos"]);
    expect(screen.getByRole("link", { name: "Buscar profesionales" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Publicar trabajo" })).toHaveAttribute(
      "href",
      "/trabajos/nuevo",
    );
    expect(screen.getByRole("link", { name: "LabÍA, inicio" })).toHaveAttribute("href", "/inicio");
    expect(screen.getByRole("button", { name: "Cuenta de Laura Fernández" })).toBeInTheDocument();
  });

  it("profesional: botón Ver trabajos y Mi perfil con su id", () => {
    render(
      <BarraSuperior
        navegacion={navegacionPara("profesional", "abc")}
        rol="profesional"
        nombre="Martín Gómez"
      />,
    );
    expect(screen.getByRole("link", { name: "Ver trabajos" })).toHaveAttribute("href", "/trabajos");
    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute(
      "href",
      "/profesionales/abc",
    );
  });
});

describe("MenuAvatar", () => {
  const NOMBRE = "Cuenta de Laura Fernández";

  it("empieza cerrado y se abre con el botón", async () => {
    render(<MenuAvatar nombre="Laura Fernández" rol="cliente" />);
    const boton = screen.getByRole("button", { name: NOMBRE });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Mi cuenta" })).not.toBeInTheDocument();

    await userEvent.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Mi cuenta" })).toHaveAttribute("href", "/cuenta");
    expect(screen.getByRole("link", { name: "Salir" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
    const valores = screen.getAllByRole("radio").map((r) => r.getAttribute("value"));
    expect(valores).toEqual(["claro", "oscuro", "sistema"]);
  });

  it("Escape lo cierra y devuelve el foco al botón", async () => {
    render(<MenuAvatar nombre="Laura Fernández" rol="cliente" />);
    const boton = screen.getByRole("button", { name: NOMBRE });
    await userEvent.click(boton);
    await userEvent.keyboard("{Escape}");
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(boton).toHaveFocus();
  });

  it("un clic afuera lo cierra", async () => {
    render(
      <div>
        <p>afuera</p>
        <MenuAvatar nombre="Laura Fernández" rol="cliente" />
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: NOMBRE }));
    await userEvent.click(screen.getByText("afuera"));
    expect(screen.queryByRole("link", { name: "Mi cuenta" })).not.toBeInTheDocument();
  });

  it("elegir Mi cuenta lo cierra", async () => {
    render(<MenuAvatar nombre="Laura Fernández" rol="cliente" />);
    await userEvent.click(screen.getByRole("button", { name: NOMBRE }));
    await userEvent.click(screen.getByRole("link", { name: "Mi cuenta" }));
    expect(screen.queryByRole("link", { name: "Mi cuenta" })).not.toBeInTheDocument();
  });
});

describe("Esqueleto", () => {
  it("los bloques son decorativos y pulsan solo con movimiento permitido", () => {
    const { container } = render(<Bloque className="h-4" />);
    const bloque = container.firstElementChild;
    expect(bloque).toHaveAttribute("aria-hidden", "true");
    expect(bloque).toHaveClass("bg-divisor", "motion-safe:animate-pulse");
  });

  it("la página de carga avisa que está cargando", () => {
    render(<EsqueletoPagina />);
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });
});
