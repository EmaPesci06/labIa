import { describe, expect, it } from "vitest";

import { cronAutorizado } from "./cron";

describe("cronAutorizado", () => {
  it("acepta el Bearer correcto", () => {
    expect(cronAutorizado("Bearer abc", "abc")).toBe(true);
  });
  it("rechaza uno distinto, vacío o ausente", () => {
    expect(cronAutorizado("Bearer xyz", "abc")).toBe(false);
    expect(cronAutorizado("abc", "abc")).toBe(false);
    expect(cronAutorizado(null, "abc")).toBe(false);
  });
  it("sin CRON_SECRET configurado queda cerrado", () => {
    expect(cronAutorizado("Bearer ", "")).toBe(false);
    expect(cronAutorizado("Bearer undefined", undefined)).toBe(false);
  });
});
