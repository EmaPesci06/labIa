-- LAB-11 · Esquema inicial de LabÍA (Guía para agentes §6).
-- Crea enums, tablas, índices, triggers y la función de distancia entre barrios.
-- RLS queda ACTIVADO en todas las tablas y SIN políticas: nadie accede salvo la service role.
-- Las políticas y los buckets van en LAB-12.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.rol as enum ('cliente', 'profesional', 'admin');
create type public.oficio as enum (
  'carpinteria', 'plomeria', 'cerrajeria', 'gas', 'pintura', 'mecanica', 'electricidad'
);
create type public.estado_cuenta as enum ('activa', 'suspendida');
create type public.estado_verificacion as enum ('pendiente', 'aprobado', 'rechazado');
create type public.tipo_documento as enum ('dni_frente', 'dni_dorso', 'antecedentes', 'matricula');
create type public.urgencia as enum ('lo_antes_posible', 'esta_semana', 'sin_apuro');
create type public.estado_trabajo as enum ('abierto', 'asignado', 'cerrado', 'cancelado');
create type public.estado_postulacion as enum ('enviada', 'elegida', 'descartada', 'retirada');
create type public.motivo_reporte as enum (
  'datos_falsos', 'comportamiento', 'estafa', 'contenido_inapropiado', 'otro'
);
create type public.estado_reporte as enum ('abierto', 'en_revision', 'resuelto');

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

create function public.actualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- barrios: centro de cada barrio del Partido de General Pueyrredon.
-- Nunca se guarda la dirección exacta (guía §7.4): la distancia es entre centros.
-- ---------------------------------------------------------------------------

create table public.barrios (
  id smallint primary key check (id > 0),
  nombre text not null unique check (char_length(nombre) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  centro extensions.geography(Point, 4326) not null
);

create index barrios_centro_idx on public.barrios using gist (centro);

-- ---------------------------------------------------------------------------
-- usuarios: una fila por cuenta de auth.users, un solo rol.
-- ---------------------------------------------------------------------------

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  rol public.rol not null default 'cliente',
  nombre text check (char_length(nombre) between 1 and 60),
  apellido text check (char_length(apellido) between 1 and 60),
  whatsapp text check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  barrio_id smallint references public.barrios (id),
  foto_path text check (char_length(foto_path) <= 300),
  estado public.estado_cuenta not null default 'activa',
  normas_version text check (char_length(normas_version) <= 20),
  normas_aceptadas_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index usuarios_barrio_id_idx on public.usuarios (barrio_id);

create trigger usuarios_updated_at
before update on public.usuarios
for each row execute function public.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- perfiles_profesionales
-- ---------------------------------------------------------------------------

create table public.perfiles_profesionales (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade,
  oficios public.oficio[] not null check (cardinality(oficios) >= 1),
  especialidades text check (char_length(especialidades) <= 120),
  descripcion text check (char_length(descripcion) <= 500),
  anios_experiencia smallint check (anios_experiencia between 0 and 70),
  toda_la_ciudad boolean not null default false,
  zonas smallint[] not null default '{}',
  disponibilidad text check (char_length(disponibilidad) <= 120),
  fotos_trabajos text[] not null default '{}' check (cardinality(fotos_trabajos) <= 10),
  matricula_numero text check (char_length(matricula_numero) <= 40),
  identidad_verificada boolean not null default false,
  antecedentes_ok boolean not null default false,
  matriculado boolean not null default false,
  publicado boolean not null default false,
  promedio numeric(2, 1) check (promedio between 1 and 5),
  cantidad_resenas integer not null default 0 check (cantidad_resenas >= 0),
  -- Reservado para la suscripción (post-MVP). No usar en el MVP.
  prioridad smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint perfiles_zonas_maximo check (cardinality(zonas) <= 10),
  constraint perfiles_zonas_o_toda_la_ciudad check (toda_la_ciudad or cardinality(zonas) >= 1)
);

create index perfiles_profesionales_oficios_idx on public.perfiles_profesionales using gin (oficios);
create index perfiles_profesionales_zonas_idx on public.perfiles_profesionales using gin (zonas);

create trigger perfiles_profesionales_updated_at
before update on public.perfiles_profesionales
for each row execute function public.actualizar_updated_at();

-- Valida el perfil y mantiene `publicado`:
--   publicado = identidad_verificada and antecedentes_ok
--               and (not 'gas' = any(oficios) or matriculado)
--               and la cuenta está activa.
-- Nadie puede forzar `publicado` desde afuera: siempre se recalcula.
create function public.perfiles_profesionales_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol;
  v_estado public.estado_cuenta;
begin
  select u.rol, u.estado into v_rol, v_estado
  from public.usuarios u
  where u.id = new.usuario_id;

  if v_rol is distinct from 'profesional' then
    raise exception 'Solo una cuenta profesional puede tener perfil profesional'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from unnest(new.zonas) as z (id)
    where not exists (select 1 from public.barrios b where b.id = z.id)
  ) then
    raise exception 'Zona inexistente en perfiles_profesionales.zonas'
      using errcode = 'foreign_key_violation';
  end if;

  new.publicado := new.identidad_verificada
    and new.antecedentes_ok
    and (not 'gas' = any (new.oficios) or new.matriculado)
    and v_estado = 'activa';

  return new;
