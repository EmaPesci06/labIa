-- LAB-31 · Endurecer reseñas (hallazgos de labia-seguridad sobre el PR #36).
-- Migración nueva: no edita las de main.
--
-- 1. [ALTO] El autor ya no borra su reseña: se revoca delete a authenticated y se dropea
--    resenas_borrar_propia. Así no se puede borrar y reinsertar fuera de la ventana de 24 h, ni
--    dejar huérfano un reporte de moderación. La política resenas_admin_borrar queda como está; sin
--    grant de delete no tiene efecto hasta que se decida la vía de moderación (LAB-32).
-- 2. [MEDIO] Moderación en la base: un trigger abre el reporte para 1-2 estrellas, así un insert o
--    update directo por PostgREST tampoco lo saltea. Se saca la lógica de la Server Action.
--    También filtra teléfonos y emails en el texto, en la base.
-- 3. [BAJO] resenas_crear: si viene trabajo_id, el profesional reseñado tiene que ser el elegido de
--    ese trabajo.

-- ---------------------------------------------------------------------------
-- 1. Sin borrado por la API
-- ---------------------------------------------------------------------------

drop policy if exists resenas_borrar_propia on public.resenas;
revoke delete on public.resenas from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Moderación y filtro de contacto en la base (funciones de trigger en privado)
-- ---------------------------------------------------------------------------

create function privado.resenas_validar_texto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.texto is not null and (
    new.texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
    or exists (
      select 1
      from regexp_matches(new.texto, '\+?[0-9][0-9 ().-]{6,}[0-9]', 'g') as t (m)
      where length(regexp_replace(t.m[1], '[^0-9]', '', 'g')) >= 8
    )
  ) then
    raise exception 'No incluyas números de teléfono ni correos electrónicos en el comentario.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger resenas_validar_texto
before insert or update of texto on public.resenas
for each row execute function privado.resenas_validar_texto();

create function privado.resenas_moderar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.puntaje <= 2 and not exists (
    select 1
    from public.reportes r
    where r.objetivo_tipo = 'resena' and r.objetivo_id = new.id
  ) then
    insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo, detalle, estado)
    values (
      new.autor_id,
      'resena',
      new.id,
      'otro',
      'Calificación baja (' || new.puntaje || ' estrella' || case when new.puntaje = 1 then '' else 's' end || ') registrada para revisión.',
      'abierto'
    );
  end if;
  return null;
end;
$$;

create trigger resenas_moderar
after insert or update of puntaje on public.resenas
for each row execute function privado.resenas_moderar();

revoke execute on function privado.resenas_validar_texto() from public, anon, authenticated;
revoke execute on function privado.resenas_moderar() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Si hay trabajo, el profesional reseñado es el elegido de ese trabajo
-- ---------------------------------------------------------------------------

create function privado.trabajo_mio_con_elegido(p_trabajo_id uuid, p_profesional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trabajos t
    where t.id = p_trabajo_id
      and t.cliente_id = (select auth.uid())
      and t.profesional_elegido_id = p_profesional_id
  )
$$;

revoke execute on function privado.trabajo_mio_con_elegido(uuid, uuid) from public, anon;
grant execute on function privado.trabajo_mio_con_elegido(uuid, uuid) to authenticated;

drop policy if exists resenas_crear on public.resenas;

create policy resenas_crear on public.resenas
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and privado.rol_actual() = 'cliente'
    and privado.cuenta_activa()
    and (privado.contacto_con(profesional_id) or privado.elegido_en_trabajo_mio(profesional_id))
    and (trabajo_id is null or privado.trabajo_mio_con_elegido(trabajo_id, profesional_id))
  );
