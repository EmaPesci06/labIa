-- LAB-53 · Campos libres sin teléfonos, emails ni direcciones (hallazgo M-01 de LAB-34).
-- Migración nueva: no edita las de main.
--
-- La validación en Zod (src/lib/validaciones/contenido-publico.ts) no alcanza: los grants de LAB-12
-- dejan insertar y actualizar estas columnas por PostgREST sin pasar por la app. Esta migración pone la
-- misma regla en la base: una función que replica la del helper y un trigger por tabla.
--
-- Paridad: `contenido-publico.paridad.test.ts` corre los casos de supabase/tests/database/
-- contenido_publico.test.sql contra el helper de la app y contra esta función. Si cambia una regla,
-- cambian las dos y los casos.
--
-- Diferencia conocida: los dígitos de otros alfabetos (no ASCII ni de ancho completo) se cuentan como
-- letras en SQL. El helper de la app los convierte a "0". No pasa en el texto en español.

-- ---------------------------------------------------------------------------
-- 1. Detección (misma lógica que detectarDatoDeContacto)
-- ---------------------------------------------------------------------------

create function privado.tiene_dato_de_contacto(p_texto text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  normal text;
  limpio text;
  run text;
  nombre text;
begin
  if p_texto is null then
    return false;
  end if;
  -- Textos más largos que 5000 caracteres se tratan como dato de contacto sin analizarlos.
  if length(p_texto) > 5000 then
    return true;
  end if;

  normal := normalize(p_texto, NFKC);

  -- Email, con @ o escrito con palabras.
  if normal ~* '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+'
    or normal ~* '(\yarroba\y|\(at\)|\ypunto[[:space:]]+(com|me|ar|net|org)\y)' then
    return true;
  end if;

  -- Links de mensajería.
  if normal ~* '\y(wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.me|m\.me|fb\.me|signal\.me|instagram\.com|facebook\.com)\y' then
    return true;
  end if;

  -- Montos con $ y números de matrícula, registro o ENARGAS no cuentan como teléfono ni altura.
  limpio := regexp_replace(normal, '\$\s*[0-9][0-9.[:space:]]*', ' ', 'g');
  limpio := regexp_replace(
    limpio,
    '(matr[íi]cul[a-záéíóúñ]*|mat\.?|registro|enargas)[[:space:].:,°º#n]{0,8}[0-9]+',
    ' ',
    'gi'
  );

  -- Teléfonos: secuencias de 8 o más dígitos con separadores comunes, sin fechas, rangos de años ni miles.
  for run in
    select (regexp_matches(limpio, '\+?[0-9(][0-9[:space:]().-]{0,60}[0-9]', 'g'))[1]
  loop
    if length(regexp_replace(run, '[^0-9]', '', 'g')) >= 8
      and run !~ '^[0-9]{1,2}([.[:space:]-])[0-9]{1,2}\1(19|20)[0-9]{2}$'
      and run !~ '^(19|20)[0-9]{2}([[:space:]]*-[[:space:]]*|[[:space:]]+)(19|20)[0-9]{2}$'
      and run !~ '^[0-9]{1,3}(\.[0-9]{3})+$' then
      if left(run, 1) = '+' then
        return true;
      end if;
      if exists (
        select 1
        from unnest(regexp_split_to_array(run, '[[:space:].()+-]+')) as grupo
        where length(grupo) >= 2
      ) then
        return true;
      end if;
    end if;
  end loop;

  -- Dirección: calle o avenida con altura de 3 a 5 dígitos.
  if limpio ~* '\y(calle|av(\.|enida)?|pasaje|pje\.?|bv\.?|boulevard|diagonal|diag\.?)[[:space:]]+(?:[a-zA-ZÁÉÍÓÚÑÜáéíóúñü.0-9]+[[:space:]]+){0,3}?(?:n[°º.]?[[:space:]]*)?[0-9]{3,5}\y' then
    return true;
  end if;

  -- Dirección: nombre propio (mayúscula inicial) seguido de 4 o 5 dígitos. Un año o una unidad no cuenta.
  for nombre in
    select (regexp_matches(
      limpio,
      '\y[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[[:space:]]+(?:de|del|y|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+))?[[:space:]]+(?:n[°º.]?[[:space:]]*)?([0-9]{4,5})\y(?![[:space:]]*(?:[vV]|[vV][oO][lL][tT][sS]?|[mM][mM]|[cC][mM]|[mM]2|[mM]|[mM][tT][sS]?|[mM][eE][tT][rR][oO][sS]?|[kK][gG][sS]?|[kK][gG]|[lL][tT][sS]?|[lL][iI][tT][rR][oO][sS]?|[lL]|[wW]|[kK][wW]|[aA][mM][pP]|[hH][sS]|[hH][oO][rR][aA][sS]?|[mM][lL]|[pP][eE][sS][oO][sS]|[uU][sS][dD])\y)',
      'g'
    ))[1]
  loop
    if nombre !~ '^(19|20)[0-9]{2}$' then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

revoke execute on function privado.tiene_dato_de_contacto(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Trigger por tabla: revisa solo las columnas que llegan o cambian
-- ---------------------------------------------------------------------------

create function privado.validar_contenido_publico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  columna text;
begin
  foreach columna in array tg_argv loop
    if tg_op = 'INSERT' or to_jsonb(new) ->> columna is distinct from to_jsonb(old) ->> columna then
      if privado.tiene_dato_de_contacto(to_jsonb(new) ->> columna) then
        raise exception 'No pongas teléfonos, emails ni direcciones: el contacto es por WhatsApp desde la app.'
          using errcode = 'check_violation';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function privado.validar_contenido_publico() from public, anon, authenticated;

create trigger perfiles_profesionales_contenido_publico
before insert or update on public.perfiles_profesionales
for each row execute function privado.validar_contenido_publico('especialidades', 'descripcion', 'disponibilidad');

create trigger trabajos_contenido_publico
before insert or update on public.trabajos
for each row execute function privado.validar_contenido_publico('titulo', 'descripcion');

create trigger postulaciones_contenido_publico
before insert or update on public.postulaciones
for each row execute function privado.validar_contenido_publico('mensaje');

create trigger usuarios_contenido_publico
before insert or update on public.usuarios
for each row execute function privado.validar_contenido_publico('nombre', 'apellido');

-- ---------------------------------------------------------------------------
-- 3. Reseñas usan la misma función (una sola implementación)
-- ---------------------------------------------------------------------------

create or replace function privado.resenas_validar_texto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if privado.tiene_dato_de_contacto(new.texto) then
    raise exception 'No incluyas números de teléfono ni correos electrónicos en el comentario.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
