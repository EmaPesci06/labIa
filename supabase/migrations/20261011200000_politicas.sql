-- LAB-12 · Políticas RLS, permisos mínimos, vistas y funciones helper (Guía §7).
--
-- Principios:
--   1. Supabase da ALL a anon y authenticated sobre las tablas nuevas: acá se hace `revoke all` y
--      después `grant` mínimo, por columna donde hace falta. Las columnas sensibles (rol, whatsapp,
--      normas_*, insignias, promedio, prioridad, publicado) nunca se conceden para escribir.
--   2. Las funciones helper viven en el esquema `privado`, que la API (PostgREST) no expone.
--   3. Todo lo que cruza tablas dentro de una política pasa por una función `security definer`
--      para evitar recursión entre políticas.

-- ---------------------------------------------------------------------------
-- Esquema privado (no expuesto por la API) y `recalcular_resenas_de` adentro
-- ---------------------------------------------------------------------------

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated, service_role;

-- Era una función interna que aparecía como RPC en los tipos aunque tenía el execute revocado.
alter function public.recalcular_resenas_de(uuid) set schema privado;

create or replace function public.resenas_recalcular()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform privado.recalcular_resenas_de(old.profesional_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform privado.recalcular_resenas_de(new.profesional_id);
  end if;
  return null;
end;
$$;

revoke execute on function privado.recalcular_resenas_de(uuid) from public, anon, authenticated;
revoke execute on function public.resenas_recalcular() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funciones helper (security definer + stable + search_path vacío)
-- ---------------------------------------------------------------------------

create function privado.rol_actual()
returns public.rol
language sql
stable
security definer
set search_path = ''
as $$
  select u.rol from public.usuarios u where u.id = (select auth.uid())
$$;

create function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.rol = 'admin' from public.usuarios u where u.id = (select auth.uid())), false)
$$;

create function privado.cuenta_activa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.estado = 'activa' from public.usuarios u where u.id = (select auth.uid())), false)
$$;

create function privado.usuario_activo(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.usuarios u where u.id = p_id and u.estado = 'activa')
$$;

create function privado.perfil_publicado(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles_profesionales p where p.usuario_id = p_id and p.publicado
  )
$$;

create function privado.trabajo_es_mio(p_trabajo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trabajos t
    where t.id = p_trabajo_id and t.cliente_id = (select auth.uid())
  )
$$;

-- Igual que la anterior pero recibe texto: sirve para rutas de Storage sin castear a uuid.
create function privado.trabajo_es_mio_txt(p_trabajo_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trabajos t
    where t.id::text = p_trabajo_id and t.cliente_id = (select auth.uid())
  )
$$;

create function privado.trabajo_abierto(p_trabajo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.trabajos t where t.id = p_trabajo_id and t.estado = 'abierto')
$$;

create function privado.trabajo_tiene_postulaciones(p_trabajo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.postulaciones po where po.trabajo_id = p_trabajo_id)
$$;

create function privado.postulacion_elegida(p_trabajo_id uuid, p_profesional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.postulaciones po
    where po.trabajo_id = p_trabajo_id
      and po.profesional_id = p_profesional_id
      and po.estado = 'elegida'
  )
$$;

-- ¿El usuario actual tiene un contacto registrado con ese profesional?
create function privado.contacto_con(p_profesional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contactos c
    where c.cliente_id = (select auth.uid()) and c.profesional_id = p_profesional_id
  )
$$;

-- ¿Ese profesional fue elegido (postulación `elegida`) en algún trabajo del usuario actual?
create function privado.elegido_en_trabajo_mio(p_profesional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.postulaciones po
    join public.trabajos t on t.id = po.trabajo_id
    where po.profesional_id = p_profesional_id
      and po.estado = 'elegida'
      and t.cliente_id = (select auth.uid())
  )
$$;