end;
$$;

create trigger perfiles_profesionales_validar
before insert or update on public.perfiles_profesionales
for each row execute function public.perfiles_profesionales_validar();

-- Si se suspende o reactiva una cuenta, se recalcula `publicado` de su perfil.
create function public.usuarios_estado_cambiado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles_profesionales p
  set publicado = p.publicado -- dispara perfiles_profesionales_validar
  where p.usuario_id = new.id;
  return new;
end;
$$;

create trigger usuarios_estado_cambiado
after update of estado on public.usuarios
for each row
when (old.estado is distinct from new.estado)
execute function public.usuarios_estado_cambiado();

-- ---------------------------------------------------------------------------
-- verificaciones: documentos del profesional (bucket privado `documentos`).
-- ---------------------------------------------------------------------------

create table public.verificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo public.tipo_documento not null,
  -- Ruta dentro del bucket privado: <usuario_id>/<tipo>-<timestamp>.<ext> (guía §7.2).
  storage_path text not null check (
    char_length(storage_path) <= 300
    and storage_path like usuario_id::text || '/%'
  ),
  estado public.estado_verificacion not null default 'pendiente',
  motivo_rechazo text check (char_length(motivo_rechazo) <= 500),
  revisado_por uuid references public.usuarios (id) on delete set null,
  revisado_at timestamptz,
  created_at timestamptz not null default now()
);

create index verificaciones_usuario_id_idx on public.verificaciones (usuario_id);
create index verificaciones_estado_idx on public.verificaciones (estado, created_at);
create index verificaciones_revisado_por_idx on public.verificaciones (revisado_por);

-- ---------------------------------------------------------------------------
-- trabajos: pedidos publicados por clientes.
-- ---------------------------------------------------------------------------

create table public.trabajos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.usuarios (id) on delete cascade,
  oficio public.oficio not null,
  titulo text not null check (char_length(titulo) between 1 and 80),
  descripcion text not null check (char_length(descripcion) between 1 and 1000),
  barrio_id smallint not null references public.barrios (id),
  urgencia public.urgencia not null,
  presupuesto_estimado integer check (presupuesto_estimado >= 0),
  fotos text[] not null default '{}' check (cardinality(fotos) <= 4),
  estado public.estado_trabajo not null default 'abierto',
  profesional_elegido_id uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trabajos_estado_oficio_created_at_idx on public.trabajos (estado, oficio, created_at desc);
create index trabajos_barrio_id_idx on public.trabajos (barrio_id);
create index trabajos_cliente_id_idx on public.trabajos (cliente_id);
create index trabajos_profesional_elegido_id_idx on public.trabajos (profesional_elegido_id);

create trigger trabajos_updated_at
before update on public.trabajos
for each row execute function public.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- postulaciones: un profesional se ofrece para un trabajo.
-- ---------------------------------------------------------------------------

create table public.postulaciones (
  id uuid primary key default gen_random_uuid(),
  trabajo_id uuid not null references public.trabajos (id) on delete cascade,
  profesional_id uuid not null references public.usuarios (id) on delete cascade,
  mensaje text not null check (char_length(mensaje) between 1 and 500),
  precio_estimado integer check (precio_estimado >= 0),
  sena_propuesta integer check (sena_propuesta >= 0),
  estado public.estado_postulacion not null default 'enviada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint postulaciones_trabajo_profesional_key unique (trabajo_id, profesional_id),
  constraint postulaciones_sena_menor_que_precio check (
    sena_propuesta is null or precio_estimado is null or sena_propuesta <= precio_estimado
  )
);

create index postulaciones_trabajo_id_idx on public.postulaciones (trabajo_id);
create index postulaciones_profesional_id_idx on public.postulaciones (profesional_id);

create trigger postulaciones_updated_at
before update on public.postulaciones
for each row execute function public.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- contactos: cada vez que un cliente abre WhatsApp con un profesional. Habilita reseñas.
-- ---------------------------------------------------------------------------

create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.usuarios (id) on delete cascade,
  profesional_id uuid not null references public.usuarios (id) on delete cascade,
  origen text not null check (origen in ('perfil', 'postulacion')),
  trabajo_id uuid references public.trabajos (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contactos_distintos check (cliente_id <> profesional_id)
);

create index contactos_cliente_profesional_idx on public.contactos (cliente_id, profesional_id);
create index contactos_profesional_id_idx on public.contactos (profesional_id);
create index contactos_trabajo_id_idx on public.contactos (trabajo_id);

-- ---------------------------------------------------------------------------
-- resenas: una por cliente y profesional.
-- ---------------------------------------------------------------------------

