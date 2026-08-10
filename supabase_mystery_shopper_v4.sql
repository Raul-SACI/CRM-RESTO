-- ============================================================================
-- SUPERVISIONES v4 — estética y calidad separadas para comida y bebida
-- Ejecutar en el Editor SQL de Supabase DESPUÉS de supabase_mystery_shopper_v3.sql
-- Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- Las columnas existentes pasan a representar la COMIDA:
--   rating_aesthetics = estética de la comida
--   rating_food       = calidad de la comida
-- Y se agregan las de la BEBIDA:
ALTER TABLE public.mystery_reports
  ADD COLUMN IF NOT EXISTS rating_aesthetics_drink INTEGER
    CHECK (rating_aesthetics_drink BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_food_drink INTEGER
    CHECK (rating_food_drink BETWEEN 1 AND 5);
