import { describe, expect, it } from "vitest";

import {
  esquemaCerrarTrabajo,
  esquemaMarcarEnRevision,
  esquemaOcultarResena,
  esquemaReactivarCuenta,
  esquemaReporte,
  esquemaResolverReporte,
  esquemaSuspenderCuenta,
  MAX_CARACTERES_DETALLE,
  MOTIVOS_REPORTE,
  TIPOS_OBJETIVO,
} from "./reportes";

const UUID_VALIDO = "11111111-1111-4111-8111-111111111111";

describe("esquemaReporte", () => {
  it("valida reporte con datos correctos", () => {
    for (const objetivoTipo of TIPOS_OBJETIVO) {
      for (const motivo of MOTIVOS_REPORTE) {
        const resultado = esquemaReporte.safeParse({
          objetivoTipo,
          objetivoId: UUID_VALIDO,
          motivo,
          detalle: "Explicación detallada del reporte",
        });
        expect(resultado.success).toBe(true);
      }
    }
  });

  it("permite detalle opcional y vacío", () => {
    const resSinDetalle = esquemaReporte.safeParse({
      objetivoTipo: "perfil",
      objetivoId: UUID_VALIDO,
      motivo: "datos_falsos",
    });
    expect(resSinDetalle.success).toBe(true);
    if (resSinDetalle.success) {
      expect(resSinDetalle.data.detalle).toBe("");
    }
  });

  it("rechaza detalle con más de 500 caracteres", () => {
    const res = esquemaReporte.safeParse({
      objetivoTipo: "perfil",
      objetivoId: UUID_VALIDO,
      motivo: "estafa",
      detalle: "a".repeat(MAX_CARACTERES_DETALLE + 1),
    });
    expect(res.success).toBe(false);
  });

  it("rechaza objetivoId no uuid", () => {
    const res = esquemaReporte.safeParse({
      objetivoTipo: "perfil",
      objetivoId: "no-es-uuid",
      motivo: "otro",
    });
    expect(res.success).toBe(false);
  });

  it("rechaza objetivoTipo inválido", () => {
    const res = esquemaReporte.safeParse({
      objetivoTipo: "invalido",
      objetivoId: UUID_VALIDO,
      motivo: "otro",
    });
    expect(res.success).toBe(false);
  });

  it("rechaza motivo inválido", () => {
    const res = esquemaReporte.safeParse({
      objetivoTipo: "perfil",
      objetivoId: UUID_VALIDO,
      motivo: "motivo_inexistente",
    });
    expect(res.success).toBe(false);
  });
});

describe("esquemaSuspenderCuenta", () => {
  it("valida motivo entre 3 y 500 caracteres", () => {
    const valido = esquemaSuspenderCuenta.safeParse({
      usuarioId: UUID_VALIDO,
      motivo: "Comportamiento abusivo reiterado",
    });
    expect(valido.success).toBe(true);
  });

  it("rechaza motivo menor a 3 caracteres o mayor a 500", () => {
    const corto = esquemaSuspenderCuenta.safeParse({
      usuarioId: UUID_VALIDO,
      motivo: "ab",
    });
    expect(corto.success).toBe(false);

    const largo = esquemaSuspenderCuenta.safeParse({
      usuarioId: UUID_VALIDO,
      motivo: "x".repeat(501),
    });
    expect(largo.success).toBe(false);
  });
});

describe("esquemaResolverReporte", () => {
  it("acepta 'accion_tomada' y 'desestimado'", () => {
    expect(
      esquemaResolverReporte.safeParse({
        reporteId: UUID_VALIDO,
        resolucion: "accion_tomada",
      }).success,
    ).toBe(true);

    expect(
      esquemaResolverReporte.safeParse({
        reporteId: UUID_VALIDO,
        resolucion: "desestimado",
      }).success,
    ).toBe(true);

    expect(
      esquemaResolverReporte.safeParse({
        reporteId: UUID_VALIDO,
        resolucion: "otra_cosa",
      }).success,
    ).toBe(false);
  });
});

describe("otros esquemas de moderación", () => {
  it("valida marcarEnRevision, ocultarResena, cerrarTrabajo y reactivarCuenta", () => {
    expect(esquemaMarcarEnRevision.safeParse({ reporteId: UUID_VALIDO }).success).toBe(true);
    expect(esquemaOcultarResena.safeParse({ resenaId: UUID_VALIDO }).success).toBe(true);
    expect(esquemaCerrarTrabajo.safeParse({ trabajoId: UUID_VALIDO }).success).toBe(true);
    expect(esquemaReactivarCuenta.safeParse({ usuarioId: UUID_VALIDO }).success).toBe(true);
  });
});
