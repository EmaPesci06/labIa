-- LAB-32 · Moderación y reportes (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

create schema tests;
grant usage on schema tests to authenticated;

-- Id del reporte de C1 sobre P (se genera al insertar; los grants de reportes no incluyen id).
create function tests.reporte_perfil() returns uuid language sql stable as $$
  select id from public.reportes
  where autor_id = 'eeeeeeee-3200-4000-a000-000000000002' and objetivo_id = 'eeeeeeee-3200-4000-a000-000000000004' and objetivo_tipo = 'perfil';
$$;

create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
end;
$$;

-- ---------------------------------------------------------------------------
-- Preparación de usuarios:
-- A: admin
-- C1: cliente 1
-- C2: cliente 2
-- P: profesional
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'eeeeeeee-3200-4000-a000-000000000001', 'authenticated', 'authenticated', 'mod-a@labia.test', '{"nombre": "Admin", "apellido": "Labia"}'),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeeee-3200-4000-a000-000000000002', 'authenticated', 'authenticated', 'mod-c1@labia.test', '{"nombre": "Cliente", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeeee-3200-4000-a000-000000000003', 'authenticated', 'authenticated', 'mod-c2@labia.test', '{"nombre": "Cliente", "apellido": "Dos"}'),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeeee-3200-4000-a000-000000000004', 'authenticated', 'authenticated', 'mod-p@labia.test', '{"rol": "profesional", "nombre": "Pedro", "apellido": "Pro"}');

update public.usuarios set rol = 'admin' where id = 'eeeeeeee-3200-4000-a000-000000000001';

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok, publicado)
values ('eeeeeeee-3200-4000-a000-000000000004', '{plomeria}', true, true, true, true);

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
select 'ffffffff-3200-4000-a000-000000000001'::uuid, 'eeeeeeee-3200-4000-a000-000000000002'::uuid, 'plomeria', 'Arreglo canilla', 'Pierde agua', b.id, 'sin_apuro', 'abierto'
from public.barrios b where b.slug = 'centro';

insert into public.postulaciones (trabajo_id, profesional_id, mensaje, estado)
values ('ffffffff-3200-4000-a000-000000000001', 'eeeeeeee-3200-4000-a000-000000000004', 'Puedo ir hoy', 'enviada');

insert into public.resenas (id, autor_id, profesional_id, puntaje, texto)
values ('11111111-3200-4000-a000-000000000001', 'eeeeeeee-3200-4000-a000-000000000003', 'eeeeeeee-3200-4000-a000-000000000004', 1, 'Pésimo servicio');

-- ---------------------------------------------------------------------------
-- Tests de reportes (cliente C1 reporta a profesional P)
-- ---------------------------------------------------------------------------

reset role;
select tests.como('eeeeeeee-3200-4000-a000-000000000002');

-- C1 reporta el perfil de P
select lives_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo, detalle)
    values ('eeeeeeee-3200-4000-a000-000000000002', 'perfil', 'eeeeeeee-3200-4000-a000-000000000004', 'datos_falsos', 'Foto falsa')$$,
  'C1 puede reportar el perfil de P'
);

-- C1 no puede reportar dos veces el mismo objetivo
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('eeeeeeee-3200-4000-a000-000000000002', 'perfil', 'eeeeeeee-3200-4000-a000-000000000004', 'estafa')$$,
  '23505',
  null,
  'no se puede reportar dos veces el mismo objetivo'
);

-- C1 no puede reportar su propio trabajo
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('eeeeeeee-3200-4000-a000-000000000002', 'trabajo', 'ffffffff-3200-4000-a000-000000000001', 'otro')$$,
  '23514',
  null,
  'no se puede reportar el propio trabajo'
);

