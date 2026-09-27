-- ============================================================================
-- BÚSQUEDA DE CLIENTE POR DNI IGNORANDO EL FORMATO (para la Caja)
-- Encuentra al cliente comparando SOLO los números del DNI, así da igual si
-- quedó guardado con puntos/espacios o el cajero lo escribe distinto.
-- Ejecutar en el Editor SQL de Supabase. Es idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.buscar_cliente_por_dni(p_dni TEXT)
RETURNS SETOF public.profiles AS $$
BEGIN
  -- Solo el staff (cajeros/admin) puede buscar clientes.
  IF NOT public.check_is_staff() THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.profiles
    WHERE regexp_replace(coalesce(dni, ''), '\D', '', 'g') = regexp_replace(coalesce(p_dni, ''), '\D', '', 'g')
      AND regexp_replace(coalesce(p_dni, ''), '\D', '', 'g') <> ''
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
