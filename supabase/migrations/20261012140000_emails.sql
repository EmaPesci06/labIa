-- LAB-30 · Emails transaccionales: preferencias de cada usuario, cola de avisos de postulaciones
-- (para agrupar varias en un solo email) y registro de envíos (para no repetir los de los crons).

-- ---------------------------------------------------------------------------
-- preferencias_email: el dueño lee, crea y modifica la suya. Sin fila = todo activo.
-- ---------------------------------------------------------------------------

create table public.preferencias_email (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade,
  trabajos_cerca boolean not null default true,
  novedades boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger preferencias_email_updated_at
before update on public.preferencias_email
for each row execute function public.actualizar_updated_at();

alter table public.preferencias_email enable row level security;

revoke all on public.preferencias_email from anon, authenticated;
grant select on public.preferencias_email to authenticated;
grant insert (usuario_id, trabajos_cerca, novedades) on public.preferencias_email to authenticated;
grant update (trabajos_cerca, novedades) on public.preferencias_email to authenticated;

create policy preferencias_email_leer_propia on public.preferencias_email
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy preferencias_email_crear_propia on public.preferencias_email
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

create policy preferencias_email_actualizar_propia on public.preferencias_email
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- emails_pendientes: avisos de postulaciones esperando para salir juntos (ventana de 10 min).
-- Solo la service role (jobs y Server Actions): RLS activado y sin políticas.
-- ---------------------------------------------------------------------------

create table public.emails_pendientes (
  id uuid primary key default gen_random_uuid(),
  trabajo_id uuid not null references public.trabajos (id) on delete cascade,
  postulacion_id uuid not null unique references public.postulaciones (id) on delete cascade,
  created_at timestamptz not null default now(),
  enviado_at timestamptz
);

create index emails_pendientes_trabajo_idx on public.emails_pendientes (trabajo_id, enviado_at);

alter table public.emails_pendientes enable row level security;
revoke all on public.emails_pendientes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- emails_enviados: una fila por envío único (p. ej. "pedir_resena:<trabajo>"). Solo service role.
-- ---------------------------------------------------------------------------

create table public.emails_enviados (
  clave text primary key check (char_length(clave) <= 200),
  created_at timestamptz not null default now()
);

alter table public.emails_enviados enable row level security;
revoke all on public.emails_enviados from anon, authenticated;