-- El objetivo tiene que existir
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('eeeeeeee-3200-4000-a000-000000000002', 'perfil', 'eeeeeeee-3200-4000-a000-00000000ffff', 'otro')$$,
  'P0002', null, 'no se puede reportar un perfil que no existe'
);
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('eeeeeeee-3200-4000-a000-000000000002', 'trabajo', 'ffffffff-3200-4000-a000-00000000ffff', 'otro')$$,
  'P0002', null, 'no se puede reportar un trabajo que no existe'
);
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('eeeeeeee-3200-4000-a000-000000000002', 'resena', '11111111-3200-4000-a000-00000000ffff', 'otro')$$,
  'P0002', null, 'no se puede reportar una reseña que no existe'
);

-- Un trigger security definer (como resenas_moderar de LAB-31) abre el reporte de la reseña de 1
-- estrella de su propio autor: no cuenta como autoreporte y no gasta el cupo diario del autor.
reset role;
create function tests.reporte_sistema_resena(p_autor uuid, p_resena uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  -- Mismo guard que resenas_moderar: si ya hay un reporte para la reseña, no abre otro.
  if not exists (select 1 from public.reportes where objetivo_tipo = 'resena' and objetivo_id = p_resena) then
    insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo, detalle, estado)
    values (p_autor, 'resena', p_resena, 'otro', 'Calificación baja (1 estrella)', 'abierto');
  end if;
end;
$$;

select lives_ok(
  $$select tests.reporte_sistema_resena('eeeeeeee-3200-4000-a000-000000000003', '11111111-3200-4000-a000-000000000001')$$,
  'un reporte del sistema sobre la propia reseña no falla'
);
select is(
  (select origen from public.reportes where autor_id = 'eeeeeeee-3200-4000-a000-000000000003' and objetivo_id = '11111111-3200-4000-a000-000000000001'),
  'sistema',
  'el reporte del sistema queda con origen sistema'
);
select is(
  (select count(*) from public.reportes where autor_id = 'eeeeeeee-3200-4000-a000-000000000003' and origen = 'usuario'),
  0::bigint,
  'el reporte del sistema no cuenta como reporte del usuario'
);

reset role;
select tests.como('eeeeeeee-3200-4000-a000-000000000002');

-- C1 no puede llamar funciones de admin
select throws_ok(
  $$select public.suspender_cuenta_admin('eeeeeeee-3200-4000-a000-000000000004', 'Falta grave')$$,
  '42501',
  null,
  'no admin no puede suspender cuenta'
);

select throws_ok(
  $$select public.reactivar_cuenta_admin('eeeeeeee-3200-4000-a000-000000000004')$$,
  '42501',
  null,
  'no admin no puede reactivar cuenta'
);

select throws_ok(
  $$select public.cerrar_trabajo_admin('ffffffff-3200-4000-a000-000000000001')$$,
  '42501',
  null,
  'no admin no puede cerrar trabajo'
);

select throws_ok(
  $$select public.ocultar_resena_admin('11111111-3200-4000-a000-000000000001')$$,
  '42501',
  null,
  'no admin no puede ocultar resena'
);

-- ---------------------------------------------------------------------------
-- Tests de admin
-- ---------------------------------------------------------------------------

reset role;
select tests.como('eeeeeeee-3200-4000-a000-000000000001');

-- Marcar en revisión
select is(
  public.marcar_reporte_en_revision(tests.reporte_perfil()),
  true,
  'admin puede marcar reporte en revisión'
);

select is(
  (select estado from public.reportes where id = tests.reporte_perfil()),
  'en_revision'::public.estado_reporte,
  'estado del reporte pasa a en_revision'
);

-- Resolver reporte
select is(
  public.resolver_reporte(tests.reporte_perfil(), true, 'Se investigó el caso'),
  true,
  'admin puede resolver reporte con acción'
);

select is(
  (select estado from public.reportes where id = tests.reporte_perfil()),
  'resuelto'::public.estado_reporte,
  'estado del reporte pasa a resuelto'
);

-- Ocultar reseña
select is(
  public.ocultar_resena_admin('11111111-3200-4000-a000-000000000001', 'Lenguaje inapropiado'),
  true,
  'admin puede ocultar reseña'
);

