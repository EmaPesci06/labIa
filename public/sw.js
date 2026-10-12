/*
 * Service worker de LabÍA (LAB-13). A mano, sin dependencias.
 *
 * - Al instalar guarda la pantalla /sin-conexion con todo lo que necesita para verse (CSS y
 *   fuentes de /_next/static, que tienen el hash en el nombre y nunca cambian).
 * - /_next/static, /_next/image, /marca e íconos: primero caché, y si no están se piden y se guardan.
 * - Páginas (navegaciones): siempre a la red. Si falla, se muestra /sin-conexion.
 * - Todo lo demás (datos, acciones, Supabase, otros dominios) pasa de largo: nunca se cachea,
 *   así no queda ningún dato de una persona guardado en el dispositivo.
 *
 * Para invalidar todo, cambiá VERSION.
 */
const VERSION = "v1";
const CACHE = `labia-shell-${VERSION}`;
const PANTALLA_OFFLINE = "/sin-conexion";

const ESTATICO = /^\/(_next\/static\/|_next\/image|marca\/|icon-|apple-touch-icon|favicon)/;

/** URLs de /_next/static y /_next/image que cita un texto (HTML o CSS). */
function activosCitados(texto) {
  const urls = new Set();
  const patron = /\/_next\/(?:static\/[^"')\s\\]+|image\?[^"'\s\\]+)/g;
  for (const [coincidencia] of texto.matchAll(patron)) {
    urls.add(coincidencia.replaceAll("&amp;", "&"));
  }
  return [...urls];
}

async function guardarPantallaOffline() {
  const cache = await caches.open(CACHE);
  const respuesta = await fetch(PANTALLA_OFFLINE, { cache: "reload" });
  if (!respuesta.ok) throw new Error("No se pudo pedir " + PANTALLA_OFFLINE);
  const html = await respuesta.clone().text();
  await cache.put(PANTALLA_OFFLINE, respuesta);

  for (const url of activosCitados(html)) {
    const activo = await fetch(url);
    if (!activo.ok) continue;
    if (url.endsWith(".css")) {
      // Las fuentes de next/font se citan desde el CSS.
      const css = await activo.clone().text();
      for (const fuente of activosCitados(css)) {
        const respuestaFuente = await fetch(fuente);
        if (respuestaFuente.ok) await cache.put(fuente, respuestaFuente);
      }
    }
    await cache.put(url, activo);
  }
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(guardarPantallaOffline().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter((n) => n.startsWith("labia-shell-") && n !== CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido).catch(async () => {
        const guardada = await caches.match(PANTALLA_OFFLINE);
        return guardada || Response.error();
      }),
    );
    return;
  }

  if (ESTATICO.test(url.pathname)) {
    evento.respondWith(
      (async () => {
        const guardada = await caches.match(pedido);
        if (guardada) return guardada;
        const respuesta = await fetch(pedido);
        if (respuesta.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(pedido, respuesta.clone());
        }
        return respuesta;
      })(),
    );
  }
});
