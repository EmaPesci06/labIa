import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TarjetaTrabajo, textoPostulantes } from "./TarjetaTrabajo";

describe("textoPostulantes", () => {
  it("usa singular y plural del diseño nuevo", () => {
    expect(textoPostulantes(0)).toBe("Sin postulaciones todavía");
    expect(textoPostulantes(1)).toBe("1 postulación");
    expect(textoPostulantes(3)).toBe("3 postulaciones");
  });
});

describe("TarjetaTrabajo", () => {
  it("muestra etiqueta, título, urgencia y distancia", () => {
    render(
      <TarjetaTrabajo
        oficio="gas"
        barrio="La Perla"
        titulo="Olor a gas en la cocina"
        descripcion="Desde ayer"
        urgencia="lo_antes_posible"
        postulantes={2}
        distanciaKm={1.2}
      />,
    );
    expect(screen.getByText(/Gas · La Perla/)).toBeInTheDocument();
    expect(screen.getByText("Olor a gas en la cocina")).toBeInTheDocument();
    expect(screen.getByText("Para hoy")).toBeInTheDocument();
    expect(screen.getByText(/A 1,2 km · 2 postulaciones/)).toBeInTheDocument();
  });

  it("sin fecha dice recién y sin distancia no muestra la distancia", () => {
    render(
      <TarjetaTrabajo
        oficio="pintura"
        barrio="Centro"
        titulo="Pintar living"
        descripcion="Dos manos"
        urgencia="sin_apuro"
        postulantes={0}
      />,
    );
    expect(screen.getByText(/recién/)).toBeInTheDocument();
    expect(screen.queryByText(/ km/)).toBeNull();
  });

  it("muestra la insignia 'Te postulaste' si yaMePostule es true", () => {
    render(
      <TarjetaTrabajo
        oficio="plomeria"
        barrio="La Perla"
        titulo="Cambiar canilla"
        descripcion="Gotea"
        urgencia="esta_semana"
        postulantes={1}
        yaMePostule
      />,
    );
    expect(screen.getByText("Te postulaste")).toBeInTheDocument();
  });

  it("la pastilla 'Para hoy' va en azul noche con texto blanco, como el boceto", () => {
    render(
      <TarjetaTrabajo
        oficio="gas"
        barrio="Centro"
        titulo="Olor a gas"
        descripcion=""
        urgencia="lo_antes_posible"
        postulantes={0}
      />,
    );
    const pastilla = screen.getByText("Para hoy");
    expect(pastilla).toHaveClass("bg-sobre-sol", "text-sobre-encabezado");
    expect(pastilla).not.toHaveClass("bg-sol");
  });

  it("el título es h3 por defecto y h2 si la lista cuelga del h1", () => {
    const props = {
      oficio: "gas",
      barrio: "Centro",
      titulo: "Olor a gas",
      descripcion: "",
      urgencia: "sin_apuro",
      postulantes: 0,
    } as const;
    const { rerender } = render(<TarjetaTrabajo {...props} />);
    expect(screen.getByRole("heading", { level: 3, name: "Olor a gas" })).toBeInTheDocument();
    rerender(<TarjetaTrabajo {...props} nivelTitulo={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Olor a gas" })).toBeInTheDocument();
  });
});
