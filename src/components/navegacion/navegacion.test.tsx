import { render, screen, waitFor, within } from "@testing-library/react";
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

// "Salir" es una Server Action que usa cookies y Supabase: en jsdom se reemplaza por una vacía.
vi.mock("@/lib/auth/acciones", () => ({ salir: async () => {} }));

beforeEach(() => {
  ruta.path = "/inicio";
  ruta.query = "";
});

describe("BarraInferior", () => {
  const cliente = navegacionPara("cliente", "x");
  const profesional = navegacionPara("profesional", "abc");

  it("muestra los 3 destinos del cliente en una navegación con nombre", () => {
    render(<BarraInferior destinos={cliente.celular} />);
    const nav = screen.getByRole("navigation", { name: "Navegación" });
    const textos = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(textos).toEqual(["Inicio", "Mis trabajos", "Mi cuenta"]);
  });

  it("marca solo el ítem de la ruta actual con aria-current y la pastilla de fondo", () => {
    ruta.path = "/mis-trabajos";
    render(<BarraInferior destinos={cliente.celular} />);
    const activo = screen.getByRole("link", { name: "Mis trabajos" });
    expect(activo).toHaveAttribute("aria-current", "page");
    expect(activo).toHaveClass("bg-fondo", "font-bold");
    const otro = screen.getByRole("link", { name: "Inicio" });
    expect(otro).not.toHaveAttribute("aria-current");
    expect(otro).not.toHaveClass("bg-fondo");
  });

  it("el profesional usa la misma pastilla que el cliente", () => {
    ruta.path = "/trabajos";
    render(<BarraInferior destinos={profesional.celular} />);
    expect(screen.getByRole("link", { name: "Trabajos" })).toHaveClass("bg-fondo", "font-bold");
  });

  it("distingue Trabajos de Postulaciones por ?vista=mias", () => {
    ruta.path = "/trabajos";
    ruta.query = "vista=mias";
    render(<BarraInferior destinos={profesional.celular} />);
    expect(screen.getByRole("link", { name: "Postulaciones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Trabajos" })).not.toHaveAttribute("aria-current");
  });

  it("es solo de celular y respeta el área segura", () => {
    render(<BarraInferior destinos={cliente.celular} />);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("lg:hidden", "fixed", "bottom-0", "bg-superficie");
    expect(nav.className).toContain("68px");
    expect(nav.className).toContain("env(safe-area-inset-bottom)");
    expect(screen.getAllByRole("link")[0]).toHaveClass("min-h-12");
  });
});

describe("BarraSuperior", () => {
  it("cliente: secciones, botón Publicar un trabajo y menú de cuenta; solo en escritorio", () => {
    ruta.path = "/buscar";
    const { container } = render(
      <BarraSuperior navegacion={navegacionPara("cliente", "x")} nombre="Laura Fernández" />,
    );
    expect(container.querySelector("header")).toHaveClass("hidden", "lg:block", "bg-superficie");
    const principal = screen.getByRole("navigation", { name: "Principal" });
    const textos = within(principal)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(textos).toEqual(["Buscar profesionales", "Mis trabajos"]);
    const actual = screen.getByRole("link", { name: "Buscar profesionales" });
    expect(actual).toHaveAttribute("aria-current", "page");
    expect(actual).toHaveClass("bg-fondo", "font-bold");
    expect(screen.getByRole("link", { name: "Publicar un trabajo" })).toHaveAttribute(
      "href",
      "/trabajos/nuevo",
    );
    expect(screen.getByRole("link", { name: "LabÍA, inicio" })).toHaveAttribute("href", "/inicio");
    expect(screen.getByRole("button", { name: "Cuenta de Laura Fernández" })).toBeInTheDocument();
  });

  it("profesional: botón Ver trabajos y Mi perfil con su id", () => {
    render(
      <BarraSuperior navegacion={navegacionPara("profesional", "abc")} nombre="Martín Gómez" />,
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

  it("empieza cerrado y se abre con el botón mostrando Mi cuenta, Tema y Salir", async () => {
    const user = userEvent.setup();
    render(<MenuAvatar nombre="Laura Fernández" />);
    const boton = screen.getByRole("button", { name: NOMBRE });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menuitem", { name: "Mi cuenta" })).not.toBeInTheDocument();

    await user.click(boton);
    expect(await screen.findByRole("menuitem", { name: "Mi cuenta" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Salir" })).toBeInTheDocument();
    const radios = screen.getAllByRole("menuitemradio").map((r) => r.textContent);
    expect(radios).toEqual(["Claro", "Oscuro", "Sistema"]);
  });

  it("Escape lo cierra y devuelve el foco al botón", async () => {
    const user = userEvent.setup();
    render(<MenuAvatar nombre="Laura Fernández" />);
    const boton = screen.getByRole("button", { name: NOMBRE });
    await user.click(boton);
    await screen.findByRole("menuitem", { name: "Mi cuenta" });

    await user.keyboard("{Escape}");
    await waitFor(() => expect(boton).toHaveAttribute("aria-expanded", "false"));
    expect(boton).toHaveFocus();
  });

  it("un clic afuera lo cierra", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <p>afuera</p>
        <MenuAvatar nombre="Laura Fernández" />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: NOMBRE }));
    await screen.findByRole("menuitem", { name: "Mi cuenta" });

    await user.click(screen.getByText("afuera"));
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: "Mi cuenta" })).not.toBeInTheDocument(),
    );
  });

  it("elegir Mi cuenta lo cierra", async () => {
    const user = userEvent.setup();
    render(<MenuAvatar nombre="Laura Fernández" />);
    await user.click(screen.getByRole("button", { name: NOMBRE }));
    await user.click(await screen.findByRole("menuitem", { name: "Mi cuenta" }));
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: "Mi cuenta" })).not.toBeInTheDocument(),
    );
  });

  it("elegir un tema marca aria-checked y lo anuncia", async () => {
    const user = userEvent.setup();
    render(<MenuAvatar nombre="Laura Fernández" />);
    await user.click(screen.getByRole("button", { name: NOMBRE }));
    const oscuro = await screen.findByRole("menuitemradio", { name: "Oscuro" });
    await user.click(oscuro);
    expect(oscuro).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Tema: Oscuro");
  });
});

describe("Esqueleto", () => {
  it("los bloques son decorativos y pulsan solo con movimiento permitido", () => {
    const { container } = render(<Bloque className="h-4" />);
    const bloque = container.firstElementChild;
    expect(bloque).toHaveAttribute("aria-hidden", "true");
    expect(bloque).toHaveClass("bg-fondo", "motion-safe:animate-pulse");
  });

  it("la página de carga avisa que está cargando", () => {
    render(<EsqueletoPagina />);
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });
});
