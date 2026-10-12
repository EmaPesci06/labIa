// Teléfonos argentinos (guía §4): se guardan en E.164 móvil, "+549" + código de área + número
// (10 dígitos entre área y número). Mar del Plata es la característica 223.

const CARACTERISTICA_MDP = "223";
const CARACTERES_PERMITIDOS = /^[\d\s()+.-]+$/;
const E164_ARGENTINO = /^\+549[1-3]\d{9}$/;

/** Saca el "15" que va entre el código de área y el número en el formato local de celulares. */
function quitarQuince(digitos: string): string | null {
  // El único código de área de 2 dígitos es 11 (AMBA); el resto tiene 3 o 4.
  const largos = digitos.startsWith("11") ? [2] : [3, 4];
  for (const largo of largos) {
    if (digitos.slice(largo, largo + 2) === "15") {
      return digitos.slice(0, largo) + digitos.slice(largo + 2);
    }
  }
  return null;
}

/**
 * Normaliza lo que escribe la persona a E.164 argentino de celular.
 * "223 555-1234" y "0223 15 555 1234" → "+5492235551234". Devuelve `null` si no es válido.
 * Sin código de área (7 dígitos, o "15" + 7 dígitos) asume Mar del Plata.
 */
export function normalizarTelefono(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio || !CARACTERES_PERMITIDOS.test(limpio)) return null;
  if (limpio.indexOf("+") > 0 || limpio.split("+").length > 2) return null;

  let digitos = limpio.replace(/\D/g, "");
  const internacional = limpio.startsWith("+");

  if (internacional && !digitos.startsWith("54")) return null;
  if (digitos.startsWith("54") && (internacional || digitos.length >= 12)) {
    digitos = digitos.slice(2);
    if (digitos.startsWith("9")) digitos = digitos.slice(1);
  }
  if (digitos.startsWith("0")) digitos = digitos.slice(1);

  if (digitos.length === 7) {
    digitos = CARACTERISTICA_MDP + digitos;
  } else if (digitos.length === 9 && digitos.startsWith("15")) {
    digitos = CARACTERISTICA_MDP + digitos.slice(2);
  } else if (digitos.length === 12) {
    const sinQuince = quitarQuince(digitos);
    if (!sinQuince) return null;
    digitos = sinQuince;
  }

  const e164 = `+549${digitos}`;
  return E164_ARGENTINO.test(e164) ? e164 : null;
}

/** Link de WhatsApp: "https://wa.me/5492235551234?text=Hola%20..." (sin el "+"). */
export function linkWhatsApp(telefonoE164: string, mensaje: string): string {
  if (!/^\+\d{8,15}$/.test(telefonoE164)) {
    throw new RangeError(`Teléfono no está en E.164: ${telefonoE164}`);
  }
  const numero = telefonoE164.slice(1);
  const texto = mensaje.trim();
  return texto
    ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/${numero}`;
}
