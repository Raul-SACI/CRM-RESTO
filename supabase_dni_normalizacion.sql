-- ============================================================================
-- NORMALIZACIÓN DE DNI (evitar clientes duplicados con el mismo documento)
-- Ejecutar en el Editor SQL de Supabase.
-- ============================================================================

-- 1) Función para chequear si un DNI ya existe, comparando SOLO por números
--    (ignora puntos, espacios, prefijos como "DNI:"). SECURITY DEFINER para
--    que la pueda usar el formulario de registro aunque el usuario no esté
--    logueado todavía.
CREATE OR REPLACE FUNCTION public.dni_existe(p_dni TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE regexp_replace(coalesce(dni, ''), '\D', '', 'g') = regexp_replace(coalesce(p_dni, ''), '\D', '', 'g')
      AND regexp_replace(coalesce(p_dni, ''), '\D', '', 'g') <> ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2) LIMPIEZA DE LOS DNI QUE YA ESTÁN CARGADOS
--    Correr en este orden. El paso 2A solo MUESTRA; no cambia nada.
-- ============================================================================

-- 2A) VER los duplicados reales (mismo número, distinto formato/cuenta).
--     Revisá esta lista y decidí con cuál cuenta te quedás para cada persona.
--     (Estos NO se tocan automáticamente para no perder datos.)
SELECT
  regexp_replace(dni, '\D', '', 'g') AS dni_normalizado,
  count(*)                            AS cuentas,
  array_agg(email)                    AS emails,
  array_agg(id)                       AS ids
FROM public.profiles
WHERE dni IS NOT NULL
GROUP BY 1
HAVING count(*) > 1
ORDER BY cuentas DESC;

-- 2B) NORMALIZAR (dejar solo números) los DNI que NO generan conflicto,
--     es decir, los que son únicos una vez normalizados. Los duplicados del
--     paso 2A quedan intactos hasta que los unifiques a mano.
UPDATE public.profiles p
SET dni = regexp_replace(p.dni, '\D', '', 'g')
WHERE p.dni IS NOT NULL
  AND p.dni <> regexp_replace(p.dni, '\D', '', 'g')
  AND regexp_replace(p.dni, '\D', '', 'g') IN (
    SELECT regexp_replace(dni, '\D', '', 'g')
    FROM public.profiles
    WHERE dni IS NOT NULL
    GROUP BY 1
    HAVING count(*) = 1
  );

-- 2C) (Opcional) Después de unificar a mano los duplicados del paso 2A,
--     podés volver a correr el 2B para normalizar los que hayan quedado.
