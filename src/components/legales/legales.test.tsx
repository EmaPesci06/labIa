import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsentimientoDatosSensibles } from "@/components/legales/ConsentimientoDatosSensibles";
import { DocumentoLegal } from "@/components/legales/DocumentoLegal";
import { VERSION_LEGALES } from "@/lib/legales";

const secciones = [
  { id: "a", titulo: "Primera", contenido: <p>Texto A</p> },
  { id: "b", titulo: "Segunda", contenido: <p>Texto B</p> },
];
const props = {
  titulo: "Prueba",
  introduccion: "Intro",
  secciones,
  otroDocumento: { href: "/otro", etiqueta: "Otro" },
};

afterEach(() => vi.unstubAllEnvs());

describe("DocumentoLegal", () => {
  it("muestra el aviso de borrador y un índice con anclas", () => {
    render(<DocumentoLegal {...props} />);
    expect(screen.getByText("Versión borrador.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Primera/ })).toHaveAttribute("href", "#a");
    expect(screen.getByRole("heading", { name: "2. Segunda" })).toBeInTheDocument();
    expect(screen.getByTestId("version-legal")).toHaveTextContent(
      `Versión ${VERSION_LEGALES} (borrador)`,
    );
  });

  it("oculta el aviso cuando los textos están revisados", () => {
    vi.stubEnv("NEXT_PUBLIC_LEGALES_REVISADOS", "true");
    render(<DocumentoLegal {...props} />);
    expect(screen.queryByText("Versión borrador.")).not.toBeInTheDocument();
    expect(screen.getByTestId("version-legal")).not.toHaveTextContent("borrador");
  });
});

describe("ConsentimientoDatosSensibles", () => {
  function Prueba({ error }: { error?: string }) {
    const [tildada, setTildada] = useState(false);
    return <ConsentimientoDatosSensibles tildada={tildada} onCambio={setTildada} error={error} />;
  }

  it("tiene el texto exacto, se tilda y manda la versión", async () => {
    const { container } = render(<Prueba />);
    const casilla = screen.getByRole("checkbox", {
      name: /Acepto que LabÍA trate mi DNI y mi certificado de antecedentes solo para verificar mi identidad, según la Política de privacidad\./,
    });
    expect(casilla).not.toBeChecked();
    await userEvent.click(casilla);
    expect(casilla).toBeChecked();
    expect(container.querySelector<HTMLInputElement>("input[name=version]")?.value).toBe(
      VERSION_LEGALES,
    );
  });

  it("asocia el error con la casilla", () => {
    render(<Prueba error="Tenés que aceptar" />);
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription("Tenés que aceptar");
  });
});
