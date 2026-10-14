-- LAB-43 · El consentimiento para datos sensibles (LAB-35) es obligatorio antes de subir documentos.
--
-- Sin un consentimiento VIGENTE no se sube ningún archivo al bucket `documentos` ni se registra
-- ningún documento. Se exige en dos lugares, para que ninguno de los dos pase solo:
--   · la política de insert de `documentos` (el archivo ni llega a Storage);
--   · la RPC `registrar_documento` (aunque el archivo ya exista, no queda registrado).
-- "Vigente" = la versión de la política guardada en el usuario es la actual. Si la política cambia,
-- el consentimiento viejo deja de servir y hay que volver a darlo.
--
-- La versión actual vive en `privado.version_legales_vigente()` y tiene que ser la misma que
-- `VERSION_LEGALES` en src/lib/legales.ts. Si cambia una, cambian las dos.

create function privado.version_legales_vigente()
returns text
language sql
immutable
set search_path = ''
as $$
  select '2026-10'::text
$$;

create function privado.consentimiento_datos_vigente()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.datos_sensibles_version = privado.version_legales_vigente()
       from public.usuarios u
      where u.id = (select auth.uid())),
    false
  )
$$;

-- Política de insert de `documentos`: además de lo que ya exigía (profesional activo, carpeta y
-- nombre), exige el consentimiento vigente.
drop policy documentos_subir_propios on storage.objects;

create policy documentos_subir_propios on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
    and privado.consentimiento_datos_vigente()
    and name ~ (
      '^' || (select auth.uid())::text
      || '/(dni_frente|dni_dorso|antecedentes|matricula)-[0-9]+\.(jpg|jpeg|png|pdf)$'
    )
  );

-- RPC: misma lógica que LAB-19 (se parte de la versión vigente en main), más el consentimiento.
create or replace function public.registrar_documento(p_tipo public.tipo_documento, p_storage_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'profesional' then
    raise exception 'Necesitás una cuenta de profesional activa' using errcode = 'insufficient_privilege';
  end if;
  if not privado.consentimiento_datos_vigente() then
    raise exception 'Tenés que aceptar el tratamiento de tus datos sensibles antes de subir documentos'
      using errcode = 'insufficient_privilege';
  end if;
  if p_tipo is null or p_storage_path is null
     or p_storage_path !~ ('^' || v_uid::text || '/' || p_tipo::text || '-[0-9]+\.(jpg|jpeg|png|pdf)$') then
    raise exception 'Documento inválido' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'documentos' and o.name = p_storage_path
  ) then
    raise exception 'El archivo todavía no se subió' using errcode = 'check_violation';
  end if;

  update public.verificaciones
  set estado = 'rechazado',
      motivo_rechazo = 'Reemplazado por un documento nuevo',
      revisado_at = now()
  where usuario_id = v_uid and tipo = p_tipo and estado = 'pendiente';

  insert into public.verificaciones (usuario_id, tipo, storage_path)
  values (v_uid, p_tipo, p_storage_path)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.registrar_documento(public.tipo_documento, text) from public, anon;
grant execute on function public.registrar_documento(public.tipo_documento, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Revisión de seguridad (LAB-43, vuelta 1)
-- ---------------------------------------------------------------------------

-- 1. El dueño no inserta directo en `verificaciones`. El grant de LAB-12 (tabla y columnas) más la
--    política `verificaciones_crear_propia` dejaban insertar sin consentimiento ni archivo. Ahora
--    el único camino es `registrar_documento` (security definer), que exige consentimiento vigente.
--    La política queda con el consentimiento como defensa en profundidad.
revoke insert on public.verificaciones from authenticated;
revoke insert (usuario_id, tipo, storage_path) on public.verificaciones from authenticated;

drop policy verificaciones_crear_propia on public.verificaciones;

create policy verificaciones_crear_propia on public.verificaciones
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
    and privado.consentimiento_datos_vigente()
    and estado = 'pendiente'
  );

-- 2. Volver a dar el consentimiento con la misma versión no pisa la fecha original (prueba de
--    cuándo la persona lo dio). Solo cambia la fecha si cambia la versión. Parte de la función de
--    main (20261014150000) con ese único cambio.
create or replace function public.aceptar_consentimiento_datos_sensibles(p_version text)
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
    raise exception 'Versión de la política inválida' using errcode = 'check_violation';
  end if;
  update public.usuarios
  set datos_sensibles_version = btrim(p_version),
      datos_sensibles_consentido_at = case
        when datos_sensibles_version is not distinct from btrim(p_version)
             and datos_sensibles_consentido_at is not null
          then datos_sensibles_consentido_at
        else now()
      end
  where id = (select auth.uid()) and rol = 'profesional';
  if not found then
    raise exception 'Solo los profesionales dan este consentimiento'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- 4. Los helpers nuevos no los ejecutan public ni anon; solo authenticated (las políticas los llaman
--    con el rol del usuario).
revoke execute on function privado.version_legales_vigente(), privado.consentimiento_datos_vigente()
  from public, anon;
grant execute on function privado.version_legales_vigente(), privado.consentimiento_datos_vigente()
  to authenticated;
