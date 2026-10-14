-- LAB-25 · Contacto por WhatsApp: función `public.contactar_profesional(p_profesional, p_origen, p_trabajo)`.
--
-- El número del profesional nunca viaja en el HTML ni en el perfil: la función lo devuelve solo cuando
-- el cliente confirma "Abrir WhatsApp", y en el mismo paso deja la fila en `contactos` (eso habilita
-- la reseña después). `contactos` no tiene insert por la API (ver 20261011200000_politicas.sql), así que
-- la función es la única puerta de escritura.
--
-- Reglas (todas en la base, aunque la Server Action ya las valida):
--   · Solo una cuenta de cliente activa (`rol_actual() = 'cliente'` y `cuenta_activa()`).
--   · El profesional tiene que estar publicado y con la cuenta activa.
--   · Origen `perfil`: sin trabajo. Origen `postulacion`: el profesional tiene que estar `elegido` en un
--     trabajo del cliente.
--   · Límite: 20 contactos por cliente por día (día calendario de Buenos Aires). Un advisory lock por
--     cliente evita que dos pedidos simultáneos se cuelen por encima del límite.
--   · Devuelve solo el número en E.164 sin "+" (lo que pide `wa.me`).
--
-- Códigos de error (SQLSTATE) que la Server Action traduce a mensajes en castellano:
--   42501 sin permiso · P0002 profesional no disponible · 23514 entrada inválida · 53400 límite diario.

create function public.contactar_profesional(
  p_profesional uuid,
  p_origen text,
  p_trabajo uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_whatsapp text;
  v_hoy bigint;
begin
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'cliente' then
    raise exception 'Necesitás una cuenta de cliente activa para contactar' using errcode = 'insufficient_privilege';
  end if;

  if p_profesional is null or p_origen is null or p_origen not in ('perfil', 'postulacion') then
    raise exception 'Contacto inválido' using errcode = 'check_violation';
  end if;
  if p_origen = 'perfil' and p_trabajo is not null then
    raise exception 'Un contacto desde el perfil no lleva trabajo' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
    from public.perfiles_profesionales p
    join public.usuarios u on u.id = p.usuario_id
    where p.usuario_id = p_profesional
      and p.publicado
      and u.estado = 'activa'
      and u.rol = 'profesional'
  ) then
    raise exception 'Ese profesional no está disponible' using errcode = 'no_data_found';
  end if;

  if p_origen = 'postulacion' then
    if p_trabajo is null or not exists (
      select 1
      from public.postulaciones po
      join public.trabajos t on t.id = po.trabajo_id
      where po.trabajo_id = p_trabajo
        and po.profesional_id = p_profesional
        and po.estado = 'elegida'
        and t.cliente_id = v_uid
    ) then
      raise exception 'Ese profesional no fue elegido en este trabajo' using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Serializa los contactos de este cliente para que el límite diario no se pase con pedidos paralelos.
  perform pg_advisory_xact_lock(hashtextextended('contactar_profesional:' || v_uid::text, 0));

  select count(*) into v_hoy
  from public.contactos c
  where c.cliente_id = v_uid
    and c.created_at >= (
      date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires')
        at time zone 'America/Argentina/Buenos_Aires'
    );
  if v_hoy >= 20 then
    raise exception 'Llegaste al máximo de contactos por hoy. Probá mañana.' using errcode = 'configuration_limit_exceeded';
  end if;

  select u.whatsapp into v_whatsapp from public.usuarios u where u.id = p_profesional;
  if v_whatsapp is null then
    raise exception 'Ese profesional no tiene WhatsApp cargado' using errcode = 'no_data_found';
  end if;

  insert into public.contactos (cliente_id, profesional_id, origen, trabajo_id)
  values (v_uid, p_profesional, p_origen, case when p_origen = 'postulacion' then p_trabajo end);

  return substring(v_whatsapp from 2);
end;
$$;

comment on function public.contactar_profesional(uuid, text, uuid) is
  'LAB-25. Registra un contacto del cliente con el profesional y devuelve su WhatsApp (E.164 sin "+").';

revoke execute on function public.contactar_profesional(uuid, text, uuid) from public, anon;
grant execute on function public.contactar_profesional(uuid, text, uuid) to authenticated;
