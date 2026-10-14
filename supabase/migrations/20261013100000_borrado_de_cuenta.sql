-- LAB-33 · Borrado de cuenta (Ley 25.326, derecho de supresión).
--
-- El borrado lo hace un job de servidor con la service role (`auth.admin.deleteUser`): borra
-- `auth.users` y, en cascada, `usuarios` y todo lo que cuelga de ahí. Esta migración deja la base
-- lista para eso:
--   1. Las reseñas escritas se anonimizan: `resenas.autor_id` pasa a ser opcional y, al borrar al
--      autor, queda en null (la interfaz muestra "Cliente de LabÍA"). El promedio del profesional
--      no cambia. Las reseñas recibidas se borran con el perfil (cascada por `profesional_id`).
--   2. Los trabajos `asignado` con un profesional que borra su cuenta se cancelan.
--   3. `acciones_moderacion`: registro de acciones sin datos personales (id y fecha). La usa el
--      borrado de cuentas y la va a usar el panel de reportes.

-- 1. Reseñas anónimas ------------------------------------------------------------------------

alter table public.resenas alter column autor_id drop not null;
alter table public.resenas drop constraint resenas_autor_id_fkey;
alter table public.resenas
  add constraint resenas_autor_id_fkey
  foreign key (autor_id) references public.usuarios (id) on delete set null;

-- 2. Trabajos asignados ----------------------------------------------------------------------

create function privado.cancelar_trabajos_al_borrar_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trabajos
  set estado = 'cancelado'
  where profesional_elegido_id = old.id and estado = 'asignado';
  return old;
end;
$$;

revoke execute on function privado.cancelar_trabajos_al_borrar_usuario() from public, anon, authenticated;

create trigger usuarios_cancelar_trabajos_al_borrar
before delete on public.usuarios
for each row execute function privado.cancelar_trabajos_al_borrar_usuario();

-- 3. acciones_moderacion ---------------------------------------------------------------------

create table if not exists public.acciones_moderacion (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.usuarios (id) on delete set null,
  accion text not null check (char_length(accion) between 1 and 60),
  objetivo_id uuid,
  motivo text check (char_length(motivo) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists acciones_moderacion_admin_id_idx on public.acciones_moderacion (admin_id);
create index if not exists acciones_moderacion_objetivo_idx on public.acciones_moderacion (objetivo_id);

alter table public.acciones_moderacion enable row level security;

revoke all on table public.acciones_moderacion from anon, authenticated;
grant select on public.acciones_moderacion to authenticated;

-- Solo un admin lee. Nadie escribe por la API: las acciones las registra el servidor.
create policy acciones_moderacion_admin_leer on public.acciones_moderacion
  for select to authenticated
  using (privado.es_admin());
