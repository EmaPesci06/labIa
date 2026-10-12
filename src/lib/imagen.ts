// Compresión de fotos en el navegador antes de subirlas (Guía §4): máximo 1600 px de lado,
// calidad 0,8 y menos de 2 MB. Se hace con canvas, sin dependencias.

export const IMAGEN_LADO_MAXIMO = 1600;
export const IMAGEN_CALIDAD = 0.8;
export const IMAGEN_BYTES_MAXIMOS = 2 * 1024 * 1024;
/** Lado de la foto de perfil recortada en cuadrado. */
export const IMAGEN_LADO_AVATAR = 800;

export const TIPOS_IMAGEN_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"] as const;

/** Achica `ancho` × `alto` para que el lado mayor no pase de `maximo`, sin agrandar nunca. */
export function tamanoAjustado(
  ancho: number,
  alto: number,
  maximo: number,
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= maximo) return { ancho, alto };
  const factor = maximo / mayor;
  return {
    ancho: Math.max(1, Math.round(ancho * factor)),
    alto: Math.max(1, Math.round(alto * factor)),
  };
}

/** Cuadrado centrado dentro de `ancho` × `alto`: origen y lado del recorte. */
export function recorteCuadrado(
  ancho: number,
  alto: number,
): { x: number; y: number; lado: number } {
  const lado = Math.min(ancho, alto);
  return { x: Math.round((ancho - lado) / 2), y: Math.round((alto - lado) / 2), lado };
}

export function esImagenAceptada(archivo: Pick<File, "type">): boolean {
  return (TIPOS_IMAGEN_ACEPTADOS as readonly string[]).includes(archivo.type);
}

type Opciones = {
  /** Recorta al centro en cuadrado (foto de perfil). */
  cuadrada?: boolean;
};

function aBlob(lienzo: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolver) => lienzo.toBlob(resolver, "image/jpeg", calidad));
}

/**
 * Devuelve un JPEG de menos de 2 MB. Si con calidad 0,8 todavía pesa de más, baja la calidad y
 * después el tamaño hasta que entre. Lanza un `Error` con mensaje en castellano si no puede leer
 * la imagen.
 */
export async function comprimirImagen(archivo: File, { cuadrada = false }: Opciones = {}) {
  if (!esImagenAceptada(archivo)) {
    throw new Error("Subí una foto en formato JPG, PNG o WebP.");
  }
  let origen: ImageBitmap;
  try {
    origen = await createImageBitmap(archivo);
  } catch {
    throw new Error("No pudimos leer esa foto. Probá con otra.");
  }

  try {
    const recorte = cuadrada
      ? recorteCuadrado(origen.width, origen.height)
      : { x: 0, y: 0, lado: 0 };
    const anchoOrigen = cuadrada ? recorte.lado : origen.width;
    const altoOrigen = cuadrada ? recorte.lado : origen.height;
    let maximo = cuadrada ? IMAGEN_LADO_AVATAR : IMAGEN_LADO_MAXIMO;

    for (let intento = 0; intento < 6; intento += 1) {
      const { ancho, alto } = tamanoAjustado(anchoOrigen, altoOrigen, maximo);
      const lienzo = document.createElement("canvas");
      lienzo.width = ancho;
      lienzo.height = alto;
      const contexto = lienzo.getContext("2d");
      if (!contexto) throw new Error("No pudimos procesar la foto en este dispositivo.");
      // Fondo blanco: los PNG con transparencia no quedan negros al pasar a JPEG.
      contexto.fillStyle = "white";
      contexto.fillRect(0, 0, ancho, alto);
      contexto.drawImage(origen, recorte.x, recorte.y, anchoOrigen, altoOrigen, 0, 0, ancho, alto);

      const calidad = Math.max(0.5, IMAGEN_CALIDAD - intento * 0.1);
      const blob = await aBlob(lienzo, calidad);
      if (blob && blob.size <= IMAGEN_BYTES_MAXIMOS) return blob;
      maximo = Math.round(maximo * 0.8);
    }
    throw new Error("La foto es demasiado pesada. Probá con otra.");
  } finally {
    origen.close();
  }
}
