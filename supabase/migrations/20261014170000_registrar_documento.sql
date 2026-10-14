-- LAB-19 · Registro de documentos de verificación (DNI, antecedentes, matrícula).
--
-- El navegador sube el archivo directo al bucket privado `documentos` (URL firmada de subida) y
-- después registra el documento acá. La función valida en la base lo que la tabla sola no puede:
--   · sesión, rol profesional y cuenta activa;
--   · que el archivo exista de verdad en el bucket, en la carpeta de la persona y con el tipo que
--     dice el nombre (<uid>/<tipo>-<timestamp>.<ext>);
--   · que un documento nuevo reemplace al pendiente anterior del mismo tipo: el viejo queda en la
--     tabla como `rechazado` ("Reemplazado por un documento nuevo") para auditoría, junto con su
--     archivo, hasta que el admin lo procese. Los ya aprobados no se tocan.
-- Sigue sin haber forma de leer `storage_path` desde la API para el dueño (vista mis_verificaciones).

create function public.registrar_documento(p_tipo public.tipo_documento, p_storage_path text)
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
