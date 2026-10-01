-- ============================================================================
-- ORDEN PERSONALIZADO DE PREMIOS
-- Permite que el admin ordene los premios y que los clientes los vean en ese
-- mismo orden. Ejecutar en el Editor SQL de Supabase. Es idempotente.
-- ============================================================================

-- 1) Columna de orden.
ALTER TABLE public.catalogo_premios
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 2) Inicializar el orden de los premios existentes (los que estén en null),
--    respetando el orden actual (por costo de puntos). Excluye las filas
--    internas de configuración de diseño.
WITH ordenados AS (
  SELECT id, (row_number() OVER (ORDER BY points_cost ASC, created_at ASC) - 1) AS rn
  FROM public.catalogo_premios
  WHERE title NOT IN ('__DESIGN_SETTINGS__', '__DESIGN_SETTINGS_BACKUP__')
)
UPDATE public.catalogo_premios p
SET sort_order = o.rn
FROM ordenados o
WHERE p.id = o.id AND p.sort_order IS NULL;