select is(
  (select count(*) from public.resenas where id = '11111111-3200-4000-a000-000000000001'),
  0::bigint,
  'la reseña fue borrada'
);

-- Cerrar trabajo
select is(
  public.cerrar_trabajo_admin('ffffffff-3200-4000-a000-000000000001', 'Incumplimiento de normas'),
  true,
  'admin puede cerrar trabajo'
);

select is(
  (select estado from public.trabajos where id = 'ffffffff-3200-4000-a000-000000000001'),
  'cancelado'::public.estado_trabajo,
  'trabajo pasa a cancelado'
);

select is(
  (select estado from public.postulaciones where trabajo_id = 'ffffffff-3200-4000-a000-000000000001'),
  'descartada'::public.estado_postulacion,
  'postulaciones pasan a descartada'
);

-- Suspender cuenta de P
select is(
  public.suspender_cuenta_admin('eeeeeeee-3200-4000-a000-000000000004', 'Comportamiento indebido en domicilio'),
  true,
  'admin puede suspender la cuenta de P'
);

select is(
  (select estado from public.usuarios where id = 'eeeeeeee-3200-4000-a000-000000000004'),
  'suspendida'::public.estado_cuenta,
  'estado de usuario pasa a suspendida'
);

-- Suspender cuenta requiere motivo obligatorio
select throws_ok(
  $$select public.suspender_cuenta_admin('eeeeeeee-3200-4000-a000-000000000002', '')$$,
  '22023',
  null,
  'suspender requiere motivo obligatorio'
);

-- Usuario suspendido puede leer su motivo de suspensión
reset role;
select tests.como('eeeeeeee-3200-4000-a000-000000000004');

select is(
  public.mi_motivo_suspension(),
  'Comportamiento indebido en domicilio',
  'el usuario suspendido puede leer su motivo de suspensión'
);

-- Un cliente (no suspendido) no obtiene el motivo de otro: la función ya no acepta un id ajeno
reset role;
select tests.como('eeeeeeee-3200-4000-a000-000000000002');

select is(
  public.mi_motivo_suspension(),
  null::text,
  'un cliente no obtiene el motivo de la suspensión de otro'
);

select throws_ok(
  $$select public.mi_motivo_suspension('eeeeeeee-3200-4000-a000-000000000004')$$,
  '42883',
  null,
  'mi_motivo_suspension no acepta el id de otra cuenta'
);

-- Revocar sesiones: solo service_role
select ok(
  has_function_privilege('service_role', 'public.revocar_sesiones_admin(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.revocar_sesiones_admin(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.revocar_sesiones_admin(uuid)', 'execute'),
  'revocar_sesiones_admin: solo service_role la ejecuta'
);

reset role;
insert into auth.sessions (id, user_id)
values ('dddddddd-3200-4000-a000-000000000001', 'eeeeeeee-3200-4000-a000-000000000004');
select public.revocar_sesiones_admin('eeeeeeee-3200-4000-a000-000000000004');
select is(
  (select count(*) from auth.sessions where user_id = 'eeeeeeee-3200-4000-a000-000000000004'),
  0::bigint,
  'revocar_sesiones_admin borra las sesiones de la cuenta'
);
select throws_ok(
  $$select public.revocar_sesiones_admin('eeeeeeee-3200-4000-a000-000000000001')$$,
  '22023',
  null,
  'revocar_sesiones_admin rechaza la cuenta de un admin'
);

-- Reactivar cuenta
reset role;
select tests.como('eeeeeeee-3200-4000-a000-000000000001');

select is(
  public.reactivar_cuenta_admin('eeeeeeee-3200-4000-a000-000000000004', 'Apelación aceptada'),
  true,
  'admin puede reactivar la cuenta de P'
);

select is(
  (select estado from public.usuarios where id = 'eeeeeeee-3200-4000-a000-000000000004'),
  'activa'::public.estado_cuenta,
  'estado de usuario pasa a activa'
);

rollback;
