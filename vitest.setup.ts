import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom no trae matchMedia: por defecto, sistema en modo claro y sin animaciones reducidas.
// Un test puede pisarlo con vi.stubGlobal("matchMedia", …).
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (consulta: string) =>
    ({
      matches: false,
      media: consulta,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) satisfies MediaQueryList;
}

afterEach(() => {
  cleanup();
});