-- Ruta permitida en el bucket `fotos` para el usuario actual:
--   perfiles/<uid>/…  ·  trabajos-hechos/<uid>/…  ·  trabajos/<trabajo_id propio>/…
create function privado.ruta_foto_permitida(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case (storage.foldername(p_nombre))[1]
      when 'perfiles' then (storage.foldername(p_nombre))[2] = (select auth.uid())::text
      when 'trabajos-hechos' then (storage.foldername(p_nombre))[2] = (select auth.uid())::text
      when 'trabajos' then privado.trabajo_es_mio_txt((storage.foldername(p_nombre))[2])
      else false
    end,
    false
  )
$$;

-- Los helpers solo existen para las políticas: se pueden ejecutar, pero la API no los expone.
revoke execute on all functions in schema privado from public;
revoke execute on function privado.recalcular_resenas_de(uuid) from anon, authenticated;
grant execute on function
  privado.rol_actual(),
  privado.es_admin(),
  privado.cuenta_activa(),
  privado.usuario_activo(uuid),
  privado.perfil_publicado(uuid),
  privado.trabajo_es_mio(uuid),
  privado.trabajo_es_mio_txt(text),
  privado.trabajo_abierto(uuid),
  privado.trabajo_tiene_postulaciones(uuid),
  privado.postulacion_elegida(uuid, uuid),
  privado.contacto_con(uuid),
  privado.elegido_en_trabajo_mio(uuid),
  privado.ruta_foto_permitida(text)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers de columnas protegidas (segunda capa, además de los permisos por columna).
-- Corren con los privilegios de quien llama: solo frenan a anon/authenticated; las funciones
-- `security definer`, la service role y las migraciones pasan.
-- ---------------------------------------------------------------------------

create function privado.usuarios_proteger_columnas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
       or new.rol is distinct from old.rol
       or new.whatsapp is distinct from old.whatsapp
       or new.normas_version is distinct from old.normas_version
       or new.normas_aceptadas_at is distinct from old.normas_aceptadas_at then
      raise exception 'No podés modificar esas columnas directamente'
        using errcode = 'insufficient_privilege';
    end if;
    if new.estado is distinct from old.estado and not privado.es_admin() then
      raise exception 'Solo un admin puede cambiar el estado de una cuenta'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger usuarios_proteger_columnas
before update on public.usuarios
for each row execute function privado.usuarios_proteger_columnas();

create function privado.perfiles_proteger_insignias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.usuario_id is distinct from old.usuario_id
       or new.promedio is distinct from old.promedio
       or new.cantidad_resenas is distinct from old.cantidad_resenas
       or new.prioridad is distinct from old.prioridad then
      raise exception 'Esas columnas las calcula el sistema'
        using errcode = 'insufficient_privilege';
    end if;
    if (new.identidad_verificada is distinct from old.identidad_verificada
        or new.antecedentes_ok is distinct from old.antecedentes_ok
        or new.matriculado is distinct from old.matriculado)
       and not privado.es_admin() then
      raise exception 'Solo un admin puede cambiar las insignias de verificación'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger perfiles_proteger_insignias
before update on public.perfiles_profesionales
for each row execute function privado.perfiles_proteger_insignias();

revoke execute on function privado.usuarios_proteger_columnas() from public, anon, authenticated;
revoke execute on function privado.perfiles_proteger_insignias() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Acciones controladas sobre columnas que el dueño no puede editar a mano
-- ---------------------------------------------------------------------------

