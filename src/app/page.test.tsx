import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Inicio from "./page";

describe("página de inicio provisoria", () => {
  it("muestra el nombre LabÍA como título", () => {
    render(<Inicio />);
    expect(screen.getByRole("heading", { level: 1, name: "LabÍA" })).toBeInTheDocument();
  });
});
