-- LAB-40 · Rol inicial al registrarse con Google.
-- El trigger al_crear_usuario solo lee el rol del signUp con email; con Google la fila queda en
-- `cliente` y `usuarios.rol` es columna protegida. Esta función deja elegir entre cliente y
-- profesional mientras la cuenta sea nueva y sin datos completos. Nunca admin.

create function public.elegir_rol_inicial(p_rol public.rol)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_usuario public.usuarios;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión' using errcode = 'insufficient_privilege';
  end if;
  if p_rol is null or p_rol not in ('cliente', 'profesional') then
    raise exception 'Rol no permitido' using errcode = 'check_violation';
  end if;

  select * into v_usuario from public.usuarios where id = v_uid for update;
  if not found or v_usuario.estado <> 'activa' or v_usuario.rol = 'admin' then
    raise exception 'La cuenta no puede cambiar de rol' using errcode = 'insufficient_privilege';
  end if;

  if v_usuario.rol = p_rol then
    return;
  end if;

  -- Cuenta con datos completos o con trámites iniciados: el rol ya no se cambia.
  if v_usuario.whatsapp is not null
     or v_usuario.barrio_id is not null
     or v_usuario.normas_aceptadas_at is not null
     or exists (select 1 from public.perfiles_profesionales p where p.usuario_id = v_uid)
     or exists (select 1 from public.verificaciones v where v.usuario_id = v_uid) then
    raise exception 'La cuenta ya tiene datos y no puede cambiar de rol'
      using errcode = 'insufficient_privilege';
  end if;

  update public.usuarios set rol = p_rol where id = v_uid;
end;
$$;

revoke execute on function public.elegir_rol_inicial(public.rol) from public, anon;
grant execute on function public.elegir_rol_inicial(public.rol) to authenticated;
