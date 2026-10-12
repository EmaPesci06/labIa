import { describe, expect, it } from "vitest";

import {
  erroresPorCampo,
  esquemaGoogle,
  esquemaIngreso,
  esquemaNuevaContrasena,
  esquemaRegistro,
} from "./auth";

const registroValido = {
  rol: "cliente",
  nombre: "Laura",
  email: "Laura@Correo.com ",
  contrasena: "unaclave123",
};

describe("esquemaRegistro", () => {
  it("acepta cliente y profesional y normaliza el email", () => {
    const cliente = esquemaRegistro.parse(registroValido);
    expect(cliente.email).toBe("laura@correo.com");
    expect(esquemaRegistro.parse({ ...registroValido, rol: "profesional" }).rol).toBe(
      "profesional",
    );
  });

  it("el rol nunca puede ser admin desde el registro", () => {
    for (const rol of ["admin", "ADMIN", "", "superadmin", undefined]) {
      expect(esquemaRegistro.safeParse({ ...registroValido, rol }).success).toBe(false);
    }
    expect(esquemaGoogle.safeParse({ rol: "admin" }).success).toBe(false);
  });

  it("pide una contraseña de al menos 8 caracteres", () => {
    const resultado = esquemaRegistro.safeParse({ ...registroValido, contrasena: "corta" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(erroresPorCampo(resultado.error).contrasena).toBe(
        "La contraseña tiene que tener al menos 8 caracteres.",
      );
    }
  });

  it("rechaza un email mal escrito, en castellano", () => {
    const resultado = esquemaRegistro.safeParse({ ...registroValido, email: "laura@" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(erroresPorCampo(resultado.error).email).toMatch(/email/i);
    }
  });
});

describe("esquemaIngreso", () => {
  it("pide email y contraseña", () => {
    const resultado = esquemaIngreso.safeParse({ email: "", contrasena: "" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const errores = erroresPorCampo(resultado.error);
      expect(errores.email).toBe("Ingresá tu email.");
      expect(errores.contrasena).toBe("Ingresá tu contraseña.");
    }
  });
});

describe("esquemaNuevaContrasena", () => {
  it("exige que las dos coincidan", () => {
    const resultado = esquemaNuevaContrasena.safeParse({
      contrasena: "unaclave123",
      repetir: "otraclave123",
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(erroresPorCampo(resultado.error).repetir).toBe("Las contraseñas no coinciden.");
    }
  });
});
