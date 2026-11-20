import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toast } from "sonner";

import { AvisosFlotantes, avisarExito } from "./AvisosFlotantes";

afterEach(() => {
  toast.dismiss();
});

describe("AvisosFlotantes", () => {
  it("anuncia los avisos pasajeros con role=status", async () => {
    render(<AvisosFlotantes />);

    act(() => {
      avisarExito("¡Publicado! Te avisamos por email cuando alguien se postule.", {
        id: "prueba-publicado",
      });
    });

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("¡Publicado! Te avisamos por email cuando alguien se postule.");
  });
});
