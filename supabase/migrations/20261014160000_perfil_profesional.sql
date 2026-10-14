-- LAB-24 · Perfil público del profesional: función `public.perfil_profesional(id)`.
--
-- `security definer` porque tiene que leer el apellido completo, que `usuarios_publicos` no expone
-- (solo la inicial). Por eso la función decide sola quién ve qué:
--   · Quién ve el perfil: cualquiera si está publicado y la cuenta está activa; si no, solo el dueño
--     y un admin. Para el resto no devuelve filas (la página responde 404).
--   · Apellido completo: solo el dueño o una cuenta activa de rol cliente o admin. Un anónimo o
--     un profesional ajeno recibe `apellido = null` y la inicial.
--   · Nunca devuelve whatsapp, email, matrícula, documentos ni el estado de la cuenta.
-- El barrio sale como `barrio_id` (la distancia es entre centros de barrio, nunca una dirección).

create function public.perfil_profesional(p_id uuid)
returns table (
  usuario_id uuid,
  nombre text,
  apellido text,
  apellido_inicial text,
  foto_path text,
  barrio_id smallint,
  oficios public.oficio[],
  especialidades text,
  descripcion text,
  anios_experiencia smallint,
  toda_la_ciudad boolean,
  zonas_texto text,
  disponibilidad text,
  fotos_trabajos text[],
  identidad_verificada boolean,
  antecedentes_ok boolean,
  matriculado boolean,
  publicado boolean,
  promedio numeric,
  cantidad_resenas integer,
  es_propio boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.usuario_id,
    u.nombre,
    case
      when p.usuario_id = (select auth.uid()) then u.apellido
      when privado.cuenta_activa() and privado.rol_actual() in ('cliente', 'admin') then u.apellido
    end as apellido,
    left(u.apellido, 1) as apellido_inicial,
    u.foto_path,
    u.barrio_id,
    p.oficios,
    p.especialidades,
    p.descripcion,
    p.anios_experiencia,
    p.toda_la_ciudad,
    case
      when p.toda_la_ciudad then 'Toda la ciudad'
      else (
        select string_agg(b.nombre, ', ' order by z.orden)
        from unnest(p.zonas) with ordinality as z (id, orden)
        join public.barrios b on b.id = z.id
      )
    end as zonas_texto,
    p.disponibilidad,
    p.fotos_trabajos,
    p.identidad_verificada,
    p.antecedentes_ok,
    p.matriculado,
    p.publicado,
    p.promedio,
    p.cantidad_resenas,
    coalesce(p.usuario_id = (select auth.uid()), false) as es_propio
  from public.perfiles_profesionales p
  join public.usuarios u on u.id = p.usuario_id
  where p.usuario_id = p_id
    and (
      (p.publicado and u.estado = 'activa')
      or p.usuario_id = (select auth.uid())
      or privado.es_admin()
    )
$$;

comment on function public.perfil_profesional(uuid) is
  'LAB-24. Perfil público de un profesional. Apellido completo solo para dueño, clientes y admins; nunca whatsapp ni email.';

revoke execute on function public.perfil_profesional(uuid) from public;
grant execute on function public.perfil_profesional(uuid) to anon, authenticated;
