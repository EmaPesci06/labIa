-- LAB-81 · Mayor de 18 y términos del cliente, guardado en el servidor.
--
-- La casilla del alta no alcanza si el consentimiento no queda registrado: una cuenta nueva de
-- Google podía saltear "Un último paso" y usar la plataforma igual. Ahora el consentimiento es un
-- dato de la cuenta (`terminos_version` y `terminos_aceptados_at`) y las Server Actions del
-- cliente lo exigen. Igual que `normas_*` y `datos_sensibles_*`, solo se escribe por una función
-- `security definer` (o por el trigger del alta con email); el usuario no lo toca con un UPDATE.

alter table public.usuarios
  add column terminos_version text check (char_length(terminos_version) <= 20),
  add column terminos_aceptados_at timestamptz;

-- Cuerpo vigente: 20261015080000_moderacion.sql, más las dos columnas nuevas.
create or replace function privado.usuarios_proteger_columnas()
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
       or new.normas_aceptadas_at is distinct from old.normas_aceptadas_at
       or new.datos_sensibles_version is distinct from old.datos_sensibles_version
       or new.datos_sensibles_consentido_at is distinct from old.datos_sensibles_consentido_at
       or new.terminos_version is distinct from old.terminos_version
       or new.terminos_aceptados_at is distinct from old.terminos_aceptados_at then
      raise exception 'No podés modificar esas columnas directamente'
        using errcode = 'insufficient_privilege';
    end if;
    if new.estado is distinct from old.estado then
      raise exception 'El estado de la cuenta lo cambia solo la moderación'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

-- Solo clientes con cuenta activa. `p_version` es la versión de /terminos y /privacidad vigente:
-- cualquier otro valor se rechaza. Repetirlo con la misma versión no pisa la fecha original.
create function public.aceptar_terminos(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not privado.cuenta_activa() then
    raise exception 'Necesitás una cuenta activa' using errcode = 'insufficient_privilege';
  end if;
  if p_version is distinct from privado.version_legales_vigente() then
    raise exception 'Versión de los términos inválida' using errcode = 'check_violation';
  end if;
  update public.usuarios
  set terminos_aceptados_at = case
        when terminos_version is not distinct from p_version and terminos_aceptados_at is not null
          then terminos_aceptados_at
        else now()
      end,
      terminos_version = p_version
  where id = (select auth.uid()) and rol = 'cliente';
  if not found then
    raise exception 'Solo los clientes aceptan estos términos'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

revoke execute on function public.aceptar_terminos(text) from public, anon;
grant execute on function public.aceptar_terminos(text) to authenticated;

-- Alta con email: el formulario ya exigió la casilla, pero todavía no hay sesión (hay que confirmar
-- el email), así que el signUp manda la versión en su metadata y el trigger la registra. Solo vale
-- con el proveedor `email` y la versión vigente: una cuenta de Google no puede traerla ni cargarla
-- después (el trigger corre solo al crear la cuenta). Cuerpo vigente: 20261011190000_esquema_inicial.sql.
create or replace function public.al_crear_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_rol public.rol := 'cliente';
  v_acepto boolean;
begin
  if v_meta ->> 'rol' = 'profesional' then
    v_rol := 'profesional';
  end if;

  v_acepto := v_rol = 'cliente'
    and new.raw_app_meta_data ->> 'provider' = 'email'
    and v_meta ->> 'terminos_version' = privado.version_legales_vigente();

  insert into public.usuarios (id, rol, nombre, apellido, terminos_version, terminos_aceptados_at)
  values (
    new.id,
    v_rol,
    nullif(left(btrim(v_meta ->> 'nombre'), 60), ''),
    nullif(left(btrim(v_meta ->> 'apellido'), 60), ''),
    case when v_acepto then privado.version_legales_vigente() end,
    case when v_acepto then now() end
  );

  return new;
end;
$$;

-- Cuentas existentes: quien ya completó el alta de cliente (WhatsApp y barrio cargados) queda como
-- aceptado en la versión vigente, con la fecha de esta migración. Las demás pasan por "Un último
-- paso" la próxima vez que entren.
update public.usuarios
set terminos_version = privado.version_legales_vigente(), terminos_aceptados_at = now()
where rol = 'cliente'
  and whatsapp is not null
  and barrio_id is not null
  and terminos_aceptados_at is null;
