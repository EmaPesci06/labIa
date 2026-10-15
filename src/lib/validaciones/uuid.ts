/** Identificador con forma de UUID (dígitos hexadecimales y guiones). Valida la forma, no la existencia. */
export function esUuid(valor: string): boolean {
  return /^[0-9a-f-]{36}$/.test(valor);
}
