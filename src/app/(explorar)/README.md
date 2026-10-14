# (explorar)

Pantallas que se ven **sin cuenta** (LAB-23): `/inicio`, `/buscar` y `/profesionales/[id]`.
Es la lista blanca de rutas públicas de la app: el grupo `(app)` sigue siendo privado por defecto
(su layout redirige a `/ingresar?volver=` sin sesión). Una ruta nueva solo es pública si se crea
acá **y** se agrega a `PREFIJOS_PUBLICOS_DE_APP` en `src/lib/auth/rutas.ts`.

- `layout.tsx` usa `ShellExplorar`: igual que `(app)` con sesión; sin sesión, `BarraVisitante`.
- Para contactar (LAB-25) hace falta cuenta de cliente: esa acción valida sesión en el servidor.