-- WhatsApp: no se actualiza con un UPDATE directo, se pasa por acá (valida sesión y cuenta activa;
-- el formato E.164 lo valida el check de la columna).
create function public.actualizar_whatsapp(p_whatsapp text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not privado.cuenta_activa() then
    raise exception 'Necesitás una cuenta activa' using errcode = 'insufficient_privilege';
  end if;
  if p_whatsapp is null then
    raise exception 'El WhatsApp es obligatorio' using errcode = 'check_violation';
  end if;
  update public.usuarios set whatsapp = p_whatsapp where id = (select auth.uid());
end;
$$;

-- Normas de seguridad: la versión aceptada y la fecha solo se escriben por acá.
create function public.aceptar_normas(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not privado.cuenta_activa() then
    raise exception 'Necesitás una cuenta activa' using errcode = 'insufficient_privilege';
  end if;
  if p_version is null or char_length(btrim(p_version)) not between 1 and 20 then
    raise exception 'Versión de normas inválida' using errcode = 'check_violation';
  end if;
  update public.usuarios
  set normas_version = btrim(p_version), normas_aceptadas_at = now()
  where id = (select auth.uid());
end;
$$;

revoke execute on function public.actualizar_whatsapp(text) from public, anon;
revoke execute on function public.aceptar_normas(text) from public, anon;
grant execute on function public.actualizar_whatsapp(text) to authenticated;
grant execute on function public.aceptar_normas(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------------

-- Datos públicos de una persona: nombre, inicial del apellido, barrio y foto. Nunca whatsapp.
-- Solo salen cuentas activas con una razón para ser visibles: la propia, profesionales
-- publicados, autores de reseñas, el cliente de un trabajo abierto (para profesionales) o de uno
-- asignado a mí, y quienes se postularon a un trabajo mío.
-- Vista con los privilegios del dueño (no `security_invoker`): es la forma de leer columnas de
-- `usuarios` sin dar acceso a la tabla; el `where` acota las filas.
create view public.usuarios_publicos as
select
  u.id,
  u.nombre,
  left(u.apellido, 1) as apellido_inicial,
  u.barrio_id,
  u.foto_path
from public.usuarios u
where u.estado = 'activa'
  and (
    u.id = (select auth.uid())
    or privado.perfil_publicado(u.id)
    or exists (select 1 from public.resenas r where r.autor_id = u.id)
    or exists (
      select 1 from public.trabajos t
      where t.cliente_id = u.id
        and (
          (t.estado = 'abierto' and privado.rol_actual() = 'profesional')
          or t.profesional_elegido_id = (select auth.uid())
        )
    )
    or exists (
      select 1
      from public.postulaciones po
      join public.trabajos t on t.id = po.trabajo_id
      where po.profesional_id = u.id and t.cliente_id = (select auth.uid())
    )
  );

-- Verificaciones del usuario actual SIN `storage_path`: el dueño ve el estado, no el archivo.
create view public.mis_verificaciones as
select v.id, v.tipo, v.estado, v.motivo_rechazo, v.created_at
from public.verificaciones v
where v.usuario_id = (select auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos de tablas y vistas: revoke all + grant mínimo
-- ---------------------------------------------------------------------------

revoke all on table
  public.barrios, public.usuarios, public.perfiles_profesionales, public.verificaciones,
  public.trabajos, public.postulaciones, public.contactos, public.resenas, public.reportes,
  public.usuarios_publicos, public.mis_verificaciones
from anon, authenticated;

-- barrios: lectura pública, nadie escribe.
grant select on public.barrios to anon, authenticated;

-- usuarios: lectura (las filas las acota RLS: la propia o admin), edición solo de datos de perfil
-- y `estado` (que el trigger deja cambiar solo a un admin). rol, whatsapp y normas_* no se tocan.
grant select on public.usuarios to authenticated;
grant update (nombre, apellido, barrio_id, foto_path, estado) on public.usuarios to authenticated;
grant delete on public.usuarios to authenticated;
grant select on public.usuarios_publicos to anon, authenticated;

-- perfiles_profesionales: sin permiso de escritura sobre publicado, promedio, cantidad_resenas ni
-- prioridad. Las insignias se conceden para que las edite un admin (el trigger lo exige).
grant select on public.perfiles_profesionales to anon, authenticated;
grant insert (
  usuario_id, oficios, especialidades, descripcion, anios_experiencia, toda_la_ciudad, zonas,
  disponibilidad, fotos_trabajos, matricula_numero
) on public.perfiles_profesionales to authenticated;
grant update (
  oficios, especialidades, descripcion, anios_experiencia, toda_la_ciudad, zonas,
  disponibilidad, fotos_trabajos, matricula_numero,
  identidad_verificada, antecedentes_ok, matriculado
) on public.perfiles_profesionales to authenticated;
grant delete on public.perfiles_profesionales to authenticated;

-- verificaciones: el dueño solo inserta (no lee: usa la vista mis_verificaciones); admin lee y revisa.
grant select on public.verificaciones to authenticated;
grant insert (usuario_id, tipo, storage_path) on public.verificaciones to authenticated;
grant update (estado, motivo_rechazo, revisado_por, revisado_at) on public.verificaciones to authenticated;
grant select on public.mis_verificaciones to authenticated;

-- trabajos
grant select on public.trabajos to authenticated;
grant insert (cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, presupuesto_estimado, fotos)
  on public.trabajos to authenticated;
grant update (
  oficio, titulo, descripcion, barrio_id, urgencia, presupuesto_estimado, fotos, estado,
  profesional_elegido_id
) on public.trabajos to authenticated;
grant delete on public.trabajos to authenticated;

-- postulaciones: nadie borra; el estado es lo único que se edita.
grant select on public.postulaciones to authenticated;
grant insert (trabajo_id, profesional_id, mensaje, precio_estimado, sena_propuesta)
  on public.postulaciones to authenticated;
grant update (estado) on public.postulaciones to authenticated;

-- contactos: solo se crean y se leen los propios.
grant select on public.contactos to authenticated;
grant insert (cliente_id, profesional_id, origen, trabajo_id) on public.contactos to authenticated;

-- resenas: lectura pública.
grant select on public.resenas to anon, authenticated;
grant insert (autor_id, profesional_id, trabajo_id, puntaje, texto) on public.resenas to authenticated;
grant update (puntaje, texto) on public.resenas to authenticated;
grant delete on public.resenas to authenticated;

-- reportes
grant select on public.reportes to authenticated;
grant insert (autor_id, objetivo_tipo, objetivo_id, motivo, detalle) on public.reportes to authenticated;
grant update (estado, resuelto_por) on public.reportes to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas
-- ---------------------------------------------------------------------------

-- barrios: lectura pública (una de las pocas políticas con `using (true)`).
create policy barrios_leer on public.barrios
  for select to anon, authenticated
  using (true);

-- usuarios
create policy usuarios_leer_propio on public.usuarios
  for select to authenticated
  using (id = (select auth.uid()));

create policy usuarios_admin_leer on public.usuarios
  for select to authenticated
  using (privado.es_admin());

create policy usuarios_actualizar_propio on public.usuarios
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy usuarios_admin_actualizar on public.usuarios
  for update to authenticated
  using (privado.es_admin())
  with check (privado.es_admin());

create policy usuarios_borrar_propio on public.usuarios
  for delete to authenticated
  using (id = (select auth.uid()));

-- perfiles_profesionales
create policy perfiles_leer_publicados on public.perfiles_profesionales
  for select to anon, authenticated
  using (publicado and privado.usuario_activo(usuario_id));

create policy perfiles_leer_propio on public.perfiles_profesionales
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy perfiles_admin_leer on public.perfiles_profesionales
  for select to authenticated
  using (privado.es_admin());

create policy perfiles_crear_propio on public.perfiles_profesionales
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
  );

create policy perfiles_actualizar_propio on public.perfiles_profesionales
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy perfiles_admin_actualizar on public.perfiles_profesionales
  for update to authenticated
  using (privado.es_admin())
  with check (privado.es_admin());

create policy perfiles_borrar_propio on public.perfiles_profesionales
  for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- verificaciones
create policy verificaciones_admin_leer on public.verificaciones
  for select to authenticated
  using (privado.es_admin());

create policy verificaciones_crear_propia on public.verificaciones
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
    and estado = 'pendiente'
  );

create policy verificaciones_admin_actualizar on public.verificaciones
  for update to authenticated
  using (privado.es_admin())
  with check (
    privado.es_admin()
    and (revisado_por is null or revisado_por = (select auth.uid()))
  );

-- trabajos
create policy trabajos_leer_propios on public.trabajos
  for select to authenticated
  using (cliente_id = (select auth.uid()));

create policy trabajos_leer_abiertos on public.trabajos
  for select to authenticated
  using (
    estado = 'abierto'
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
  );

create policy trabajos_leer_asignado on public.trabajos
  for select to authenticated
  using (profesional_elegido_id = (select auth.uid()));

create policy trabajos_admin_leer on public.trabajos
  for select to authenticated
  using (privado.es_admin());

create policy trabajos_crear on public.trabajos
  for insert to authenticated
  with check (
    cliente_id = (select auth.uid())
    and privado.rol_actual() = 'cliente'
    and privado.cuenta_activa()
    and estado = 'abierto'
    and profesional_elegido_id is null
  );

create policy trabajos_actualizar_propio on public.trabajos
  for update to authenticated
  using (cliente_id = (select auth.uid()))
  with check (
    cliente_id = (select auth.uid())
    and (
      profesional_elegido_id is null
      or privado.postulacion_elegida(id, profesional_elegido_id)
    )
  );

create policy trabajos_borrar_propio on public.trabajos
  for delete to authenticated
  using (cliente_id = (select auth.uid()) and not privado.trabajo_tiene_postulaciones(id));

-- postulaciones
create policy postulaciones_leer_propias on public.postulaciones
  for select to authenticated
  using (profesional_id = (select auth.uid()));

create policy postulaciones_leer_de_mi_trabajo on public.postulaciones
  for select to authenticated
  using (privado.trabajo_es_mio(trabajo_id));

create policy postulaciones_admin_leer on public.postulaciones
  for select to authenticated
  using (privado.es_admin());

create policy postulaciones_crear on public.postulaciones
  for insert to authenticated
  with check (
    profesional_id = (select auth.uid())
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
    and privado.perfil_publicado((select auth.uid()))
    and privado.trabajo_abierto(trabajo_id)
    and estado = 'enviada'
  );

-- El autor solo puede retirar su postulación mientras está `enviada`.
create policy postulaciones_retirar on public.postulaciones
  for update to authenticated
  using (profesional_id = (select auth.uid()) and estado = 'enviada')
  with check (profesional_id = (select auth.uid()) and estado = 'retirada');

-- El cliente dueño del trabajo elige o descarta.
create policy postulaciones_resolver on public.postulaciones
  for update to authenticated
  using (privado.trabajo_es_mio(trabajo_id) and estado <> 'retirada')
  with check (privado.trabajo_es_mio(trabajo_id) and estado in ('elegida', 'descartada'));

-- contactos
create policy contactos_leer_propios on public.contactos
  for select to authenticated
  using (cliente_id = (select auth.uid()));

create policy contactos_admin_leer on public.contactos
  for select to authenticated
  using (privado.es_admin());

create policy contactos_crear on public.contactos
  for insert to authenticated
  with check (
    cliente_id = (select auth.uid())
    and privado.rol_actual() = 'cliente'
    and privado.cuenta_activa()
    and privado.perfil_publicado(profesional_id)
    and (trabajo_id is null or privado.trabajo_es_mio(trabajo_id))
  );

-- resenas: lectura pública (otra de las políticas con `using (true)`).
create policy resenas_leer on public.resenas
  for select to anon, authenticated
  using (true);

create policy resenas_crear on public.resenas
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and privado.rol_actual() = 'cliente'
    and privado.cuenta_activa()
    and (privado.contacto_con(profesional_id) or privado.elegido_en_trabajo_mio(profesional_id))
    and (trabajo_id is null or privado.trabajo_es_mio(trabajo_id))
  );

create policy resenas_editar_propia on public.resenas
  for update to authenticated
  using (autor_id = (select auth.uid()) and created_at > now() - interval '24 hours')
  with check (autor_id = (select auth.uid()));

create policy resenas_borrar_propia on public.resenas
  for delete to authenticated
  using (autor_id = (select auth.uid()));

create policy resenas_admin_borrar on public.resenas
  for delete to authenticated
  using (privado.es_admin());

-- reportes
create policy reportes_leer_propios on public.reportes
  for select to authenticated
  using (autor_id = (select auth.uid()));

create policy reportes_admin_leer on public.reportes
  for select to authenticated
  using (privado.es_admin());

create policy reportes_crear on public.reportes
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and privado.cuenta_activa()
    and estado = 'abierto'
  );

create policy reportes_admin_actualizar on public.reportes
  for update to authenticated
  using (privado.es_admin())
  with check (
    privado.es_admin()
    and (resuelto_por is null or resuelto_por = (select auth.uid()))
  );
