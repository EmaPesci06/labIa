/**
 * Genera N profesionales falsos (por defecto 2.000) para medir `public.buscar_profesionales`.
 * Solo para la base LOCAL: nunca lo corras contra un proyecto remoto.
 *
 * Imprime SQL por la salida estándar; no se conecta a nada. Uso (Node 24 ejecuta TypeScript directo):
 *
 *   # cargar 2.000 perfiles
 *   node scripts/generar-perfiles.ts | docker exec -i supabase_db_labia psql -U postgres -v ON_ERROR_STOP=1
 *   # cargar y medir (EXPLAIN ANALYZE de 3 búsquedas típicas)
 *   node scripts/generar-perfiles.ts --medir | docker exec -i supabase_db_labia psql -U postgres
 *   # borrar lo cargado
 *   node scripts/generar-perfiles.ts --limpiar | docker exec -i supabase_db_labia psql -U postgres
 *
 * Opciones: `--cantidad=500` cambia la cantidad; `--solo-medir` mide sin volver a cargar.
 *
 * Los usuarios son `carga-<n>@labia.test` con ids `dddddddd-0000-4000-a000-<n>`; al borrar el usuario
 * de `auth.users` se borran en cascada su fila de `usuarios` y su perfil. Los datos salen de
 * `random()` (no de una semilla), así que cada carga es distinta. Reparto: ~90 % publicados,
 * ~25 % en toda la ciudad, 1 o 2 oficios, 1 a 5 zonas, gasistas matriculados el 80 % de las veces.
 *
 * Guardia (LAB-41): el script aborta si `NEXT_PUBLIC_SUPABASE_URL` no apunta a localhost. Antes de
 * correrlo, exportá la URL local: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`.
 */

const PREFIJO_ID = "dddddddd-0000-4000-a000-";

const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(urlSupabase)) {
  throw new Error(
    "generar-perfiles solo corre contra la base local. Definí NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321.",
  );
}

const args = process.argv.slice(2);
const cantidadArg = args.find((a) => a.startsWith("--cantidad="));
const cantidad = cantidadArg ? Number(cantidadArg.split("=")[1]) : 2000;
if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100000) {
  throw new Error("--cantidad tiene que ser un entero entre 1 y 100000.");
}

const limpiar = `delete from auth.users where id::text like '${PREFIJO_ID}%';`;

const cargar = `
do $$
declare
  barrios smallint[] := array(select id from public.barrios order by id);
  oficios public.oficio[] := enum_range(null::public.oficio);
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
  select
    '00000000-0000-0000-0000-000000000000',
    ('${PREFIJO_ID}' || lpad(n::text, 12, '0'))::uuid,
    'authenticated',
    'authenticated',
    'carga-' || n || '@labia.test',
    jsonb_build_object('rol', 'profesional', 'nombre', 'Pro' || n, 'apellido', 'Prueba' || n)
  from generate_series(1, ${cantidad}) as n;

  update public.usuarios
  set barrio_id = barrios[1 + floor(random() * cardinality(barrios))::int]
  where id::text like '${PREFIJO_ID}%';

  insert into public.perfiles_profesionales
    (usuario_id, oficios, toda_la_ciudad, zonas, anios_experiencia,
     identidad_verificada, antecedentes_ok, matriculado, promedio, cantidad_resenas)
  select
    x.id,
    x.of,
    x.toda,
    case when x.toda then '{}'::smallint[] else x.zs end,
    floor(random() * 30)::smallint,
    x.ok,
    x.ok,
    'gas' = any (x.of) and random() < 0.8,
    case when x.cant > 0 then round((1 + random() * 4)::numeric, 1) end,
    x.cant
  from (
    select
      u.id,
      array(select distinct oficios[1 + floor(random() * 7)::int]
            from generate_series(1, 1 + floor(random() * 2)::int) where u.id is not null) as of,
      random() < 0.25 as toda,
      array(select distinct barrios[1 + floor(random() * cardinality(barrios))::int]
            from generate_series(1, 1 + floor(random() * 5)::int) where u.id is not null) as zs,
      random() < 0.9 as ok,
      case when random() < 0.3 then 0 else floor(random() * 40)::int end as cant
    from public.usuarios u
    where u.id::text like '${PREFIJO_ID}%'
  ) x;
end;
$$;

analyze public.usuarios;
analyze public.perfiles_profesionales;
`;

// Tres búsquedas típicas: oficio + barrio céntrico, sin oficio con orden por calificación,
// y solo matriculados en un barrio periférico.
const medir = `
\\echo '--- plomería desde Centro, por cercanía ---'
explain (analyze, buffers)
select * from public.buscar_profesionales('plomeria', (select id from public.barrios where slug = 'centro'));

\\echo '--- todos los oficios desde La Perla, por calificación ---'
explain (analyze, buffers)
select * from public.buscar_profesionales(null, (select id from public.barrios where slug = 'la-perla'), false, 'calificacion');

\\echo '--- gas, solo matriculados, desde Sierra de los Padres ---'
explain (analyze, buffers)
select * from public.buscar_profesionales('gas', (select id from public.barrios where slug = 'sierra-de-los-padres'), true);
`;

// La función es security invoker: para medir lo que ve el público se mide como `anon`.
const medirComoAnon = `
begin;
set local role anon;
${medir}
rollback;
`;

const partes: string[] = ["\\set ON_ERROR_STOP on", "begin;"];
if (args.includes("--limpiar")) {
  partes.push(limpiar);
} else if (args.includes("--solo-medir")) {
  partes.length = 0;
  partes.push(medirComoAnon);
} else {
  partes.push(limpiar, cargar);
}
if (!args.includes("--solo-medir")) {
  partes.push("commit;");
  if (args.includes("--medir")) partes.push(medirComoAnon);
}

process.stdout.write(partes.join("\n") + "\n");
