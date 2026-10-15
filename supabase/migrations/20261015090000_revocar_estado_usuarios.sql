-- LAB-50 · Defensa en profundidad: el estado de la cuenta lo cambian solo las funciones security definer.
--
-- Hasta ahora la única barrera contra un update directo de usuarios.estado desde la API era el trigger
-- usuarios_proteger_columnas (LAB-32). Quitamos el privilegio de columna: suspender_cuenta_admin y
-- reactivar_cuenta_admin corren como dueño de la función y siguen pudiendo escribirlo. El borrado de cuenta
-- usa auth.admin.deleteUser y no toca esta columna.

revoke update (estado) on public.usuarios from authenticated;
