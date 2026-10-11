import { describe, expect, it } from "vitest";

import { urlDelSitio } from "./sitio";

describe("urlDelSitio", () => {
  it("en un preview de Vercel usa la URL del despliegue aunque haya NEXT_PUBLIC_SITE_URL", () => {
    expect(
      urlDelSitio({
        siteUrl: "https://labia.com.ar",
        vercelEnv: "preview",
        vercelUrl: "labia-git-lab-14-emapesci06.vercel.app",
      }),
    ).toBe("https://labia-git-lab-14-emapesci06.vercel.app");
  });

  it("en producción usa NEXT_PUBLIC_SITE_URL sin barra final", () => {
    expect(
      urlDelSitio({
        siteUrl: "https://labia.com.ar/",
        vercelEnv: "production",
        vercelUrl: "labia-abc123.vercel.app",
      }),
    ).toBe("https://labia.com.ar");
  });

  it("sin NEXT_PUBLIC_SITE_URL cae en la URL de Vercel", () => {
    expect(urlDelSitio({ vercelEnv: "production", vercelUrl: "labia.vercel.app" })).toBe(
      "https://labia.vercel.app",
    );
  });

  it("sin ninguna variable usa localhost", () => {
    expect(urlDelSitio({})).toBe("http://localhost:3000");
  });

  it("respeta el protocolo si ya viene en la URL", () => {
    expect(urlDelSitio({ vercelEnv: "preview", vercelUrl: "http://localhost:4000" })).toBe(
      "http://localhost:4000",
    );
  });
});
