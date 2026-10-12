import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enviarMock = vi.fn();
const capturarMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: enviarMock };
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: capturarMock }));

const { enviarEmail } = await import("./enviar");

const USUARIO = "550e8400-e29b-41d4-a716-446655440000";
const envio = {
  para: "laura@correo.com",
  usuarioId: USUARIO,
  plantilla: "bienvenida_cliente",
  datos: { nombre: "Laura", urlBuscar: "https://labia.example/buscar" },
} as const;

describe("enviarEmail", () => {
  beforeEach(() => {
    enviarMock.mockReset();
    capturarMock.mockReset();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAILS_SECRET", "secreto");
    vi.stubEnv("EMAIL_REMITENTE", "LabÍA <hola@labia.example>");
    vi.stubEnv("EMAIL_SOPORTE", "soporte@labia.example");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sin RESEND_API_KEY no hace nada y no falla", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(enviarEmail(envio)).resolves.toEqual({ estado: "omitido" });
    expect(enviarMock).not.toHaveBeenCalled();
  });

  it("manda HTML y texto con remitente, reply_to y baja de un clic", async () => {
    enviarMock.mockResolvedValue({ data: { id: "1" }, error: null });
    await expect(enviarEmail(envio)).resolves.toEqual({ estado: "enviado" });

    expect(enviarMock).toHaveBeenCalledTimes(1);
    const mensaje = enviarMock.mock.calls[0]?.[0];
    expect(mensaje).toMatchObject({
      from: "LabÍA <hola@labia.example>",
      to: "laura@correo.com",
      subject: "Te damos la bienvenida a LabÍA",
      replyTo: "soporte@labia.example",
    });
    expect(mensaje.html).toContain("Laura");
    expect(mensaje.text).toContain("Laura");
    expect(mensaje.headers["List-Unsubscribe"]).toMatch(/\/api\/baja\?t=/);
    expect(mensaje.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("reintenta una vez y se recupera", async () => {
    enviarMock
      .mockResolvedValueOnce({ data: null, error: { name: "application_error" } })
      .mockResolvedValueOnce({ data: { id: "1" }, error: null });
    await expect(enviarEmail(envio)).resolves.toEqual({ estado: "enviado" });
    expect(enviarMock).toHaveBeenCalledTimes(2);
    expect(capturarMock).not.toHaveBeenCalled();
  });

  it("si falla dos veces no lanza y avisa a Sentry sin el destinatario", async () => {
    enviarMock.mockRejectedValue(new Error("red caída para laura@correo.com"));
    await expect(enviarEmail(envio)).resolves.toEqual({ estado: "fallido" });
    expect(enviarMock).toHaveBeenCalledTimes(2);
    expect(capturarMock).toHaveBeenCalledTimes(1);
    expect(String(capturarMock.mock.calls[0]?.[0])).not.toContain("laura@correo.com");
  });

  it("sin usuarioId no pone link de baja firmado", async () => {
    enviarMock.mockResolvedValue({ data: { id: "1" }, error: null });
    await enviarEmail({ ...envio, usuarioId: undefined });
    expect(enviarMock.mock.calls[0]?.[0].headers).toBeUndefined();
  });
});
