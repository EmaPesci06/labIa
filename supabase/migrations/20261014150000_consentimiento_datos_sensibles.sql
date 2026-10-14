-- LAB-35 · Consentimiento expreso para tratar datos sensibles (DNI y certificado de antecedentes).
-- Se guarda la versión de la política que la persona vio y la fecha. Igual que `normas_*`, solo se
-- escribe por una función `security definer`: el cliente no puede tocar estas columnas.

alter table public.usuarios
  add column datos_sensibles_version text check (char_length(datos_sensibles_version) <= 20),
  add column datos_sensibles_consentido_at timestamptz;

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
       or new.datos_sensibles_consentido_at is distinct from old.datos_sensibles_consentido_at then
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

-- Solo profesionales con cuenta activa. `p_version` es la versión de /privacidad que tenía en pantalla.
create function public.aceptar_consentimiento_datos_sensibles(p_version text)
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
  set datos_sensibles_version = btrim(p_version), datos_sensibles_consentido_at = now()
  where id = (select auth.uid()) and rol = 'profesional';
  if not found then
    raise exception 'Solo los profesionales dan este consentimiento'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

revoke execute on function public.aceptar_consentimiento_datos_sensibles(text) from public, anon;
grant execute on function public.aceptar_consentimiento_datos_sensibles(text) to authenticated;