create table public.resenas (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.usuarios (id) on delete cascade,
  profesional_id uuid not null references public.usuarios (id) on delete cascade,
  trabajo_id uuid references public.trabajos (id) on delete set null,
  puntaje smallint not null check (puntaje between 1 and 5),
  texto text check (char_length(texto) <= 500),
  created_at timestamptz not null default now(),
  constraint resenas_autor_profesional_key unique (autor_id, profesional_id),
  constraint resenas_distintos check (autor_id <> profesional_id)
);

create index resenas_profesional_id_idx on public.resenas (profesional_id);
create index resenas_trabajo_id_idx on public.resenas (trabajo_id);

-- Recalcula promedio y cantidad_resenas del profesional afectado.
create function public.recalcular_resenas_de(p_profesional_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.perfiles_profesionales p
  set promedio = s.promedio,
      cantidad_resenas = s.cantidad
  from (
    select round(avg(r.puntaje)::numeric, 1) as promedio, count(*)::integer as cantidad
    from public.resenas r
    where r.profesional_id = p_profesional_id
  ) s
  where p.usuario_id = p_profesional_id;
$$;

create function public.resenas_recalcular()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalcular_resenas_de(old.profesional_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalcular_resenas_de(new.profesional_id);
  end if;
  return null;
end;
$$;

create trigger resenas_recalcular
after insert or update of puntaje, profesional_id or delete on public.resenas
for each row execute function public.resenas_recalcular();

-- ---------------------------------------------------------------------------
-- reportes: denuncias de perfiles, trabajos o reseñas.
-- Si el autor borra la cuenta, el reporte se conserva para moderación (autor_id = null).
-- ---------------------------------------------------------------------------

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.usuarios (id) on delete set null,
  objetivo_tipo text not null check (objetivo_tipo in ('perfil', 'trabajo', 'resena')),
  objetivo_id uuid not null,
  motivo public.motivo_reporte not null,
  detalle text check (char_length(detalle) <= 1000),
  estado public.estado_reporte not null default 'abierto',
  resuelto_por uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reportes_estado_created_at_idx on public.reportes (estado, created_at desc);
create index reportes_objetivo_idx on public.reportes (objetivo_tipo, objetivo_id);
create index reportes_autor_id_idx on public.reportes (autor_id);
create index reportes_resuelto_por_idx on public.reportes (resuelto_por);

create trigger reportes_updated_at
before update on public.reportes
for each row execute function public.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- Alta automática en public.usuarios al crear una cuenta en auth.users.
-- El rol sale de raw_user_meta_data->>'rol' (lo controla el usuario), así que solo se acepta
-- 'profesional'; cualquier otro valor, incluido 'admin', crea un 'cliente'.
-- Los admins se asignan a mano con la service role.
-- ---------------------------------------------------------------------------

create function public.al_crear_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_rol public.rol := 'cliente';
begin
  if v_meta ->> 'rol' = 'profesional' then
    v_rol := 'profesional';
  end if;

  insert into public.usuarios (id, rol, nombre, apellido)
  values (
    new.id,
    v_rol,
    nullif(left(btrim(v_meta ->> 'nombre'), 60), ''),
    nullif(left(btrim(v_meta ->> 'apellido'), 60), '')
  );

  return new;
end;
$$;

create trigger al_crear_usuario
after insert on auth.users
for each row execute function public.al_crear_usuario();

-- ---------------------------------------------------------------------------
-- Distancia entre centros de barrio, en km con una decimal.
-- ---------------------------------------------------------------------------

create function public.distancia_km(barrio_a smallint, barrio_b smallint)
returns numeric
language sql
stable
set search_path = ''
as $$
  select round((extensions.st_distance(a.centro, b.centro) / 1000)::numeric, 1)
  from public.barrios a, public.barrios b
  where a.id = barrio_a and b.id = barrio_b;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de funciones: las de triggers y las internas no se exponen por la API.
-- ---------------------------------------------------------------------------

revoke execute on function public.actualizar_updated_at() from public, anon, authenticated;
revoke execute on function public.perfiles_profesionales_validar() from public, anon, authenticated;
revoke execute on function public.usuarios_estado_cambiado() from public, anon, authenticated;
revoke execute on function public.recalcular_resenas_de(uuid) from public, anon, authenticated;
revoke execute on function public.resenas_recalcular() from public, anon, authenticated;
revoke execute on function public.al_crear_usuario() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS en todas las tablas (guía §7.1). Sin políticas = nadie accede por la API.
-- ---------------------------------------------------------------------------

alter table public.barrios enable row level security;
alter table public.usuarios enable row level security;
alter table public.perfiles_profesionales enable row level security;
alter table public.verificaciones enable row level security;
alter table public.trabajos enable row level security;
alter table public.postulaciones enable row level security;
alter table public.contactos enable row level security;
alter table public.resenas enable row level security;
alter table public.reportes enable row level security;
