import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FilasProfesional } from "./FilasProfesional";

describe("FilasProfesional", () => {
  it("enlaza el perfil profesional y la verificación", () => {
    render(
      <ul>
        <FilasProfesional />
      </ul>,
    );

    expect(screen.getByRole("link", { name: "Mi perfil público" })).toHaveAttribute(
      "href",
      "/cuenta/perfil",
    );
    expect(screen.getByRole("link", { name: "Mi verificación" })).toHaveAttribute(
      "href",
      "/cuenta/verificacion",
    );
  });
});
