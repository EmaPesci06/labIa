-- LAB-56 · Reseñas: no exponer autor_id ni trabajo_id a anon, y bloquear la edición de suspendidos.
-- Hallazgos M-04, B-07 y B-06 del informe de seguridad de LAB-34 (docs/qa/lab-34-seguridad.md).
-- Migración nueva: no edita ninguna de main.
--
-- 1. [MEDIO, M-04] anon deja de leer la tabla `resenas`: tenía `using (true)` y veía autor_id y
--    trabajo_id. La lectura pública pasa por la vista `resenas_publicas`, que no tiene ninguno de
--    los dos ids: el autor sale como nombre e inicial de `usuarios_publicos` (lo mismo que ya se
--    veía en la página del profesional). Authenticated mantiene su lectura de la tabla.
-- 2. [BAJO, B-07] La edición de la propia reseña (24 h) exige cuenta activa, en using y en with check.
-- 3. [BAJO, B-06] `privado.objetivo_existe` deja de ser ejecutable por authenticated. Solo la usa el
--    trigger de reportes (`reportes_validar_objetivo`); pasa a security definer para seguir
--    funcionando sin ese permiso. Verificado: no hay otros usos en migraciones ni en src/.

-- ---------------------------------------------------------------------------
-- 1. Reseñas públicas sin ids de autor ni de trabajo
-- ---------------------------------------------------------------------------

-- La vista corre con los permisos de su dueño (como usuarios_publicos): puede leer `resenas` y
-- `usuarios` sin RLS, pero solo expone las columnas de abajo. security_barrier impide que funciones
-- del filtro vean filas que la vista no devuelve.
create view public.resenas_publicas with (security_barrier = true) as
select
  r.id,
  r.profesional_id,
  r.puntaje,
  r.texto,
  r.created_at,
  u.nombre as autor_nombre,
  u.apellido_inicial as autor_inicial
from public.resenas r
left join public.usuarios_publicos u on u.id = r.autor_id
-- Misma regla que el perfil público (perfil_profesional): solo reseñas de profesionales publicados
-- y con cuenta activa. Si no, la reseña no se ve por la vista.
where privado.perfil_publicado(r.profesional_id)
  and privado.usuario_activo(r.profesional_id);

-- Supabase da privilegios por defecto a anon y authenticated sobre objetos nuevos: se quitan todos
-- y se deja solo select.
revoke all on public.resenas_publicas from public, anon, authenticated;
grant select on public.resenas_publicas to anon, authenticated;

-- anon no lee la tabla (ni siquiera con la política). La política pasa a ser solo de authenticated.
revoke select on public.resenas from anon;

drop policy if exists resenas_leer on public.resenas;
create policy resenas_leer on public.resenas
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. Edición de la propia reseña: solo con cuenta activa (B-07)
-- ---------------------------------------------------------------------------

drop policy if exists resenas_editar_propia on public.resenas;
create policy resenas_editar_propia on public.resenas
  for update to authenticated
  using (
    autor_id = (select auth.uid())
    and created_at > now() - interval '24 hours'
    and privado.cuenta_activa()
  )
  with check (
    autor_id = (select auth.uid())
    and privado.cuenta_activa()
  );

-- ---------------------------------------------------------------------------
-- 3. Sondeo de existencia cerrado a authenticated (B-06)
-- ---------------------------------------------------------------------------

-- Mismo cuerpo que en 20261015080000_moderacion.sql, con security definer: el trigger ya no depende
-- de que quien inserta pueda ejecutar objetivo_existe.
create or replace function privado.reportes_validar_objetivo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.objetivo_existe(new.objetivo_tipo::text, new.objetivo_id) then
    raise exception 'El contenido reportado no existe' using errcode = 'P0002';
  end if;

  if new.origen = 'usuario' and new.autor_id is not null then
    if new.objetivo_tipo = 'perfil' and new.objetivo_id = new.autor_id then
      raise exception 'No podés reportar tu propio perfil' using errcode = '23514';
    elsif new.objetivo_tipo = 'trabajo' and exists (
      select 1 from public.trabajos where id = new.objetivo_id and cliente_id = new.autor_id
    ) then
      raise exception 'No podés reportar tu propio trabajo' using errcode = '23514';
    elsif new.objetivo_tipo = 'resena' and exists (
      select 1 from public.resenas where id = new.objetivo_id and autor_id = new.autor_id
    ) then
      raise exception 'No podés reportar tu propia reseña' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function privado.objetivo_existe(text, uuid) from authenticated;
