// Formatos de la guía §4: pesos enteros, distancias con una decimal y coma, fechas relativas.

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const unDecimal = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 12500 → "$ 12.500" (el espacio es de no separación, como lo devuelve Intl). */
export function formatearPesos(n: number): string {
  if (!Number.isFinite(n)) {
    throw new RangeError(`Monto inválido: ${n}`);
  }
  return pesos.format(n);
}

/** 1.234 → "a 1,2 km"; 0.8 → "a 0,8 km". */
export function formatearDistancia(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    throw new RangeError(`Distancia inválida: ${km}`);
  }
  return `a ${unDecimal.format(km)} km`;
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

function plural(n: number, singular: string, pluralForma: string): string {
  return `hace ${n} ${n === 1 ? singular : pluralForma}`;
}

/**
 * Fecha relativa para listas: "recién", "hace 20 min", "hace 3 h", "hace 2 días",
 * "hace 1 mes", "hace 2 años". Las fechas futuras se muestran como "recién".
 */
export function haceCuanto(fecha: Date | string | number, ahora: Date = new Date()): string {
  const momento = fecha instanceof Date ? fecha : new Date(fecha);
  const tiempo = momento.getTime();
  if (Number.isNaN(tiempo)) {
    throw new RangeError(`Fecha inválida: ${String(fecha)}`);
  }

  const diferencia = ahora.getTime() - tiempo;
  if (diferencia < MINUTO) return "recién";
  if (diferencia < HORA) return `hace ${Math.floor(diferencia / MINUTO)} min`;
  if (diferencia < DIA) return `hace ${Math.floor(diferencia / HORA)} h`;

  const dias = Math.floor(diferencia / DIA);
  if (dias < 30) return plural(dias, "día", "días");
  if (dias < 365) return plural(Math.floor(dias / 30), "mes", "meses");
  return plural(Math.floor(dias / 365), "año", "años");
}
