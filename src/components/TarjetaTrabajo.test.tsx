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
});
